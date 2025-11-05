import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/accreditation/scans/export - Export scan logs as CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wasValid = searchParams.get('wasValid');

    // Build where clause
    const where: any = {};

    if (wasValid !== null && wasValid !== undefined && wasValid !== '') {
      where.wasValid = wasValid === 'true';
    }

    // Fetch all scans (limit to 10000 for safety)
    const scans = await prisma.accreditationScan.findMany({
      where,
      include: {
        accreditation: {
          select: {
            accreditationNumber: true,
            firstName: true,
            lastName: true,
            organization: true,
            accessGroup: true,
            project: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        scannedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scannedAt: 'desc',
      },
      take: 10000,
    });

    // Build CSV
    const csvRows = [
      // Header
      [
        'Scan Date/Time',
        'Accreditation Number',
        'First Name',
        'Last Name',
        'Organization',
        'Access Group',
        'Project',
        'Valid',
        'Valid Phases',
        'Scanned By',
        'Scanner Email',
        'Device',
        'IP Address',
        'Location',
        'Notes',
      ].join(','),
    ];

    // Data rows
    for (const scan of scans) {
      const validPhases = Array.isArray(scan.validPhases)
        ? (scan.validPhases as string[]).join('; ')
        : '';

      csvRows.push(
        [
          new Date(scan.scannedAt).toLocaleString(),
          scan.accreditation.accreditationNumber,
          scan.accreditation.firstName,
          scan.accreditation.lastName,
          scan.accreditation.organization,
          scan.accreditation.accessGroup,
          scan.accreditation.project.name,
          scan.wasValid ? 'Yes' : 'No',
          validPhases,
          scan.scannedBy.name || '',
          scan.scannedBy.email,
          scan.device || '',
          scan.ipAddress || '',
          scan.location || '',
          scan.notes || '',
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`) // Escape quotes
          .join(',')
      );
    }

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="scan-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export scan logs error:', error);
    return NextResponse.json(
      { error: 'Failed to export scan logs' },
      { status: 500 }
    );
  }
}
