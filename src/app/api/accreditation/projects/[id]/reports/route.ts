import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Fetch the accreditation project
    const accreditationProject = await prisma.accreditationProject.findUnique({
      where: { id: projectId },
    });

    if (!accreditationProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all accreditations for this project
    const accreditations = await prisma.accreditation.findMany({
      where: { projectId: projectId },
      include: {
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Calculate stats
    const stats = {
      total: accreditations.length,
      byStatus: {
        DRAFT: 0,
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        REVOKED: 0,
        ISSUED: 0,
      },
      byAccessGroup: {} as Record<string, number>,
      byPhaseAccess: {
        bumpIn: 0,
        live: 0,
        bumpOut: 0,
      },
      recentScans: {
        total: 0,
        today: 0,
        thisWeek: 0,
      },
      idTypes: {
        qid: 0,
        passport: 0,
      },
    };

    // Process accreditations
    accreditations.forEach((acc) => {
      // Status count
      stats.byStatus[acc.status]++;

      // Access group count
      if (!stats.byAccessGroup[acc.accessGroup]) {
        stats.byAccessGroup[acc.accessGroup] = 0;
      }
      stats.byAccessGroup[acc.accessGroup]++;

      // Phase access count
      if (acc.hasBumpInAccess) stats.byPhaseAccess.bumpIn++;
      if (acc.hasLiveAccess) stats.byPhaseAccess.live++;
      if (acc.hasBumpOutAccess) stats.byPhaseAccess.bumpOut++;

      // ID type count
      if (acc.qidNumber) {
        stats.idTypes.qid++;
      } else if (acc.passportNumber) {
        stats.idTypes.passport++;
      }
    });

    // Fetch scan statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const totalScans = await prisma.accreditationScan.count({
      where: {
        accreditation: {
          projectId: projectId,
        },
      },
    });

    const todayScans = await prisma.accreditationScan.count({
      where: {
        accreditation: {
          projectId: projectId,
        },
        scannedAt: {
          gte: today,
        },
      },
    });

    const weekScans = await prisma.accreditationScan.count({
      where: {
        accreditation: {
          projectId: projectId,
        },
        scannedAt: {
          gte: weekAgo,
        },
      },
    });

    stats.recentScans = {
      total: totalScans,
      today: todayScans,
      thisWeek: weekScans,
    };

    // Get recent activity
    const recentActivity = await prisma.accreditationHistory.findMany({
      where: {
        accreditation: {
          projectId: projectId,
        },
      },
      include: {
        accreditation: {
          select: {
            accreditationNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const formattedActivity = recentActivity.map((activity) => ({
      id: activity.id,
      accreditationNumber: activity.accreditation.accreditationNumber,
      firstName: activity.accreditation.firstName,
      lastName: activity.accreditation.lastName,
      action: activity.action,
      createdAt: activity.createdAt.toISOString(),
    }));

    // Prepare response
    const reportData = {
      project: {
        id: accreditationProject.id,
        bumpInStart: accreditationProject.bumpInStart.toISOString(),
        bumpInEnd: accreditationProject.bumpInEnd.toISOString(),
        liveStart: accreditationProject.liveStart.toISOString(),
        liveEnd: accreditationProject.liveEnd.toISOString(),
        bumpOutStart: accreditationProject.bumpOutStart.toISOString(),
        bumpOutEnd: accreditationProject.bumpOutEnd.toISOString(),
        accessGroups: accreditationProject.accessGroups as string[],
      },
      stats,
      recentActivity: formattedActivity,
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error fetching report data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}
