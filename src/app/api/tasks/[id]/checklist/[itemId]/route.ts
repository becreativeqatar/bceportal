import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { updateChecklistItemSchema } from '@/lib/validations/tasks';
import { isTaskAccessible } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordChecklistUpdated } from '@/lib/task-history';

// PUT /api/tasks/[id]/checklist/[itemId] - Update checklist item
async function updateChecklistItemHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId, itemId } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(taskId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify item belongs to task
  const existingItem = await prisma.checklistItem.findUnique({
    where: { id: itemId },
  });

  if (!existingItem || existingItem.taskId !== taskId) {
    return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateChecklistItemSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { title, isCompleted } = validation.data;

  // Build update data
  const updateData: any = {};

  if (title !== undefined) {
    updateData.title = title;
  }

  if (isCompleted !== undefined) {
    updateData.isCompleted = isCompleted;
    if (isCompleted && !existingItem.isCompleted) {
      // Mark as completed
      updateData.completedAt = new Date();
      updateData.completedBy = session.user.id;
    } else if (!isCompleted && existingItem.isCompleted) {
      // Mark as not completed
      updateData.completedAt = null;
      updateData.completedBy = null;
    }
  }

  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: updateData,
    include: {
      completer: {
        select: { id: true, name: true },
      },
    },
  });

  // Log completion change
  if (isCompleted !== undefined && isCompleted !== existingItem.isCompleted) {
    const action = isCompleted ? 'completed' : 'uncompleted';
    await Promise.all([
      logAction(session.user.id, ActivityActions.TASK_CHECKLIST_ITEM_COMPLETED, 'Task', taskId, {
        itemTitle: item.title,
        completed: isCompleted,
      }),
      recordChecklistUpdated(taskId, session.user.id, action, item.title),
    ]);
  }

  return NextResponse.json(item);
}

// DELETE /api/tasks/[id]/checklist/[itemId] - Delete checklist item
async function deleteChecklistItemHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId, itemId } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(taskId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify item belongs to task
  const existingItem = await prisma.checklistItem.findUnique({
    where: { id: itemId },
  });

  if (!existingItem || existingItem.taskId !== taskId) {
    return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
  }

  await prisma.checklistItem.delete({
    where: { id: itemId },
  });

  // Reorder remaining items
  const remainingItems = await prisma.checklistItem.findMany({
    where: { taskId },
    orderBy: { position: 'asc' },
  });

  await prisma.$transaction(
    remainingItems.map((item, index) =>
      prisma.checklistItem.update({
        where: { id: item.id },
        data: { position: index },
      })
    )
  );

  await Promise.all([
    logAction(session.user.id, ActivityActions.TASK_CHECKLIST_ITEM_DELETED, 'Task', taskId, {
      itemTitle: existingItem.title,
    }),
    recordChecklistUpdated(taskId, session.user.id, 'removed', existingItem.title),
  ]);

  return NextResponse.json({ message: 'Checklist item deleted successfully' });
}

export const PUT = withErrorHandler(updateChecklistItemHandler, { requireAuth: true, rateLimit: true });
export const DELETE = withErrorHandler(deleteChecklistItemHandler, { requireAuth: true, rateLimit: true });
