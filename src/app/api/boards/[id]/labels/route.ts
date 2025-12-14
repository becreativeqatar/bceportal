import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { createLabelSchema } from '@/lib/validations/tasks';
import { canAccessBoard, canManageBoard } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';

// GET /api/boards/[id]/labels - List board labels
async function getLabelsHandler(
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

  const labels = await prisma.taskLabel.findMany({
    where: { boardId },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  return NextResponse.json({ labels });
}

// POST /api/boards/[id]/labels - Create a new label
async function createLabelHandler(
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
  const validation = createLabelSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { name, color } = validation.data;

  // Check if label name already exists in this board
  const existingLabel = await prisma.taskLabel.findUnique({
    where: {
      boardId_name: { boardId, name },
    },
  });

  if (existingLabel) {
    return NextResponse.json(
      { error: 'A label with this name already exists in this board' },
      { status: 400 }
    );
  }

  const label = await prisma.taskLabel.create({
    data: {
      boardId,
      name,
      color,
    },
  });

  await logAction(
    session.user.id,
    ActivityActions.TASK_LABEL_CREATED,
    'TaskLabel',
    label.id,
    { boardId, name: label.name, color: label.color }
  );

  return NextResponse.json(label, { status: 201 });
}

export const GET = withErrorHandler(getLabelsHandler, { requireAuth: true, rateLimit: true });
export const POST = withErrorHandler(createLabelHandler, { requireAuth: true, rateLimit: true });
