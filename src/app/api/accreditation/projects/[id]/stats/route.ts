import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/accreditation/projects/[id]/stats - Get project statistics
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

    // Verify project exists
    const project = await prisma.accreditationProject.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get statistics for this project
    const [
      totalAccreditations,
      draftAccreditations,
      pendingAccreditations,
      approvedAccreditations,
      rejectedAccreditations,
      totalScans,
    ] = await Promise.all([
      prisma.accreditation.count({ where: { projectId: id } }),
      prisma.accreditation.count({ where: { projectId: id, status: 'DRAFT' } }),
      prisma.accreditation.count({ where: { projectId: id, status: 'PENDING' } }),
      prisma.accreditation.count({ where: { projectId: id, status: 'APPROVED' } }),
      prisma.accreditation.count({ where: { projectId: id, status: 'REJECTED' } }),
      prisma.accreditationScan.count({
        where: {
          accreditation: {
            projectId: id,
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalAccreditations,
      draftAccreditations,
      pendingAccreditations,
      approvedAccreditations,
      rejectedAccreditations,
      totalScans,
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project statistics' },
      { status: 500 }
    );
  }
}
