import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { updateBoardMemberSchema } from '@/lib/validations/tasks';
import { isBoardOwner, canManageBoard } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { BoardMemberRole } from '@prisma/client';

// PUT /api/boards/[id]/members/[userId] - Update member role (owner only)
async function updateMemberHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: boardId, userId } = await params;

  // Only owner can change roles
  const isOwner = await isBoardOwner(boardId, session.user.id);
  if (!isOwner) {
    return NextResponse.json(
      { error: 'Only the board owner can change member roles' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const validation = updateBoardMemberSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { role } = validation.data;

  // Cannot assign OWNER role
  if (role === BoardMemberRole.OWNER) {
    return NextResponse.json(
      { error: 'Cannot assign OWNER role. Transfer ownership instead.' },
      { status: 400 }
    );
  }

  // Check if member exists
  const existingMember = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId },
    },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  if (!existingMember) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const member = await prisma.boardMember.update({
    where: {
      boardId_userId: { boardId, userId },
    },
    data: { role },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  await logAction(
    session.user.id,
    ActivityActions.BOARD_MEMBER_UPDATED,
    'Board',
    boardId,
    { userId, userName: existingMember.user.name, oldRole: existingMember.role, newRole: role }
  );

  return NextResponse.json(member);
}

// DELETE /api/boards/[id]/members/[userId] - Remove member from board
async function removeMemberHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: boardId, userId } = await params;

  // Check if trying to remove self
  const isSelf = userId === session.user.id;

  // If not self, need management permission
  if (!isSelf) {
    const canManage = await canManageBoard(boardId, session.user.id);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Cannot remove the owner
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });

  if (board?.ownerId === userId) {
    return NextResponse.json(
      { error: 'Cannot remove the board owner' },
      { status: 400 }
    );
  }

  // Check if member exists
  const existingMember = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: { boardId, userId },
    },
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  if (!existingMember) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  await prisma.boardMember.delete({
    where: {
      boardId_userId: { boardId, userId },
    },
  });

  await logAction(
    session.user.id,
    ActivityActions.BOARD_MEMBER_REMOVED,
    'Board',
    boardId,
    { userId, userName: existingMember.user.name }
  );

  return NextResponse.json({ message: 'Member removed successfully' });
}

export const PUT = withErrorHandler(updateMemberHandler, { requireAuth: true, rateLimit: true });
export const DELETE = withErrorHandler(removeMemberHandler, { requireAuth: true, rateLimit: true });
