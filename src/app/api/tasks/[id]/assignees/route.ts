import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { assignTaskSchema } from '@/lib/validations/tasks';
import { isTaskAccessible, getBoardIdForTask, getBoardMembers } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordTaskAssigned, recordTaskUnassigned } from '@/lib/task-history';

// PUT /api/tasks/[id]/assignees - Set task assignees (replace all)
async function setAssigneesHandler(
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
  const validation = assignTaskSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { assigneeIds } = validation.data;

  // Get board ID and members
  const boardId = await getBoardIdForTask(id);
  if (!boardId) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Validate all assignees are board members
  if (assigneeIds.length > 0) {
    const members = await getBoardMembers(boardId);
    const validUserIds = new Set(members.map((m) => m.userId));

    for (const userId of assigneeIds) {
      if (!validUserIds.has(userId)) {
        return NextResponse.json(
          { error: `User ${userId} is not a member of this board` },
          { status: 400 }
        );
      }
    }
  }

  // Get current assignees for change tracking
  const currentAssignees = await prisma.taskAssignee.findMany({
    where: { taskId: id },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  const currentAssigneeIds = new Set(currentAssignees.map((a) => a.userId));
  const newAssigneeIds = new Set(assigneeIds);

  // Determine added and removed
  const addedIds = assigneeIds.filter((userId) => !currentAssigneeIds.has(userId));
  const removedIds = currentAssignees
    .filter((a) => !newAssigneeIds.has(a.userId))
    .map((a) => a.userId);

  // Update assignees in a transaction
  await prisma.$transaction(async (tx) => {
    // Remove old assignees not in new list
    if (removedIds.length > 0) {
      await tx.taskAssignee.deleteMany({
        where: {
          taskId: id,
          userId: { in: removedIds },
        },
      });
    }

    // Add new assignees
    if (addedIds.length > 0) {
      await tx.taskAssignee.createMany({
        data: addedIds.map((userId) => ({
          taskId: id,
          userId,
          assignedBy: session.user.id,
        })),
      });
    }
  });

  // Log changes
  const addedUsers = await prisma.user.findMany({
    where: { id: { in: addedIds } },
    select: { id: true, name: true },
  });

  const removedUsers = currentAssignees.filter((a) => removedIds.includes(a.userId));

  // Log for each added user
  for (const user of addedUsers) {
    await Promise.all([
      logAction(session.user.id, ActivityActions.TASK_ASSIGNED, 'Task', id, {
        boardId,
        assigneeId: user.id,
        assigneeName: user.name,
      }),
      recordTaskAssigned(id, session.user.id, user.id, user.name || undefined),
    ]);
  }

  // Log for each removed user
  for (const assignee of removedUsers) {
    await Promise.all([
      logAction(session.user.id, ActivityActions.TASK_UNASSIGNED, 'Task', id, {
        boardId,
        assigneeId: assignee.userId,
        assigneeName: assignee.user.name,
      }),
      recordTaskUnassigned(id, session.user.id, assignee.userId, assignee.user.name || undefined),
    ]);
  }

  // Fetch and return updated task
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignees: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  });

  return NextResponse.json(task);
}

export const PUT = withErrorHandler(setAssigneesHandler, { requireAuth: true, rateLimit: true });
