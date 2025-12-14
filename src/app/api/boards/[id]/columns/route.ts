import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { createColumnSchema, reorderColumnsSchema } from '@/lib/validations/tasks';
import { canAccessBoard, canManageBoard } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';

// GET /api/boards/[id]/columns - List columns with tasks
async function getColumnsHandler(
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

  const columns = await prisma.taskColumn.findMany({
    where: { boardId },
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
  });

  return NextResponse.json({ columns });
}

// POST /api/boards/[id]/columns - Create a new column
async function createColumnHandler(
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
  const validation = createColumnSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { title, position } = validation.data;

  // Get max position if not specified
  let columnPosition = position;
  if (columnPosition === undefined) {
    const maxPosition = await prisma.taskColumn.aggregate({
      where: { boardId },
      _max: { position: true },
    });
    columnPosition = (maxPosition._max.position ?? -1) + 1;
  }

  const column = await prisma.taskColumn.create({
    data: {
      boardId,
      title,
      position: columnPosition,
    },
    include: {
      tasks: true,
    },
  });

  await logAction(
    session.user.id,
    ActivityActions.COLUMN_CREATED,
    'TaskColumn',
    column.id,
    { boardId, title: column.title }
  );

  return NextResponse.json(column, { status: 201 });
}

// PUT /api/boards/[id]/columns - Reorder columns
async function reorderColumnsHandler(
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
  const validation = reorderColumnsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { columnIds } = validation.data;

  // Verify all columns belong to this board
  const columns = await prisma.taskColumn.findMany({
    where: { id: { in: columnIds }, boardId },
    select: { id: true },
  });

  if (columns.length !== columnIds.length) {
    return NextResponse.json(
      { error: 'Some columns do not belong to this board' },
      { status: 400 }
    );
  }

  // Update positions in a transaction
  await prisma.$transaction(
    columnIds.map((columnId, index) =>
      prisma.taskColumn.update({
        where: { id: columnId },
        data: { position: index },
      })
    )
  );

  await logAction(
    session.user.id,
    ActivityActions.COLUMN_REORDERED,
    'Board',
    boardId,
    { columnIds }
  );

  // Return updated columns
  const updatedColumns = await prisma.taskColumn.findMany({
    where: { boardId },
    orderBy: { position: 'asc' },
    include: {
      tasks: {
        orderBy: { position: 'asc' },
      },
    },
  });

  return NextResponse.json({ columns: updatedColumns });
}

export const GET = withErrorHandler(getColumnsHandler, { requireAuth: true, rateLimit: true });
export const POST = withErrorHandler(createColumnHandler, { requireAuth: true, rateLimit: true });
export const PUT = withErrorHandler(reorderColumnsHandler, { requireAuth: true, rateLimit: true });
