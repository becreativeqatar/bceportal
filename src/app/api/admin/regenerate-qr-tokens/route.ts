import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

// POST /api/admin/regenerate-qr-tokens - Regenerate all QR code tokens
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session?.user?.email || !process.env.ADMIN_EMAILS?.split(',').includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Find all approved accreditations with QR codes
    const approved = await prisma.accreditation.findMany({
      where: {
        status: 'APPROVED',
        qrCodeToken: { not: null },
      },
      select: {
        id: true,
        accreditationNumber: true,
        firstName: true,
        lastName: true,
      },
    });

    const updates = [];

    // Generate new tokens for each
    for (const acc of approved) {
      const newToken = randomBytes(16).toString('hex');

      updates.push(
        prisma.accreditation.update({
          where: { id: acc.id },
          data: { qrCodeToken: newToken },
        })
      );
    }

    // Execute all updates
    await Promise.all(updates);

    return NextResponse.json({
      message: `Successfully regenerated ${approved.length} QR code tokens`,
      count: approved.length,
      baseUrl: process.env.NEXTAUTH_URL || 'Not configured',
    });
  } catch (error) {
    console.error('Regenerate QR tokens error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate QR tokens' },
      { status: 500 }
    );
  }
}
