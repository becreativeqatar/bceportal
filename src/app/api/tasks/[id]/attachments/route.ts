import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { isTaskAccessible } from '@/lib/board-access';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordAttachmentAdded } from '@/lib/task-history';
import { sbUpload } from '@/lib/storage/supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

// GET /api/tasks/[id]/attachments - List attachments
async function getAttachmentsHandler(
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

  const attachments = await prisma.taskAttachment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ attachments });
}

// POST /api/tasks/[id]/attachments - Upload attachment
async function uploadAttachmentHandler(
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

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large (max 10MB)' },
      { status: 400 }
    );
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'File type not allowed' },
      { status: 400 }
    );
  }

  // Generate storage path
  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `task-attachments/${taskId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  // Upload to Supabase
  const bytes = Buffer.from(await file.arrayBuffer());
  await sbUpload({
    path: storagePath,
    bytes,
    contentType: file.type,
  });

  // Create database record
  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storagePath,
      uploadedById: session.user.id,
    },
    include: {
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
  });

  await Promise.all([
    logAction(session.user.id, ActivityActions.TASK_ATTACHMENT_ADDED, 'Task', taskId, {
      attachmentId: attachment.id,
      fileName: file.name,
    }),
    recordAttachmentAdded(taskId, session.user.id, attachment.id, file.name),
  ]);

  return NextResponse.json(attachment, { status: 201 });
}

export const GET = withErrorHandler(getAttachmentsHandler, { requireAuth: true, rateLimit: true });
export const POST = withErrorHandler(uploadAttachmentHandler, { requireAuth: true, rateLimit: true });
