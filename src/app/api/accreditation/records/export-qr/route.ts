import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';
import archiver from 'archiver';
import { Readable } from 'stream';

// GET /api/accreditation/records/export-qr - Export all approved QR codes as ZIP
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const accessGroup = searchParams.get('accessGroup');

    // Build where clause - only APPROVED accreditations
    const where: any = {
      status: 'APPROVED',
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (accessGroup) {
      where.accessGroup = accessGroup;
    }

    // Fetch all approved accreditations
    const accreditations = await prisma.accreditation.findMany({
      where,
      select: {
        id: true,
        accreditationNumber: true,
        firstName: true,
        lastName: true,
        organization: true,
        qrCodeToken: true,
        project: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        accreditationNumber: 'asc',
      },
    });

    if (accreditations.length === 0) {
      return NextResponse.json(
        { error: 'No approved accreditations found' },
        { status: 404 }
      );
    }

    // Create a ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Create a readable stream to collect the ZIP data
    const chunks: Buffer[] = [];
    const readable = Readable.from(archive);

    readable.on('data', (chunk) => chunks.push(chunk));

    // Generate QR codes and add to archive
    for (const acc of accreditations) {
      // Use qrCodeToken if available, otherwise use accreditationNumber
      const verifyIdentifier = acc.qrCodeToken || acc.accreditationNumber;
      const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify/${verifyIdentifier}`;

      try {
        // Generate QR code as buffer
        const qrBuffer = await QRCode.toBuffer(verifyUrl, {
          errorCorrectionLevel: 'H',
          type: 'png',
          width: 512,
          margin: 2,
        });

        // Create filename: ACC-0001_John_Doe.png
        const safeName = `${acc.accreditationNumber}_${acc.firstName}_${acc.lastName}`
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .replace(/_+/g, '_');

        const filename = `${safeName}.png`;

        // Add to archive
        archive.append(qrBuffer, { name: filename });
      } catch (error) {
        console.error(`Failed to generate QR for ${acc.accreditationNumber}:`, error);
        // Continue with other QR codes
      }
    }

    // Finalize the archive
    await archive.finalize();

    // Wait for all data to be collected
    await new Promise((resolve) => readable.on('end', resolve));

    // Combine all chunks
    const zipBuffer = Buffer.concat(chunks);

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="qr-codes-${new Date().toISOString().split('T')[0]}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Export QR codes error:', error);
    return NextResponse.json(
      { error: 'Failed to export QR codes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
