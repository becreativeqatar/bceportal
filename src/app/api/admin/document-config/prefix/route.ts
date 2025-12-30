import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updatePrefixSchema = z.object({
  prefix: z
    .string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(10, 'Prefix must be 10 characters or less')
    .regex(/^[A-Z]+$/, 'Prefix must be uppercase letters only'),
});

// GET /api/admin/document-config/prefix - Get company prefix
async function getPrefixHandler() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'companyPrefix' },
  });

  return NextResponse.json({
    prefix: setting?.value || 'BCE',
  });
}

// PUT /api/admin/document-config/prefix - Update company prefix
async function updatePrefixHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const validation = updatePrefixSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const { prefix } = validation.data;

  const setting = await prisma.systemSettings.upsert({
    where: { key: 'companyPrefix' },
    update: {
      value: prefix,
      updatedBy: session.user.id,
    },
    create: {
      key: 'companyPrefix',
      value: prefix,
      updatedBy: session.user.id,
    },
  });

  return NextResponse.json({
    prefix: setting.value,
  });
}

export const GET = withErrorHandler(getPrefixHandler, { requireAuth: true, requireAdmin: true });
export const PUT = withErrorHandler(updatePrefixHandler, { requireAuth: true, requireAdmin: true });
