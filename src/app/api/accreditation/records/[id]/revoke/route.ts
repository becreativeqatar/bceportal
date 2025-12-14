import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccreditationStatus } from '@prisma/client';
import { z } from 'zod';

const revokeSchema = z.object({
  reason: z.string().min(1, 'Revocation reason is required'),
});

// POST /api/accreditation/records/[id]/revoke - Revoke an approved accreditation
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

    const body = await request.json();
    const validation = revokeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { reason } = validation.data;

    // Find the accreditation
    const accreditation = await prisma.accreditation.findUnique({
      where: { id },
    });

    if (!accreditation) {
      return NextResponse.json(
        { error: 'Accreditation not found' },
        { status: 404 }
      );
    }

    // Only APPROVED accreditations can be revoked
    if (accreditation.status !== AccreditationStatus.APPROVED) {
      return NextResponse.json(
        { error: 'Only approved accreditations can be revoked' },
        { status: 400 }
      );
    }

    // Revoke the accreditation in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update accreditation status
      const revoked = await tx.accreditation.update({
        where: { id },
        data: {
          status: AccreditationStatus.REVOKED,
          revokedById: session.user.id,
          revokedAt: new Date(),
          revocationReason: reason,
          qrCodeToken: null, // Clear QR token to prevent future scans
          qrCodeImage: null, // Clear cached QR code image
        },
      });

      // Log the revocation in history
      await tx.accreditationHistory.create({
        data: {
          accreditationId: id,
          action: 'REVOKED',
          oldStatus: AccreditationStatus.APPROVED,
          newStatus: AccreditationStatus.REVOKED,
          notes: reason,
          performedById: session.user.id,
        },
      });

      return revoked;
    });

    return NextResponse.json({
      success: true,
      accreditation: updated,
    });
  } catch (error) {
    console.error('Revoke accreditation error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke accreditation' },
      { status: 500 }
    );
  }
}
