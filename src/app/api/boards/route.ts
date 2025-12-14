import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { createBoardSchema, boardQuerySchema } from '@/lib/validations/tasks';
import { logAction, ActivityActions } from '@/lib/activity';
import { BoardMemberRole } from '@prisma/client';

// GET /api/boards - List all boards the user has access to
async function getBoardsHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const validation = boardQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { includeArchived } = validation.data;

  // Get boards where user is owner
  const ownedBoards = await prisma.board.findMany({
    where: {
      ownerId: session.user.id,
      ...(includeArchived ? {} : { isArchived: false }),
    },
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
      },
      _count: {
        select: {
          columns: true,
          members: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Get boards where user is a member (but not owner - to avoid duplicates)
  const memberBoards = await prisma.board.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
      ownerId: { not: session.user.id }, // Exclude boards already in ownedBoards
      ...(includeArchived ? {} : { isArchived: false }),
    },
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
      },
      _count: {
        select: {
          columns: true,
          members: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Combine and format the results
  const boards = [
    ...ownedBoards.map((board) => ({
      ...board,
      role: BoardMemberRole.OWNER,
      memberCount: board._count.members + 1, // Include owner
      columnCount: board._count.columns,
    })),
    ...memberBoards.map((board) => {
      // Find the current user's role in members
      const currentUserMember = board.members.find(m => m.user.id === session.user.id);
      return {
        ...board,
        role: currentUserMember?.role || BoardMemberRole.MEMBER,
        memberCount: board._count.members + 1, // Include owner
        columnCount: board._count.columns,
      };
    }),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({ boards });
}

// POST /api/boards - Create a new board
async function createBoardHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validation = createBoardSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { title, description } = validation.data;

  // Create board with default columns
  const board = await prisma.board.create({
    data: {
      title,
      description,
      ownerId: session.user.id,
      columns: {
        create: [
          { title: 'To Do', position: 0 },
          { title: 'In Progress', position: 1 },
          { title: 'Done', position: 2 },
        ],
      },
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      columns: {
        orderBy: { position: 'asc' },
      },
    },
  });

  await logAction(
    session.user.id,
    ActivityActions.BOARD_CREATED,
    'Board',
    board.id,
    { title: board.title }
  );

  return NextResponse.json(board, { status: 201 });
}

export const GET = withErrorHandler(getBoardsHandler, { requireAuth: true, rateLimit: true });
export const POST = withErrorHandler(createBoardHandler, { requireAuth: true, rateLimit: true });
