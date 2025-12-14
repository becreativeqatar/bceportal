import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { isTaskAccessible, canManageBoard, getBoardIdForTask } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordAttachmentRemoved } from '@/lib/task-history';
import { sbSignedUrl, sbRemove } from '@/lib/storage/supabase';

// GET /api/tasks/[id]/attachments/[attachmentId] - Get signed download URL
async function getAttachmentHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId, attachmentId } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(taskId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify attachment exists and belongs to task
  const attachment = await prisma.taskAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment || attachment.taskId !== taskId) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  // Get signed URL (valid for 1 hour)
  const signedUrl = await sbSignedUrl(attachment.storagePath, 3600);

  return NextResponse.json({
    ...attachment,
    downloadUrl: signedUrl,
  });
}

// DELETE /api/tasks/[id]/attachments/[attachmentId] - Delete attachment
async function deleteAttachmentHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId, attachmentId } = await params;

  // Check access
  const hasAccess = await isTaskAccessible(taskId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Verify attachment exists and belongs to task
  const attachment = await prisma.taskAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment || attachment.taskId !== taskId) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  // Check if user can delete (uploader or board admin)
  const isUploader = attachment.uploadedById === session.user.id;

  if (!isUploader) {
    const boardId = await getBoardIdForTask(taskId);
    if (!boardId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isManager = await canManageBoard(boardId, session.user.id);
    if (!isManager) {
      return NextResponse.json(
        { error: 'Only the uploader or board admins can delete attachments' },
        { status: 403 }
      );
    }
  }

  // Delete from storage
  try {
    await sbRemove(attachment.storagePath);
  } catch (error) {
    console.error('Failed to delete file from storage:', error);
    // Continue with database deletion even if storage deletion fails
  }

  // Delete from database
  await prisma.taskAttachment.delete({
    where: { id: attachmentId },
  });

  await Promise.all([
    logAction(session.user.id, ActivityActions.TASK_ATTACHMENT_DELETED, 'Task', taskId, {
      attachmentId,
      fileName: attachment.fileName,
    }),
    recordAttachmentRemoved(taskId, session.user.id, attachmentId, attachment.fileName),
  ]);

  return NextResponse.json({ message: 'Attachment deleted successfully' });
}

export const GET = withErrorHandler(getAttachmentHandler, { requireAuth: true, rateLimit: true });
export const DELETE = withErrorHandler(deleteAttachmentHandler, { requireAuth: true, rateLimit: true });
