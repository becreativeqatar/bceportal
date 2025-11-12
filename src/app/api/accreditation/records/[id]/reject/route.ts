import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rejectAccreditationSchema } from '@/lib/validations/accreditation';
import { logAction } from '@/lib/activity';
import { Role, AccreditationStatus } from '@prisma/client';

// PATCH /api/accreditation/records/[id]/reject - Reject accreditation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only ADMIN and ACCREDITATION_APPROVER can reject
    if (session.user.role !== Role.ADMIN && session.user.role !== Role.ACCREDITATION_APPROVER) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const body = await request.json();
    const validation = rejectAccreditationSchema.safeParse(body);

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

    // Can only reject PENDING accreditations
    if (existing.status !== AccreditationStatus.PENDING) {
      return NextResponse.json(
        { error: `Cannot reject accreditation with status ${existing.status}` },
        { status: 400 }
      );
    }

    // Update status to REJECTED
    const accreditation = await prisma.accreditation.update({
      where: { id },
      data: {
        status: AccreditationStatus.REJECTED,
      },
    });

    // Create history record
    await prisma.accreditationHistory.create({
      data: {
        accreditationId: accreditation.id,
        action: 'REJECTED',
        oldStatus: AccreditationStatus.PENDING,
        newStatus: AccreditationStatus.REJECTED,
        notes: data.notes,
        performedById: session.user.id,
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_REJECTED',
      'accreditation',
      accreditation.id,
      {
        accreditationNumber: accreditation.accreditationNumber,
        name: `${accreditation.firstName} ${accreditation.lastName}`,
        reason: data.notes,
      }
    );

    return NextResponse.json({
      accreditation,
      message: 'Accreditation rejected',
    });
  } catch (error) {
    console.error('Reject accreditation error:', error);
    return NextResponse.json(
      { error: 'Failed to reject accreditation' },
      { status: 500 }
    );
  }
}
