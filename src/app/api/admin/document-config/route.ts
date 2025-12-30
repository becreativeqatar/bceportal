import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { Role } from '@prisma/client';
import { createDocumentConfigSchema } from '@/lib/validations/system/document-config';

// GET /api/admin/document-config - Get all document number configs
async function getDocumentConfigsHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const isAssetCategory = searchParams.get('isAssetCategory');
  const activeOnly = searchParams.get('activeOnly') === 'true';

  const where: Record<string, unknown> = {};

  if (isAssetCategory !== null) {
    where.isAssetCategory = isAssetCategory === 'true';
  }

  if (activeOnly) {
    where.isActive = true;
  }

  const configs = await prisma.documentNumberConfig.findMany({
    where,
    orderBy: [
      { isAssetCategory: 'asc' },
      { entityLabel: 'asc' },
    ],
  });

  // Get company prefix from system settings
  const prefixSetting = await prisma.systemSettings.findUnique({
    where: { key: 'companyPrefix' },
  });

  return NextResponse.json({
    configs,
    companyPrefix: prefixSetting?.value || 'BCE',
  });
}

// POST /api/admin/document-config - Create new document number config
async function createDocumentConfigHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const validation = createDocumentConfigSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const data = validation.data;

  // Check if entityType already exists
  const existingEntityType = await prisma.documentNumberConfig.findUnique({
    where: { entityType: data.entityType },
  });

  if (existingEntityType) {
    return NextResponse.json({
      error: 'Entity type already exists',
      details: [{ message: `Entity type "${data.entityType}" is already configured.` }],
    }, { status: 400 });
  }

  // Check if code is unique within its category (document types or asset categories)
  const existingCode = await prisma.documentNumberConfig.findFirst({
    where: {
      code: data.code.toUpperCase(),
      isAssetCategory: data.isAssetCategory,
    },
  });

  if (existingCode) {
    const categoryType = data.isAssetCategory ? 'asset categories' : 'document types';
    return NextResponse.json({
      error: 'Code already in use',
      details: [{ message: `Code "${data.code}" is already used in ${categoryType} by "${existingCode.entityLabel}".` }],
    }, { status: 400 });
  }

  const config = await prisma.documentNumberConfig.create({
    data: {
      ...data,
      code: data.code.toUpperCase(),
    },
  });

  return NextResponse.json(config, { status: 201 });
}

export const GET = withErrorHandler(getDocumentConfigsHandler, { requireAuth: true, requireAdmin: true });
export const POST = withErrorHandler(createDocumentConfigHandler, { requireAuth: true, requireAdmin: true });
