import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { setTaskLabelsSchema } from '@/lib/validations/tasks';
import { isTaskAccessible, getBoardIdForTask } from '@/lib/board-access';

// PUT /api/tasks/[id]/labels - Set task labels (replace all)
async function setLabelsHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(id, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = setTaskLabelsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { labelIds } = validation.data;

  // Get board ID
  const boardId = await getBoardIdForTask(id);
  if (!boardId) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Validate all labels belong to this board
  if (labelIds.length > 0) {
    const labels = await prisma.taskLabel.findMany({
      where: { id: { in: labelIds }, boardId },
      select: { id: true },
    });

    if (labels.length !== labelIds.length) {
      return NextResponse.json(
        { error: 'Some labels do not belong to this board' },
        { status: 400 }
      );
    }
  }

  // Get current labels
  const currentLabels = await prisma.taskLabelAssignment.findMany({
    where: { taskId: id },
    select: { labelId: true },
  });

  const currentLabelIds = new Set(currentLabels.map((l) => l.labelId));
  const newLabelIds = new Set(labelIds);

  // Determine added and removed
  const addedIds = labelIds.filter((labelId) => !currentLabelIds.has(labelId));
  const removedIds = currentLabels
    .filter((l) => !newLabelIds.has(l.labelId))
    .map((l) => l.labelId);

  // Update labels in a transaction
  await prisma.$transaction(async (tx) => {
    // Remove old labels not in new list
    if (removedIds.length > 0) {
      await tx.taskLabelAssignment.deleteMany({
        where: {
          taskId: id,
          labelId: { in: removedIds },
        },
      });
    }

    // Add new labels
    if (addedIds.length > 0) {
      await tx.taskLabelAssignment.createMany({
        data: addedIds.map((labelId) => ({
          taskId: id,
          labelId,
        })),
      });
    }
  });

  // Fetch and return updated task
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      labels: {
        include: {
          label: true,
        },
      },
    },
  });

  return NextResponse.json(task);
}

export const PUT = withErrorHandler(setLabelsHandler, { requireAuth: true, rateLimit: true });
