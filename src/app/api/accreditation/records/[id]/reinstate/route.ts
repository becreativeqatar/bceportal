import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccreditationStatus, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { logAction } from '@/lib/activity';

// POST /api/accreditation/records/[id]/reinstate - Reinstate a revoked accreditation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Can only reinstate REVOKED accreditations
    if (accreditation.status !== AccreditationStatus.REVOKED) {
      return NextResponse.json(
        { error: 'Only revoked accreditations can be reinstated' },
        { status: 400 }
      );
    }

    // Generate new unique QR code token
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

    // Reinstate the accreditation in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update accreditation status back to APPROVED
      const reinstated = await tx.accreditation.update({
        where: { id },
        data: {
          status: AccreditationStatus.APPROVED,
          qrCodeToken, // Generate new QR token
          qrCodeImage: null, // Clear old cached QR image
          revokedById: null,
          revokedAt: null,
          revocationReason: null,
        },
      });

      // Log the reinstatement in history
      await tx.accreditationHistory.create({
        data: {
          accreditationId: id,
          action: 'REINSTATED',
          oldStatus: AccreditationStatus.REVOKED,
          newStatus: AccreditationStatus.APPROVED,
          notes: 'Accreditation reinstated after revocation',
          performedById: session.user.id,
        },
      });

      return reinstated;
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_REINSTATED',
      'accreditation',
      updated.id,
      {
        accreditationNumber: updated.accreditationNumber,
        name: `${updated.firstName} ${updated.lastName}`,
      }
    );

    return NextResponse.json({
      success: true,
      accreditation: updated,
      message: 'Accreditation reinstated successfully',
    });
  } catch (error) {
    console.error('Reinstate accreditation error:', error);
    return NextResponse.json(
      { error: 'Failed to reinstate accreditation' },
      { status: 500 }
    );
  }
}
