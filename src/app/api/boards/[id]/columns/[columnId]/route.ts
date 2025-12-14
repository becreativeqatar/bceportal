import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { updateColumnSchema } from '@/lib/validations/tasks';
import { canManageBoard, isColumnInBoard } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';

// PUT /api/boards/[id]/columns/[columnId] - Update column
async function updateColumnHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: boardId, columnId } = await params;

  // Check management permission
  const canManage = await canManageBoard(boardId, session.user.id);
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify column belongs to board
  const columnInBoard = await isColumnInBoard(columnId, boardId);
  if (!columnInBoard) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateColumnSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { title } = validation.data;

  const column = await prisma.taskColumn.update({
    where: { id: columnId },
    data: {
      ...(title !== undefined && { title }),
    },
    include: {
      tasks: {
        orderBy: { position: 'asc' },
      },
    },
  });

  await logAction(
    session.user.id,
    ActivityActions.COLUMN_UPDATED,
    'TaskColumn',
    columnId,
    { boardId, title: column.title }
  );

  return NextResponse.json(column);
}

// DELETE /api/boards/[id]/columns/[columnId] - Delete column
async function deleteColumnHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: boardId, columnId } = await params;

  // Check management permission
  const canManage = await canManageBoard(boardId, session.user.id);
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify column belongs to board
  const columnInBoard = await isColumnInBoard(columnId, boardId);
  if (!columnInBoard) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  }

  // Get the column and its tasks
  const column = await prisma.taskColumn.findUnique({
    where: { id: columnId },
    include: {
      tasks: { select: { id: true } },
    },
  });

  if (!column) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  }

  // Check if this is the last column
  const columnCount = await prisma.taskColumn.count({
    where: { boardId },
  });

  if (columnCount === 1) {
    return NextResponse.json(
      { error: 'Cannot delete the last column. Create another column first.' },
      { status: 400 }
    );
  }

  // If column has tasks, move them to the first available column
  if (column.tasks.length > 0) {
    const firstColumn = await prisma.taskColumn.findFirst({
      where: {
        boardId,
        id: { not: columnId },
      },
      orderBy: { position: 'asc' },
    });

    if (firstColumn) {
      // Get max position in target column
      const maxPosition = await prisma.task.aggregate({
        where: { columnId: firstColumn.id },
        _max: { position: true },
      });

      // Move all tasks to the first column
      await prisma.$transaction(
        column.tasks.map((task, index) =>
          prisma.task.update({
            where: { id: task.id },
            data: {
              columnId: firstColumn.id,
              position: (maxPosition._max.position ?? -1) + 1 + index,
            },
          })
        )
      );
    }
  }

  // Delete the column
  await prisma.taskColumn.delete({
    where: { id: columnId },
  });

  // Reorder remaining columns
  const remainingColumns = await prisma.taskColumn.findMany({
    where: { boardId },
    orderBy: { position: 'asc' },
  });

  await prisma.$transaction(
    remainingColumns.map((col, index) =>
      prisma.taskColumn.update({
        where: { id: col.id },
        data: { position: index },
      })
    )
  );

  await logAction(
    session.user.id,
    ActivityActions.COLUMN_DELETED,
    'TaskColumn',
    columnId,
    { boardId, title: column.title, tasksMoved: column.tasks.length }
  );

  return NextResponse.json({
    message: 'Column deleted successfully',
    tasksMoved: column.tasks.length,
  });
}

export const PUT = withErrorHandler(updateColumnHandler, { requireAuth: true, rateLimit: true });
export const DELETE = withErrorHandler(deleteColumnHandler, { requireAuth: true, rateLimit: true });
