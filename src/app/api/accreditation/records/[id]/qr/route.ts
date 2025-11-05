import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccreditationStatus } from '@prisma/client';
import QRCode from 'qrcode';

// GET /api/accreditation/records/[id]/qr - Generate QR code image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get accreditation
    const accreditation = await prisma.accreditation.findUnique({
      where: { id },
      select: {
        status: true,
        qrCodeToken: true,
        qrCodeImage: true,
        accreditationNumber: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!accreditation) {
      return NextResponse.json(
        { error: 'Accreditation not found' },
        { status: 404 }
      );
    }

    // Must be approved to generate QR code
    if (
      accreditation.status !== AccreditationStatus.APPROVED ||
      !accreditation.qrCodeToken
    ) {
      return NextResponse.json(
        { error: 'QR code only available for approved accreditations' },
        { status: 400 }
      );
    }

    // Generate filename
    const filename = `QR-${accreditation.accreditationNumber}-${accreditation.firstName}_${accreditation.lastName}.png`.replace(/\s+/g, '_');

    // Check if QR code is already cached
    if (accreditation.qrCodeImage) {
      // Return cached QR code
      const buffer = Buffer.from(accreditation.qrCodeImage, 'base64');
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year since it's immutable
        },
      });
    }

    // Generate verification URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify/${accreditation.qrCodeToken}`;

    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(verificationUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 400,
      margin: 2,
    });

    // Cache the QR code in database
    await prisma.accreditation.update({
      where: { id },
      data: {
        qrCodeImage: qrCodeBuffer.toString('base64'),
      },
    });

    // Return QR code image
    return new NextResponse(qrCodeBuffer as any, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
