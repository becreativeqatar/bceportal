import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createLeaveRequestSchema, leaveRequestQuerySchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';
import {
  calculateWorkingDays,
  generateLeaveRequestNumber,
  getCurrentYear,
  datesOverlap,
  meetsNoticeDaysRequirement,
  exceedsMaxConsecutiveDays,
  calculateAvailableBalance,
} from '@/lib/leave-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = leaveRequestQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { q, status, userId, leaveTypeId, year, startDate, endDate, p, ps, sort, order } = validation.data;

    // Non-admin users can only see their own requests
    const isAdmin = session.user.role === Role.ADMIN;
    const effectiveUserId = isAdmin ? userId : session.user.id;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (effectiveUserId) {
      where.userId = effectiveUserId;
    }
    if (status) {
      where.status = status;
    }
    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }
    if (year) {
      where.startDate = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      };
    }
    if (startDate) {
      where.startDate = {
        ...(where.startDate as object || {}),
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.endDate = {
        lte: new Date(endDate),
      };
    }
    if (q) {
      where.OR = [
        { requestNumber: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (p - 1) * ps;

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          leaveType: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { [sort]: order },
        take: ps,
        skip,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
        hasMore: skip + ps < total,
      },
    });
  } catch (error) {
    console.error('Leave requests GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createLeaveRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;
    const userId = session.user.id;

    // Parse dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Validate leave type exists and is active
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: data.leaveTypeId },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    if (!leaveType.isActive) {
      return NextResponse.json({ error: 'This leave type is not active' }, { status: 400 });
    }

    // Calculate working days
    const totalDays = calculateWorkingDays(startDate, endDate, data.requestType);

    if (totalDays === 0) {
      return NextResponse.json({
        error: 'No working days in the selected date range',
      }, { status: 400 });
    }

    // Check minimum notice days
    if (!meetsNoticeDaysRequirement(startDate, leaveType.minNoticeDays)) {
      return NextResponse.json({
        error: `This leave type requires at least ${leaveType.minNoticeDays} days advance notice`,
      }, { status: 400 });
    }

    // Check max consecutive days
    if (exceedsMaxConsecutiveDays(totalDays, leaveType.maxConsecutiveDays)) {
      return NextResponse.json({
        error: `This leave type allows a maximum of ${leaveType.maxConsecutiveDays} consecutive days`,
      }, { status: 400 });
    }

    // Check for document requirement
    if (leaveType.requiresDocument && !data.documentUrl) {
      return NextResponse.json({
        error: 'This leave type requires a supporting document',
      }, { status: 400 });
    }

    // Get or create leave balance for current year
    const year = startDate.getFullYear();
    let balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId,
          leaveTypeId: data.leaveTypeId,
          year,
        },
      },
    });

    // If no balance exists, create one with default entitlement
    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: {
          userId,
          leaveTypeId: data.leaveTypeId,
          year,
          entitlement: leaveType.defaultDays,
        },
      });
    }

    // Check sufficient balance (for paid leave types)
    if (leaveType.isPaid) {
      const available = calculateAvailableBalance(
        balance.entitlement,
        balance.used,
        balance.carriedForward,
        balance.adjustment
      );

      if (totalDays > available) {
        return NextResponse.json({
          error: `Insufficient leave balance. Available: ${available} days, Requested: ${totalDays} days`,
        }, { status: 400 });
      }
    }

    // Check for overlapping requests
    const overlappingRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    if (overlappingRequests.length > 0) {
      return NextResponse.json({
        error: 'You already have a pending or approved leave request that overlaps with these dates',
      }, { status: 400 });
    }

    // Generate request number
    const requestCount = await prisma.leaveRequest.count();
    const requestNumber = generateLeaveRequestNumber(requestCount);

    // Create leave request in a transaction
    const leaveRequest = await prisma.$transaction(async (tx) => {
      // Create the request
      const request = await tx.leaveRequest.create({
        data: {
          requestNumber,
          userId,
          leaveTypeId: data.leaveTypeId,
          startDate,
          endDate,
          requestType: data.requestType,
          totalDays,
          reason: data.reason,
          documentUrl: data.documentUrl,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          leaveType: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      // Update balance pending days
      await tx.leaveBalance.update({
        where: {
          userId_leaveTypeId_year: {
            userId,
            leaveTypeId: data.leaveTypeId,
            year,
          },
        },
        data: {
          pending: {
            increment: totalDays,
          },
        },
      });

      // Create history entry
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: request.id,
          action: 'CREATED',
          newStatus: 'PENDING',
          performedById: userId,
        },
      });

      return request;
    });

    await logAction(
      userId,
      ActivityActions.LEAVE_REQUEST_CREATED,
      'LeaveRequest',
      leaveRequest.id,
      {
        requestNumber: leaveRequest.requestNumber,
        leaveType: leaveType.name,
        totalDays,
        startDate: data.startDate,
        endDate: data.endDate,
      }
    );

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error) {
    console.error('Leave requests POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
}
