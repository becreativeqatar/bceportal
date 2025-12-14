import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { updateTaskSchema } from '@/lib/validations/tasks';
import { isTaskAccessible, getBoardIdForTask } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordTaskUpdated, recordTaskCompleted, recordTaskReopened } from '@/lib/task-history';

// GET /api/tasks/[id] - Get task details
async function getTaskHandler(
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
      checklist: {
        orderBy: { position: 'asc' },
        include: {
          completer: {
            select: { id: true, name: true },
          },
        },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      attachments: {
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
      },
      history: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          performedBy: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Calculate checklist progress
  const checklistProgress = {
    completed: task.checklist.filter((item) => item.isCompleted).length,
    total: task.checklist.length,
  };

  return NextResponse.json({
    ...task,
    checklistProgress,
  });
}

// PUT /api/tasks/[id] - Update task
async function updateTaskHandler(
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
  const validation = updateTaskSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Get current task state for change tracking
  const currentTask = await prisma.task.findUnique({
    where: { id },
  });

  if (!currentTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Build update data
  const updateData: any = {};
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];

  if (data.title !== undefined && data.title !== currentTask.title) {
    updateData.title = data.title;
    changes.push({ field: 'title', oldValue: currentTask.title, newValue: data.title });
  }

  if (data.description !== undefined && data.description !== currentTask.description) {
    updateData.description = data.description;
    changes.push({ field: 'description', oldValue: currentTask.description, newValue: data.description });
  }

  if (data.priority !== undefined && data.priority !== currentTask.priority) {
    updateData.priority = data.priority;
    changes.push({ field: 'priority', oldValue: currentTask.priority, newValue: data.priority });
  }

  if (data.dueDate !== undefined) {
    const newDueDate = data.dueDate ? new Date(data.dueDate) : null;
    const oldDueDate = currentTask.dueDate;
    if (newDueDate?.getTime() !== oldDueDate?.getTime()) {
      updateData.dueDate = newDueDate;
      changes.push({ field: 'dueDate', oldValue: oldDueDate, newValue: newDueDate });
    }
  }

  // Handle completion status
  if (data.isCompleted !== undefined && data.isCompleted !== currentTask.isCompleted) {
    updateData.isCompleted = data.isCompleted;
    updateData.completedAt = data.isCompleted ? new Date() : null;
    changes.push({ field: 'isCompleted', oldValue: currentTask.isCompleted, newValue: data.isCompleted });
  }

  // Only update if there are changes
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: 'No changes detected' });
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
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

  // Log activity and history
  const boardId = task.column.board.id;

  if (data.isCompleted !== undefined && data.isCompleted !== currentTask.isCompleted) {
    if (data.isCompleted) {
      await Promise.all([
        logAction(session.user.id, ActivityActions.TASK_COMPLETED, 'Task', id, {
          boardId,
          title: task.title,
        }),
        recordTaskCompleted(id, session.user.id),
      ]);
    } else {
      await Promise.all([
        logAction(session.user.id, ActivityActions.TASK_REOPENED, 'Task', id, {
          boardId,
          title: task.title,
        }),
        recordTaskReopened(id, session.user.id),
      ]);
    }
  } else {
    await Promise.all([
      logAction(session.user.id, ActivityActions.TASK_UPDATED, 'Task', id, {
        boardId,
        changes: changes.map((c) => c.field),
      }),
      recordTaskUpdated(id, session.user.id, changes),
    ]);
  }

  return NextResponse.json(task);
}

// DELETE /api/tasks/[id] - Delete task
async function deleteTaskHandler(
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

  const boardId = await getBoardIdForTask(id);

  const task = await prisma.task.findUnique({
    where: { id },
    select: { title: true, columnId: true },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Delete the task
  await prisma.task.delete({
    where: { id },
  });

  // Reorder remaining tasks in the column
  const remainingTasks = await prisma.task.findMany({
    where: { columnId: task.columnId },
    orderBy: { position: 'asc' },
  });

  await prisma.$transaction(
    remainingTasks.map((t, index) =>
      prisma.task.update({
        where: { id: t.id },
        data: { position: index },
      })
    )
  );

  await logAction(session.user.id, ActivityActions.TASK_DELETED, 'Task', id, {
    boardId,
    title: task.title,
  });

  return NextResponse.json({ message: 'Task deleted successfully' });
}

export const GET = withErrorHandler(getTaskHandler, { requireAuth: true, rateLimit: true });
export const PUT = withErrorHandler(updateTaskHandler, { requireAuth: true, rateLimit: true });
export const DELETE = withErrorHandler(deleteTaskHandler, { requireAuth: true, rateLimit: true });
