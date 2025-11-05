import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccreditationStatus } from '@prisma/client';

// PATCH /api/accreditation/records/[id]/return-to-draft - Return a pending accreditation back to draft
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the accreditation
    const accreditation = await prisma.accreditation.findUnique({
      where: { id: params.id },
    });

    if (!accreditation) {
      return NextResponse.json(
        { error: 'Accreditation not found' },
        { status: 404 }
      );
    }

    // Only PENDING accreditations can be returned to draft
    if (accreditation.status !== AccreditationStatus.PENDING) {
      return NextResponse.json(
        { error: 'Only pending accreditations can be returned to draft' },
        { status: 400 }
      );
    }

    // Return to draft in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update accreditation status
      const draft = await tx.accreditation.update({
        where: { id: params.id },
        data: {
          status: AccreditationStatus.DRAFT,
        },
      });

      // Log the action in history
      await tx.accreditationHistory.create({
        data: {
          accreditationId: params.id,
          action: 'RETURNED_TO_DRAFT',
          oldStatus: AccreditationStatus.PENDING,
          newStatus: AccreditationStatus.DRAFT,
          notes: 'Returned to draft for editing',
          performedById: session.user.id,
        },
      });

      return draft;
    });

    return NextResponse.json({
      success: true,
      accreditation: updated,
    });
  } catch (error) {
    console.error('Return to draft error:', error);
    return NextResponse.json(
      { error: 'Failed to return accreditation to draft' },
      { status: 500 }
    );
  }
}
