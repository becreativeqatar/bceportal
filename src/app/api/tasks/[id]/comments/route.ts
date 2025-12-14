import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { createCommentSchema } from '@/lib/validations/tasks';
import { isTaskAccessible } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordCommentAdded } from '@/lib/task-history';

// GET /api/tasks/[id]/comments - Get task comments
async function getCommentsHandler(
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

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return NextResponse.json({ comments });
}

// POST /api/tasks/[id]/comments - Add comment
async function addCommentHandler(
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
  const validation = createCommentSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { content } = validation.data;

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      content,
      authorId: session.user.id,
    },
    include: {
      author: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  await Promise.all([
    logAction(session.user.id, ActivityActions.TASK_COMMENT_ADDED, 'Task', taskId, {
      commentId: comment.id,
    }),
    recordCommentAdded(taskId, session.user.id, comment.id),
  ]);

  return NextResponse.json(comment, { status: 201 });
}

export const GET = withErrorHandler(getCommentsHandler, { requireAuth: true, rateLimit: true });
export const POST = withErrorHandler(addCommentHandler, { requireAuth: true, rateLimit: true });
