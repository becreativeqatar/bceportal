import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { createChecklistItemSchema, reorderChecklistSchema } from '@/lib/validations/tasks';
import { isTaskAccessible } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordChecklistUpdated } from '@/lib/task-history';

// GET /api/tasks/[id]/checklist - Get checklist items
async function getChecklistHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(taskId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const items = await prisma.checklistItem.findMany({
    where: { taskId },
    orderBy: { position: 'asc' },
    include: {
      completer: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ items });
}

// POST /api/tasks/[id]/checklist - Add checklist item
async function addChecklistItemHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(taskId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = createChecklistItemSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { title, position } = validation.data;

  // Get position if not specified
  let itemPosition = position;
  if (itemPosition === undefined) {
    const maxPosition = await prisma.checklistItem.aggregate({
      where: { taskId },
      _max: { position: true },
    });
    itemPosition = (maxPosition._max.position ?? -1) + 1;
  }

  const item = await prisma.checklistItem.create({
    data: {
      taskId,
      title,
      position: itemPosition,
    },
    include: {
      completer: {
        select: { id: true, name: true },
      },
    },
  });

  await Promise.all([
    logAction(session.user.id, ActivityActions.TASK_CHECKLIST_ITEM_ADDED, 'Task', taskId, {
      itemTitle: title,
    }),
    recordChecklistUpdated(taskId, session.user.id, 'added', title),
  ]);

  return NextResponse.json(item, { status: 201 });
}

// PUT /api/tasks/[id]/checklist - Reorder checklist items
async function reorderChecklistHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(taskId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = reorderChecklistSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { itemIds } = validation.data;

  // Verify all items belong to this task
  const items = await prisma.checklistItem.findMany({
    where: { id: { in: itemIds }, taskId },
    select: { id: true },
  });

  if (items.length !== itemIds.length) {
    return NextResponse.json(
      { error: 'Some items do not belong to this task' },
      { status: 400 }
    );
  }

  // Update positions in a transaction
  await prisma.$transaction(
    itemIds.map((itemId, index) =>
      prisma.checklistItem.update({
        where: { id: itemId },
        data: { position: index },
      })
    )
  );

  // Return updated items
  const updatedItems = await prisma.checklistItem.findMany({
    where: { taskId },
    orderBy: { position: 'asc' },
    include: {
      completer: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ items: updatedItems });
}

export const GET = withErrorHandler(getChecklistHandler, { requireAuth: true, rateLimit: true });
export const POST = withErrorHandler(addChecklistItemHandler, { requireAuth: true, rateLimit: true });
export const PUT = withErrorHandler(reorderChecklistHandler, { requireAuth: true, rateLimit: true });
