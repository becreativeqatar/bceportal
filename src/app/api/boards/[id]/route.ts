import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { updateBoardSchema } from '@/lib/validations/tasks';
import { canAccessBoard, canManageBoard, isBoardOwner } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { BoardMemberRole } from '@prisma/client';

// GET /api/boards/[id] - Get board details
async function getBoardHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Check access
  const hasAccess = await canAccessBoard(id, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
      columns: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: {
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
              _count: {
                select: {
                  checklist: true,
                  comments: true,
                  attachments: true,
                },
              },
            },
          },
        },
      },
      labels: {
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Determine user's role
  let userRole: BoardMemberRole = BoardMemberRole.MEMBER;
  if (board.ownerId === session.user.id) {
    userRole = BoardMemberRole.OWNER;
  } else {
    const membership = board.members.find((m) => m.userId === session.user.id);
    if (membership) {
      userRole = membership.role;
    }
  }

  // Add checklist progress to tasks
  const columnsWithProgress = await Promise.all(
    board.columns.map(async (column) => {
      const tasksWithProgress = await Promise.all(
        column.tasks.map(async (task) => {
          const checklistItems = await prisma.checklistItem.findMany({
            where: { taskId: task.id },
            select: { isCompleted: true },
          });
          const completedCount = checklistItems.filter((item) => item.isCompleted).length;
          return {
            ...task,
            checklistProgress: {
              completed: completedCount,
              total: checklistItems.length,
            },
          };
        })
      );
      return {
        ...column,
        tasks: tasksWithProgress,
      };
    })
  );

  return NextResponse.json({
    ...board,
    columns: columnsWithProgress,
    userRole,
  });
}

// PUT /api/boards/[id] - Update board
async function updateBoardHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Check management permission
  const canManage = await canManageBoard(id, session.user.id);
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const validation = updateBoardSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const data = validation.data;

  const board = await prisma.board.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  const action = data.isArchived !== undefined
    ? (data.isArchived ? ActivityActions.BOARD_ARCHIVED : ActivityActions.BOARD_RESTORED)
    : ActivityActions.BOARD_UPDATED;

  await logAction(
    session.user.id,
    action,
    'Board',
    board.id,
    { title: board.title, isArchived: board.isArchived }
  );

  return NextResponse.json(board);
}

// DELETE /api/boards/[id] - Delete board (owner only)
async function deleteBoardHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Only owner can delete
  const isOwner = await isBoardOwner(id, session.user.id);
  if (!isOwner) {
    return NextResponse.json({ error: 'Only the board owner can delete it' }, { status: 403 });
  }

  const board = await prisma.board.findUnique({
    where: { id },
    select: { title: true },
  });

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  await prisma.board.delete({
    where: { id },
  });

  await logAction(
    session.user.id,
    ActivityActions.BOARD_DELETED,
    'Board',
    id,
    { title: board.title }
  );

  return NextResponse.json({ message: 'Board deleted successfully' });
}

export const GET = withErrorHandler(getBoardHandler, { requireAuth: true, rateLimit: true });
export const PUT = withErrorHandler(updateBoardHandler, { requireAuth: true, rateLimit: true });
export const DELETE = withErrorHandler(deleteBoardHandler, { requireAuth: true, rateLimit: true });
