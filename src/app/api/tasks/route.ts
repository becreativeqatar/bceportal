import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { createTaskSchema, taskQuerySchema } from '@/lib/validations/tasks';
import { canAccessBoard, isColumnInBoard, getUserBoardIds } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordTaskCreated } from '@/lib/task-history';

// GET /api/tasks - Search/filter tasks across accessible boards
async function getTasksHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const validation = taskQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { assigneeId, priority, dueFrom, dueTo, isCompleted, labelIds, q } = validation.data;

  // Get boards user has access to
  const accessibleBoardIds = await getUserBoardIds(session.user.id);

  if (accessibleBoardIds.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  // Build where clause
  const where: any = {
    column: {
      boardId: { in: accessibleBoardIds },
    },
  };

  if (assigneeId) {
    where.assignees = {
      some: { userId: assigneeId },
    };
  }

  if (priority) {
    where.priority = priority;
  }

  if (dueFrom || dueTo) {
    where.dueDate = {};
    if (dueFrom) where.dueDate.gte = new Date(dueFrom);
    if (dueTo) where.dueDate.lte = new Date(dueTo);
  }

  if (isCompleted !== undefined) {
    where.isCompleted = isCompleted;
  }

  if (labelIds) {
    const labelIdArray = labelIds.split(',').filter(Boolean);
    if (labelIdArray.length > 0) {
      where.labels = {
        some: { labelId: { in: labelIdArray } },
      };
    }
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
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
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          checklist: true,
          comments: true,
          attachments: true,
        },
      },
    },
    orderBy: [
      { dueDate: 'asc' },
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 100,
  });

  return NextResponse.json({ tasks });
}

// POST /api/tasks - Create a new task
async function createTaskHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validation = createTaskSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { title, description, columnId, priority, dueDate, assigneeIds, labelIds, position } =
    validation.data;

  // Get board ID from column
  const column = await prisma.taskColumn.findUnique({
    where: { id: columnId },
    select: { boardId: true },
  });

  if (!column) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  }

  // Check access to board
  const hasAccess = await canAccessBoard(column.boardId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validate assignees are board members
  if (assigneeIds && assigneeIds.length > 0) {
    const board = await prisma.board.findUnique({
      where: { id: column.boardId },
      select: { ownerId: true },
    });

    const members = await prisma.boardMember.findMany({
      where: { boardId: column.boardId },
      select: { userId: true },
    });

    const validUserIds = new Set([
      board?.ownerId,
      ...members.map((m) => m.userId),
    ]);

    for (const userId of assigneeIds) {
      if (!validUserIds.has(userId)) {
        return NextResponse.json(
          { error: `User ${userId} is not a member of this board` },
          { status: 400 }
        );
      }
    }
  }

  // Validate labels belong to board
  if (labelIds && labelIds.length > 0) {
    const labels = await prisma.taskLabel.findMany({
      where: { id: { in: labelIds }, boardId: column.boardId },
      select: { id: true },
    });

    if (labels.length !== labelIds.length) {
      return NextResponse.json(
        { error: 'Some labels do not belong to this board' },
        { status: 400 }
      );
    }
  }

  // Get position if not specified
  let taskPosition = position;
  if (taskPosition === undefined) {
    const maxPosition = await prisma.task.aggregate({
      where: { columnId },
      _max: { position: true },
    });
    taskPosition = (maxPosition._max.position ?? -1) + 1;
  }

  // Create task with assignees and labels
  const task = await prisma.task.create({
    data: {
      columnId,
      title,
      description,
      position: taskPosition,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: session.user.id,
      assignees: assigneeIds?.length
        ? {
            create: assigneeIds.map((userId) => ({
              userId,
              assignedBy: session.user.id,
            })),
          }
        : undefined,
      labels: labelIds?.length
        ? {
            create: labelIds.map((labelId) => ({
              labelId,
            })),
          }
        : undefined,
    },
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
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Log activity and history
  await Promise.all([
    logAction(session.user.id, ActivityActions.TASK_CREATED, 'Task', task.id, {
      boardId: column.boardId,
      title: task.title,
    }),
    recordTaskCreated(task.id, session.user.id, {
      title,
      columnId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeIds,
    }),
  ]);

  return NextResponse.json(task, { status: 201 });
}

export const GET = withErrorHandler(getTasksHandler, { requireAuth: true, rateLimit: true });
export const POST = withErrorHandler(createTaskHandler, { requireAuth: true, rateLimit: true });
