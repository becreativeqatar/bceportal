import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { Role } from '@prisma/client';
import { updateDocumentConfigSchema } from '@/lib/validations/system/document-config';

// GET /api/admin/document-config/[id] - Get single config
async function getDocumentConfigHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  const config = await prisma.documentNumberConfig.findUnique({
    where: { id },
  });

  if (!config) {
    return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
  }

  return NextResponse.json(config);
}

// PUT /api/admin/document-config/[id] - Update config
async function updateDocumentConfigHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  // Check if config exists
  const existingConfig = await prisma.documentNumberConfig.findUnique({
    where: { id },
  });

  if (!existingConfig) {
    return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateDocumentConfigSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const data = validation.data;

  // If code is being changed, check uniqueness within its category
  if (data.code && data.code.toUpperCase() !== existingConfig.code) {
    const duplicateCode = await prisma.documentNumberConfig.findFirst({
      where: {
        code: data.code.toUpperCase(),
        isAssetCategory: existingConfig.isAssetCategory,
        id: { not: id },
      },
    });

    if (duplicateCode) {
      const categoryType = existingConfig.isAssetCategory ? 'asset categories' : 'document types';
      return NextResponse.json({
        error: 'Code already in use',
        details: [{ message: `Code "${data.code}" is already used in ${categoryType} by "${duplicateCode.entityLabel}".` }],
      }, { status: 400 });
    }
  }

  const config = await prisma.documentNumberConfig.update({
    where: { id },
    data: {
      ...data,
      code: data.code ? data.code.toUpperCase() : undefined,
    },
  });

  return NextResponse.json(config);
}

// DELETE /api/admin/document-config/[id] - Delete config
async function deleteDocumentConfigHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { id } = await params;

  const config = await prisma.documentNumberConfig.findUnique({
    where: { id },
  });

  if (!config) {
    return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
  }

  // Prevent deletion of system-required configs
  if (config.isSystemRequired) {
    return NextResponse.json({
      error: 'Cannot delete system configuration',
      details: [{ message: `"${config.entityLabel}" is a required system configuration and cannot be deleted.` }],
    }, { status: 400 });
  }

  await prisma.documentNumberConfig.delete({
    where: { id },
  });

  return NextResponse.json({ message: 'Configuration deleted successfully' });
}

export const GET = withErrorHandler(getDocumentConfigHandler, { requireAuth: true, requireAdmin: true });
export const PUT = withErrorHandler(updateDocumentConfigHandler, { requireAuth: true, requireAdmin: true });
export const DELETE = withErrorHandler(deleteDocumentConfigHandler, { requireAuth: true, requireAdmin: true });
