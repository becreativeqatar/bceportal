import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/accreditation/verify/[token] - Verify accreditation by QR token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add no-cache headers to ensure fresh data
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    const { token } = await params;

    // Find accreditation by QR token or accreditation number (case insensitive)
    let accreditation = await prisma.accreditation.findUnique({
      where: { qrCodeToken: token },
      select: {
        id: true,
        accreditationNumber: true,
        firstName: true,
        lastName: true,
        organization: true,
        jobTitle: true,
        accessGroup: true,
        profilePhotoUrl: true,
        qidNumber: true,
        status: true,
        revocationReason: true,
        hasBumpInAccess: true,
        bumpInStart: true,
        bumpInEnd: true,
        hasLiveAccess: true,
        liveStart: true,
        liveEnd: true,
        hasBumpOutAccess: true,
        bumpOutStart: true,
        bumpOutEnd: true,
        project: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    // If not found by QR token, try by accreditation number (case insensitive)
    if (!accreditation) {
      accreditation = await prisma.accreditation.findFirst({
        where: {
          accreditationNumber: {
            equals: token,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          accreditationNumber: true,
          firstName: true,
          lastName: true,
          organization: true,
          jobTitle: true,
          accessGroup: true,
          profilePhotoUrl: true,
          qidNumber: true,
          status: true,
          revocationReason: true,
          hasBumpInAccess: true,
          bumpInStart: true,
          bumpInEnd: true,
          hasLiveAccess: true,
          liveStart: true,
          liveEnd: true,
          hasBumpOutAccess: true,
          bumpOutStart: true,
          bumpOutEnd: true,
          project: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      });
    }

    if (!accreditation) {
      return NextResponse.json(
        {
          error: 'Invalid QR Code',
          message: 'This QR code or accreditation number does not exist in our system.',
          errorType: 'NOT_FOUND'
        },
        { status: 404, headers }
      );
    }

    // Check if accreditation is revoked
    if (accreditation.status === 'REVOKED') {
      return NextResponse.json(
        {
          error: 'Access Revoked',
          message: `This accreditation has been revoked${accreditation.revocationReason ? `: ${accreditation.revocationReason}` : '. Please contact administration for more information.'}`,
          errorType: 'REVOKED',
          accreditationNumber: accreditation.accreditationNumber,
          name: `${accreditation.firstName} ${accreditation.lastName}`,
        },
        { status: 403, headers }
      );
    }

    // Check if accreditation is rejected
    if (accreditation.status === 'REJECTED') {
      return NextResponse.json(
        {
          error: 'Application Rejected',
          message: 'This accreditation application was rejected and is not valid for access.',
          errorType: 'REJECTED',
        },
        { status: 403, headers }
      );
    }

    // Check if accreditation is not yet approved
    if (accreditation.status !== 'APPROVED') {
      return NextResponse.json(
        {
          error: 'Pending Approval',
          message: 'This accreditation is still pending approval and cannot be used for access yet.',
          errorType: 'PENDING',
        },
        { status: 403, headers }
      );
    }

    // Check if currently valid
    const now = new Date();
    let isValid = false;

    // Check each access phase and track which phases are active
    const validPhases: string[] = [];
    const hasAnyAccessDates = accreditation.hasBumpInAccess || accreditation.hasLiveAccess || accreditation.hasBumpOutAccess;

    if (accreditation.hasBumpInAccess && accreditation.bumpInStart && accreditation.bumpInEnd) {
      if (now >= accreditation.bumpInStart && now <= accreditation.bumpInEnd) {
        isValid = true;
        validPhases.push('BUMP_IN');
      }
    }

    if (accreditation.hasLiveAccess && accreditation.liveStart && accreditation.liveEnd) {
      if (now >= accreditation.liveStart && now <= accreditation.liveEnd) {
        isValid = true;
        validPhases.push('LIVE');
      }
    }

    if (accreditation.hasBumpOutAccess && accreditation.bumpOutStart && accreditation.bumpOutEnd) {
      if (now >= accreditation.bumpOutStart && now <= accreditation.bumpOutEnd) {
        isValid = true;
        validPhases.push('BUMP_OUT');
      }
    }

    // If approved but not valid today, return access denied with specific message
    if (!isValid) {
      // Log the failed scan
      try {
        await prisma.accreditationScan.create({
          data: {
            accreditationId: accreditation.id,
            scannedById: session.user.id,
            scannedAt: now,
            wasValid: false,
            validPhases: [],
            device: request.headers.get('user-agent'),
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          },
        });
      } catch (error) {
        console.error('Failed to log scan:', error);
      }

      if (!hasAnyAccessDates) {
        return NextResponse.json(
          {
            error: 'No Access Dates',
            message: 'This accreditation has been approved but no access dates have been configured yet. Please contact administration.',
            errorType: 'NO_ACCESS_DATES',
            accreditationNumber: accreditation.accreditationNumber,
            name: `${accreditation.firstName} ${accreditation.lastName}`,
          },
          { status: 403, headers }
        );
      }

      return NextResponse.json(
        {
          error: 'Not Valid Today',
          message: 'This accreditation is not valid for today\'s date. Access is only permitted during the configured access periods.',
          errorType: 'NOT_VALID_TODAY',
          accreditationNumber: accreditation.accreditationNumber,
          name: `${accreditation.firstName} ${accreditation.lastName}`,
          phases: {
            bumpIn: accreditation.hasBumpInAccess
              ? {
                  start: accreditation.bumpInStart,
                  end: accreditation.bumpInEnd,
                }
              : null,
            live: accreditation.hasLiveAccess
              ? {
                  start: accreditation.liveStart,
                  end: accreditation.liveEnd,
                }
              : null,
            bumpOut: accreditation.hasBumpOutAccess
              ? {
                  start: accreditation.bumpOutStart,
                  end: accreditation.bumpOutEnd,
                }
              : null,
          },
        },
        { status: 403, headers }
      );
    }

    // Log the successful scan
    try {
      await prisma.accreditationScan.create({
        data: {
          accreditationId: accreditation.id,
          scannedById: session.user.id,
          scannedAt: now,
          wasValid: isValid,
          validPhases: validPhases,
          device: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        },
      });
    } catch (error) {
      console.error('Failed to log scan:', error);
      // Don't fail the verification if logging fails
    }

    return NextResponse.json({
      accreditation: {
        id: accreditation.id,
        accreditationNumber: accreditation.accreditationNumber,
        firstName: accreditation.firstName,
        lastName: accreditation.lastName,
        organization: accreditation.organization,
        jobTitle: accreditation.jobTitle,
        accessGroup: accreditation.accessGroup,
        profilePhotoUrl: accreditation.profilePhotoUrl,
        qidNumber: accreditation.qidNumber,
        project: {
          name: accreditation.project.name,
          code: accreditation.project.code,
        },
        phases: {
          bumpIn: accreditation.hasBumpInAccess
            ? {
                start: accreditation.bumpInStart,
                end: accreditation.bumpInEnd,
              }
            : null,
          live: accreditation.hasLiveAccess
            ? {
                start: accreditation.liveStart,
                end: accreditation.liveEnd,
              }
            : null,
          bumpOut: accreditation.hasBumpOutAccess
            ? {
                start: accreditation.bumpOutStart,
                end: accreditation.bumpOutEnd,
              }
            : null,
        },
        status: accreditation.status,
        isValidToday: isValid,
      },
    }, { headers });
  } catch (error) {
    console.error('Verify accreditation error:', error);
    return NextResponse.json(
      { error: 'Failed to verify accreditation' },
      { status: 500 }
    );
  }
}
