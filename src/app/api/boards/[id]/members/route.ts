import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { addBoardMemberSchema } from '@/lib/validations/tasks';
import { canAccessBoard, canManageBoard, getBoardMembers } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { BoardMemberRole } from '@prisma/client';

// GET /api/boards/[id]/members - List board members
async function getMembersHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: boardId } = await params;

  // Check access
  const hasAccess = await canAccessBoard(boardId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const members = await getBoardMembers(boardId);

  return NextResponse.json({ members });
}

// POST /api/boards/[id]/members - Add member to board
async function addMemberHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: boardId } = await params;

  // Check management permission
  const canManage = await canManageBoard(boardId, session.user.id);
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const validation = addBoardMemberSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { userId, role } = validation.data;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check if user is already the owner
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });

  if (board?.ownerId === userId) {
    return NextResponse.json(
      { error: 'User is already the owner of this board' },
      { status: 400 }
    );
  }

  // Check if already a member
  const existingMember = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId },
    },
  });

  if (existingMember) {
    return NextResponse.json(
      { error: 'User is already a member of this board' },
      { status: 400 }
    );
  }

  // Cannot add OWNER role - only ADMIN or MEMBER
  const memberRole = role === BoardMemberRole.OWNER ? BoardMemberRole.ADMIN : role;

  const member = await prisma.boardMember.create({
    data: {
      boardId,
      userId,
      role: memberRole,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  await logAction(
    session.user.id,
    ActivityActions.BOARD_MEMBER_ADDED,
    'Board',
    boardId,
    { userId, userName: user.name, role: memberRole }
  );

  return NextResponse.json(member, { status: 201 });
}

export const GET = withErrorHandler(getMembersHandler, { requireAuth: true, rateLimit: true });
export const POST = withErrorHandler(addMemberHandler, { requireAuth: true, rateLimit: true });
