import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { moveTaskSchema } from '@/lib/validations/tasks';
import { isTaskAccessible, getBoardIdForTask, isColumnInBoard } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordTaskMoved } from '@/lib/task-history';

// POST /api/tasks/[id]/move - Move task to different column/position
async function moveTaskHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(id, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = moveTaskSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { columnId: targetColumnId, position } = validation.data;

  // Get current task
  const currentTask = await prisma.task.findUnique({
    where: { id },
    include: {
      column: {
        select: { id: true, title: true, boardId: true },
      },
    },
  });

  if (!currentTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const boardId = currentTask.column.boardId;

  // Verify target column belongs to the same board
  const targetColumnInBoard = await isColumnInBoard(targetColumnId, boardId);
  if (!targetColumnInBoard) {
    return NextResponse.json(
      { error: 'Target column does not belong to this board' },
      { status: 400 }
    );
  }

  // Get target column details
  const targetColumn = await prisma.taskColumn.findUnique({
    where: { id: targetColumnId },
    select: { title: true },
  });

  const sourceColumnId = currentTask.columnId;
  const isSameColumn = sourceColumnId === targetColumnId;

  // Update task positions
  await prisma.$transaction(async (tx) => {
    if (isSameColumn) {
      // Reordering within the same column
      const tasks = await tx.task.findMany({
        where: { columnId: sourceColumnId },
        orderBy: { position: 'asc' },
      });

      const currentIndex = tasks.findIndex((t) => t.id === id);
      const newIndex = position;

      if (currentIndex === newIndex) {
        return; // No change needed
      }

      // Remove task from current position
      const reorderedTasks = tasks.filter((t) => t.id !== id);
      // Insert at new position
      reorderedTasks.splice(newIndex, 0, currentTask);

      // Update positions
      for (let i = 0; i < reorderedTasks.length; i++) {
        await tx.task.update({
          where: { id: reorderedTasks[i].id },
          data: { position: i },
        });
      }
    } else {
      // Moving to a different column
      // 1. Remove from source column and reorder
      const sourceTasks = await tx.task.findMany({
        where: { columnId: sourceColumnId, id: { not: id } },
        orderBy: { position: 'asc' },
      });

      for (let i = 0; i < sourceTasks.length; i++) {
        await tx.task.update({
          where: { id: sourceTasks[i].id },
          data: { position: i },
        });
      }

      // 2. Insert into target column at position
      const targetTasks = await tx.task.findMany({
        where: { columnId: targetColumnId },
        orderBy: { position: 'asc' },
      });

      // Shift tasks at and after the insertion point
      for (let i = targetTasks.length - 1; i >= position; i--) {
        await tx.task.update({
          where: { id: targetTasks[i].id },
          data: { position: i + 1 },
        });
      }

      // Move the task
      await tx.task.update({
        where: { id },
        data: {
          columnId: targetColumnId,
          position,
        },
      });
    }
  });

  // Log if moved to different column
  if (!isSameColumn) {
    await Promise.all([
      logAction(session.user.id, ActivityActions.TASK_MOVED, 'Task', id, {
        boardId,
        fromColumn: currentTask.column.title,
        toColumn: targetColumn?.title,
      }),
      recordTaskMoved(
        id,
        session.user.id,
        sourceColumnId,
        targetColumnId,
        currentTask.column.title,
        targetColumn?.title
      ),
    ]);
  }

  // Fetch and return updated task
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      column: {
        select: {
          id: true,
          title: true,
          board: {
            select: { id: true, title: true },
          },
        },
      },
      assignees: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      labels: {
        include: {
          label: true,
        },
      },
    },
  });

  return NextResponse.json(task);
}

export const POST = withErrorHandler(moveTaskHandler, { requireAuth: true, rateLimit: true });
