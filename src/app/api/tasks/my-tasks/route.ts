import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { myTasksQuerySchema } from '@/lib/validations/tasks';
import { getUserBoardIds } from '@/lib/board-access';

// GET /api/tasks/my-tasks - Get all tasks assigned to current user across all boards
async function getMyTasksHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const validation = myTasksQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { priority, dueFrom, dueTo, isCompleted, boardId, q, p, ps } = validation.data;

  // Get accessible board IDs
  let accessibleBoardIds = await getUserBoardIds(session.user.id);

  // If specific board is requested, filter to just that board (if accessible)
  if (boardId) {
    if (!accessibleBoardIds.includes(boardId)) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    accessibleBoardIds = [boardId];
  }

  if (accessibleBoardIds.length === 0) {
    return NextResponse.json({
      tasks: [],
      pagination: {
        page: p,
        pageSize: ps,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    });
  }

  // Build where clause - only tasks assigned to current user
  const where: any = {
    assignees: {
      some: { userId: session.user.id },
    },
    column: {
      boardId: { in: accessibleBoardIds },
    },
  };

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

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const skip = (p - 1) * ps;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
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
        { isCompleted: 'asc' },
        { dueDate: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: ps,
    }),
    prisma.task.count({ where }),
  ]);

  // Add checklist progress to each task
  const tasksWithProgress = await Promise.all(
    tasks.map(async (task) => {
      const checklistItems = await prisma.checklistItem.findMany({
        where: { taskId: task.id },
        select: { isCompleted: true },
      });
      return {
        ...task,
        checklistProgress: {
          completed: checklistItems.filter((item) => item.isCompleted).length,
          total: checklistItems.length,
        },
      };
    })
  );

  return NextResponse.json({
    tasks: tasksWithProgress,
    pagination: {
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps),
      hasMore: skip + ps < total,
    },
  });
}

export const GET = withErrorHandler(getMyTasksHandler, { requireAuth: true, rateLimit: true });
