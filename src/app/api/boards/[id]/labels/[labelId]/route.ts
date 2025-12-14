import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { updateLabelSchema } from '@/lib/validations/tasks';
import { canManageBoard } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';

// PUT /api/boards/[id]/labels/[labelId] - Update label
async function updateLabelHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: boardId, labelId } = await params;

  // Check management permission
  const canManage = await canManageBoard(boardId, session.user.id);
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify label belongs to board
  const existingLabel = await prisma.taskLabel.findUnique({
    where: { id: labelId },
  });

  if (!existingLabel || existingLabel.boardId !== boardId) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateLabelSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { name, color } = validation.data;

  // Check if new name conflicts with existing label
  if (name && name !== existingLabel.name) {
    const conflictingLabel = await prisma.taskLabel.findUnique({
      where: {
        boardId_name: { boardId, name },
      },
    });

    if (conflictingLabel) {
      return NextResponse.json(
        { error: 'A label with this name already exists in this board' },
        { status: 400 }
      );
    }
  }

  const label = await prisma.taskLabel.update({
    where: { id: labelId },
    data: {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
    },
  });

  await logAction(
    session.user.id,
    ActivityActions.TASK_LABEL_UPDATED,
    'TaskLabel',
    labelId,
    { boardId, name: label.name, color: label.color }
  );

  return NextResponse.json(label);
}

// DELETE /api/boards/[id]/labels/[labelId] - Delete label
async function deleteLabelHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: boardId, labelId } = await params;

  // Check management permission
  const canManage = await canManageBoard(boardId, session.user.id);
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify label belongs to board
  const existingLabel = await prisma.taskLabel.findUnique({
    where: { id: labelId },
  });

  if (!existingLabel || existingLabel.boardId !== boardId) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  // Delete the label (task-label assignments will be cascade deleted)
  await prisma.taskLabel.delete({
    where: { id: labelId },
  });

  await logAction(
    session.user.id,
    ActivityActions.TASK_LABEL_DELETED,
    'TaskLabel',
    labelId,
    { boardId, name: existingLabel.name }
  );

  return NextResponse.json({ message: 'Label deleted successfully' });
}

export const PUT = withErrorHandler(updateLabelHandler, { requireAuth: true, rateLimit: true });
export const DELETE = withErrorHandler(deleteLabelHandler, { requireAuth: true, rateLimit: true });
