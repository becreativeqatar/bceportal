import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { updateCommentSchema } from '@/lib/validations/tasks';
import { isTaskAccessible, canManageBoard, getBoardIdForTask } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';

// PUT /api/tasks/[id]/comments/[commentId] - Update comment (author only)
async function updateCommentHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId, commentId } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(taskId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify comment exists and belongs to task
  const existingComment = await prisma.taskComment.findUnique({
    where: { id: commentId },
  });

  if (!existingComment || existingComment.taskId !== taskId) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  // Only author can update their comment
  if (existingComment.authorId !== session.user.id) {
    return NextResponse.json(
      { error: 'Only the comment author can edit it' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const validation = updateCommentSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { content } = validation.data;

  const comment = await prisma.taskComment.update({
    where: { id: commentId },
    data: { content },
    include: {
      author: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  await logAction(session.user.id, ActivityActions.TASK_COMMENT_UPDATED, 'Task', taskId, {
    commentId: comment.id,
  });

  return NextResponse.json(comment);
}

// DELETE /api/tasks/[id]/comments/[commentId] - Delete comment (author or board admin)
async function deleteCommentHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId, commentId } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(taskId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify comment exists and belongs to task
  const existingComment = await prisma.taskComment.findUnique({
    where: { id: commentId },
  });

  if (!existingComment || existingComment.taskId !== taskId) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  // Check if user can delete (author or board admin)
  const isAuthor = existingComment.authorId === session.user.id;

  if (!isAuthor) {
    const boardId = await getBoardIdForTask(taskId);
    if (!boardId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isManager = await canManageBoard(boardId, session.user.id);
    if (!isManager) {
      return NextResponse.json(
        { error: 'Only the comment author or board admins can delete comments' },
        { status: 403 }
      );
    }
  }

  await prisma.taskComment.delete({
    where: { id: commentId },
  });

  await logAction(session.user.id, ActivityActions.TASK_COMMENT_DELETED, 'Task', taskId, {
    commentId,
  });

  return NextResponse.json({ message: 'Comment deleted successfully' });
}

export const PUT = withErrorHandler(updateCommentHandler, { requireAuth: true, rateLimit: true });
export const DELETE = withErrorHandler(deleteCommentHandler, { requireAuth: true, rateLimit: true });
