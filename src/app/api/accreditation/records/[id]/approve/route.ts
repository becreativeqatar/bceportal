import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { approveAccreditationSchema } from '@/lib/validations/accreditation';
import { logAction } from '@/lib/activity';
import { Role, AccreditationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

// PATCH /api/accreditation/records/[id]/approve - Approve accreditation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only ADMIN and ACCREDITATION_APPROVER can approve
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.ACCREDITATION_APPROVER) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const body = await request.json();
    const validation = approveAccreditationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if accreditation exists
    const existing = await prisma.accreditation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Accreditation not found' },
        { status: 404 }
      );
    }

    // Can only approve PENDING accreditations
    if (existing.status !== AccreditationStatus.PENDING) {
      return NextResponse.json(
        { error: `Cannot approve accreditation with status ${existing.status}` },
        { status: 400 }
      );
    }

    // Generate unique QR code token (with uniqueness check)
    let qrCodeToken = '';
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (!isUnique && attempts < MAX_ATTEMPTS) {
      const candidateToken = randomBytes(16).toString('hex');
      const existingToken = await prisma.accreditation.findUnique({
        where: { qrCodeToken: candidateToken },
      });
      if (!existingToken) {
        qrCodeToken = candidateToken;
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique || !qrCodeToken) {
      console.error('Failed to generate unique QR token after multiple attempts');
      return NextResponse.json(
        { error: 'Failed to generate unique QR code. Please try again.' },
        { status: 500 }
      );
    }

    // Update status to APPROVED and set approval info
    const accreditation = await prisma.accreditation.update({
      where: { id },
      data: {
        status: AccreditationStatus.APPROVED,
        qrCodeToken,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });

    // Create history record
    await prisma.accreditationHistory.create({
      data: {
        accreditationId: accreditation.id,
        action: 'APPROVED',
        oldStatus: AccreditationStatus.PENDING,
        newStatus: AccreditationStatus.APPROVED,
        notes: data.notes,
        performedById: session.user.id,
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_APPROVED',
      'accreditation',
      accreditation.id,
      {
        accreditationNumber: accreditation.accreditationNumber,
        name: `${accreditation.firstName} ${accreditation.lastName}`,
        qrCodeToken,
      }
    );

    return NextResponse.json({
      accreditation,
      message: 'Accreditation approved successfully',
    });
  } catch (error) {
    console.error('Approve accreditation error:', error);
    return NextResponse.json(
      { error: 'Failed to approve accreditation' },
      { status: 500 }
    );
  }
}
