import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/activity';
import { AccreditationStatus } from '@prisma/client';

// POST /api/accreditation/records/[id]/submit - Submit accreditation for approval
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Can submit DRAFT, REJECTED, or REVOKED accreditations for (re)approval
    if (
      existing.status !== AccreditationStatus.DRAFT &&
      existing.status !== AccreditationStatus.REJECTED &&
      existing.status !== AccreditationStatus.REVOKED
    ) {
      return NextResponse.json(
        { error: `Cannot submit accreditation with status ${existing.status}. Only DRAFT, REJECTED, or REVOKED accreditations can be submitted for approval.` },
        { status: 400 }
      );
    }

    const oldStatus = existing.status;

    // Update status to PENDING
    const accreditation = await prisma.accreditation.update({
      where: { id },
      data: {
        status: AccreditationStatus.PENDING,
      },
    });

    // Create history record
    await prisma.accreditationHistory.create({
      data: {
        accreditationId: accreditation.id,
        action: oldStatus === AccreditationStatus.DRAFT ? 'SUBMITTED' : 'RESUBMITTED',
        oldStatus: oldStatus,
        newStatus: AccreditationStatus.PENDING,
        performedById: session.user.id,
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_SUBMITTED',
      'accreditation',
      accreditation.id,
      {
        accreditationNumber: accreditation.accreditationNumber,
        name: `${accreditation.firstName} ${accreditation.lastName}`,
      }
    );

    return NextResponse.json({
      accreditation,
      message: 'Accreditation submitted for approval',
    });
  } catch (error) {
    console.error('Submit accreditation error:', error);
    return NextResponse.json(
      { error: 'Failed to submit accreditation' },
      { status: 500 }
    );
  }
}
