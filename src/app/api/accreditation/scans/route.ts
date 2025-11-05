import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/accreditation/scans - Get scan logs with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accreditationId = searchParams.get('accreditationId');
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const wasValid = searchParams.get('wasValid');

    // Build where clause
    const where: any = {};

    if (accreditationId) {
      where.accreditationId = accreditationId;
    }

    if (projectId) {
      where.accreditation = {
        projectId: projectId,
      };
    }

    if (wasValid !== null && wasValid !== undefined && wasValid !== '') {
      where.wasValid = wasValid === 'true';
    }

    // Count total records
    const total = await prisma.accreditationScan.count({ where });

    // Fetch paginated scans
    const scans = await prisma.accreditationScan.findMany({
      where,
      include: {
        accreditation: {
          select: {
            id: true,
            accreditationNumber: true,
            firstName: true,
            lastName: true,
            organization: true,
            accessGroup: true,
            profilePhotoUrl: true,
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
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scannedAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      scans,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Get scan logs error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch scan logs',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
