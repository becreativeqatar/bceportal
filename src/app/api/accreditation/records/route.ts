import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAccreditationSchema, accreditationQuerySchema } from '@/lib/validations/accreditation';
import { logAction } from '@/lib/activity';
import { Role, AccreditationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

// Helper function to generate accreditation number with retry logic
async function generateAccreditationNumber(): Promise<string> {
  // Use a transaction to prevent race conditions
  const MAX_RETRIES = 5;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      // Get the last accreditation number within a transaction
      const lastAccreditation = await prisma.accreditation.findFirst({
        where: {
          accreditationNumber: {
            startsWith: 'ACC-',
          },
        },
        orderBy: {
          accreditationNumber: 'desc',
        },
      });

      if (!lastAccreditation) {
        return 'ACC-0001';
      }

      const lastNumber = parseInt(lastAccreditation.accreditationNumber.split('-')[1]);
      const nextNumber = lastNumber + 1;
      return `ACC-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        throw error;
      }
      // Wait a small random time before retrying (10-50ms)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 10));
    }
  }

  throw new Error('Failed to generate unique accreditation number after multiple attempts');
}

// Helper function to generate unique QR code token
async function generateQRCodeToken(): Promise<string | null> {
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
    return null;
  }

  return qrCodeToken;
}

// GET /api/accreditation/records - List accreditations with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);

    const validation = accreditationQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { projectId, status, accessGroup, q, p, ps, sort, order } = validation.data;

    // Build where clause
    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (accessGroup) {
      where.accessGroup = accessGroup;
    }

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
        { accreditationNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Count total records
    const total = await prisma.accreditation.count({ where });

    // Fetch paginated records (optimized - removed unused createdBy/approvedBy)
    const accreditations = await prisma.accreditation.findMany({
      where,
      select: {
        id: true,
        accreditationNumber: true,
        firstName: true,
        lastName: true,
        organization: true,
        jobTitle: true,
        accessGroup: true,
        profilePhotoUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        qidNumber: true,
        qidExpiry: true,
        passportNumber: true,
        passportExpiry: true,
        hayyaVisaNumber: true,
        hayyaVisaExpiry: true,
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
            id: true,
            name: true,
            code: true,
          },
        },
      },
      skip: (p - 1) * ps,
      take: ps,
      orderBy: {
        [sort]: order,
      },
    });

    // Normalize profilePhotoUrl: convert empty strings or invalid URLs to null
    const normalizedAccreditations = accreditations.map(acc => ({
      ...acc,
      profilePhotoUrl: acc.profilePhotoUrl &&
                      (acc.profilePhotoUrl.startsWith('http://') || acc.profilePhotoUrl.startsWith('https://'))
                      ? acc.profilePhotoUrl
                      : null,
    }));

    return NextResponse.json({
      accreditations: normalizedAccreditations,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
      },
    });
  } catch (error) {
    console.error('Get accreditations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accreditations' },
      { status: 500 }
    );
  }
}

// POST /api/accreditation/records - Create new accreditation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate projectId exists
    if (!body.projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Convert empty strings to null for optional date fields
    const cleanedBody = {
      ...body,
      qidExpiry: body.qidExpiry === '' ? null : body.qidExpiry,
      passportExpiry: body.passportExpiry === '' ? null : body.passportExpiry,
      hayyaVisaExpiry: body.hayyaVisaExpiry === '' ? null : body.hayyaVisaExpiry,
      bumpInStart: body.bumpInStart === '' ? null : body.bumpInStart,
      bumpInEnd: body.bumpInEnd === '' ? null : body.bumpInEnd,
      liveStart: body.liveStart === '' ? null : body.liveStart,
      liveEnd: body.liveEnd === '' ? null : body.liveEnd,
      bumpOutStart: body.bumpOutStart === '' ? null : body.bumpOutStart,
      bumpOutEnd: body.bumpOutEnd === '' ? null : body.bumpOutEnd,
    };

    const validation = createAccreditationSchema.safeParse(cleanedBody);

    if (!validation.success) {
      console.error('Validation failed:', JSON.stringify(validation.error.issues, null, 2));
      const errorMessages = validation.error.issues.map(issue => {
        const field = issue.path.join('.');
        return `${field}: ${issue.message}`;
      }).join('; ');

      return NextResponse.json(
        {
          error: `Validation failed: ${errorMessages}`,
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if accreditation project exists
    const accreditationProject = await prisma.accreditationProject.findUnique({
      where: { id: data.projectId },
    });

    if (!accreditationProject) {
      return NextResponse.json(
        { error: `Accreditation project not found` },
        { status: 404 }
      );
    }

    // Validate access group is in project's access groups
    const accessGroups = accreditationProject.accessGroups as string[];
    if (!accessGroups.includes(data.accessGroup)) {
      return NextResponse.json(
        { error: 'Invalid access group for this project' },
        { status: 400 }
      );
    }

    // Validate phase dates are within project phase boundaries
    if (data.hasBumpInAccess && data.bumpInStart && data.bumpInEnd) {
      if (data.bumpInStart < accreditationProject.bumpInStart || data.bumpInEnd > accreditationProject.bumpInEnd) {
        return NextResponse.json(
          { error: 'Bump-In dates must be within project Bump-In phase' },
          { status: 400 }
        );
      }
    }

    if (data.hasLiveAccess && data.liveStart && data.liveEnd) {
      if (data.liveStart < accreditationProject.liveStart || data.liveEnd > accreditationProject.liveEnd) {
        return NextResponse.json(
          { error: 'Live dates must be within project Live phase' },
          { status: 400 }
        );
      }
    }

    if (data.hasBumpOutAccess && data.bumpOutStart && data.bumpOutEnd) {
      if (data.bumpOutStart < accreditationProject.bumpOutStart || data.bumpOutEnd > accreditationProject.bumpOutEnd) {
        return NextResponse.json(
          { error: 'Bump-Out dates must be within project Bump-Out phase' },
          { status: 400 }
        );
      }
    }

    // Find the last access end date
    const lastAccessEndDate = [
      data.hasBumpInAccess ? data.bumpInEnd : null,
      data.hasLiveAccess ? data.liveEnd : null,
      data.hasBumpOutAccess ? data.bumpOutEnd : null,
    ]
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0];

    // Validate expiry dates
    const now = new Date();
    if (data.identificationType === 'qid' && data.qidExpiry) {
      // Check if QID is already expired
      if (data.qidExpiry < now) {
        return NextResponse.json(
          { error: 'QID has already expired. Cannot create accreditation with expired identification.' },
          { status: 400 }
        );
      }
      // Check if QID expires before last access date
      if (lastAccessEndDate && data.qidExpiry < lastAccessEndDate) {
        return NextResponse.json(
          { error: 'QID expiry date must be after the last access end date' },
          { status: 400 }
        );
      }
    } else if (data.identificationType === 'passport') {
      // Check if passport is already expired
      if (data.passportExpiry && data.passportExpiry < now) {
        return NextResponse.json(
          { error: 'Passport has already expired. Cannot create accreditation with expired identification.' },
          { status: 400 }
        );
      }
      // Check if Hayya visa is already expired
      if (data.hayyaVisaExpiry && data.hayyaVisaExpiry < now) {
        return NextResponse.json(
          { error: 'Hayya Visa has already expired. Cannot create accreditation with expired visa.' },
          { status: 400 }
        );
      }
      // Check if passport/visa expires before last access date
      if (lastAccessEndDate) {
        if (data.passportExpiry && data.passportExpiry < lastAccessEndDate) {
          return NextResponse.json(
            { error: 'Passport expiry date must be after the last access end date' },
            { status: 400 }
          );
        }
        if (data.hayyaVisaExpiry && data.hayyaVisaExpiry < lastAccessEndDate) {
          return NextResponse.json(
            { error: 'Hayya Visa expiry date must be after the last access end date' },
            { status: 400 }
          );
        }
      }
    }

    // Check for duplicate accreditation in the same project based on ID number
    let duplicateCheck;

    if (data.identificationType === 'qid' && data.qidNumber) {
      duplicateCheck = await prisma.accreditation.findFirst({
        where: {
          projectId: data.projectId,
          qidNumber: data.qidNumber,
          status: { notIn: ['REJECTED'] }, // Allow if previous was rejected
        },
      });
    } else if (data.identificationType === 'passport' && data.passportNumber) {
      duplicateCheck = await prisma.accreditation.findFirst({
        where: {
          projectId: data.projectId,
          passportNumber: data.passportNumber,
          status: { notIn: ['REJECTED'] }, // Allow if previous was rejected
        },
      });
    }

    if (duplicateCheck) {
      const projectInfo = await prisma.accreditationProject.findUnique({
        where: { id: data.projectId },
        select: { name: true },
      });

      const idType = data.identificationType === 'qid' ? 'QID' : 'Passport';
      const idNumber = data.identificationType === 'qid' ? data.qidNumber : data.passportNumber;

      return NextResponse.json(
        {
          error: `An accreditation already exists for ${idType} ${idNumber} in project "${projectInfo?.name}" with status ${duplicateCheck.status}. Please edit the existing record (${duplicateCheck.accreditationNumber}) instead of creating a duplicate.`,
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Generate accreditation number BEFORE transaction (to avoid timeout)
    const accreditationNumber = await generateAccreditationNumber();

    // Generate QR code token if status is APPROVED (BEFORE transaction)
    let qrCodeToken: string | null = null;
    if (data.status === AccreditationStatus.APPROVED) {
      qrCodeToken = await generateQRCodeToken();
      if (!qrCodeToken) {
        return NextResponse.json(
          { error: 'Failed to generate QR code token' },
          { status: 500 }
        );
      }
    }

    // Create accreditation with retry logic for race condition
    const MAX_RETRIES = 5;
    let accreditation;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        // Use transaction only for the create operation (fast)
        accreditation = await prisma.$transaction(async (tx) => {
          // Create accreditation (will throw error if number already exists due to @unique constraint)
          return await tx.accreditation.create({
            data: {
              accreditationNumber,
              firstName: data.firstName,
              lastName: data.lastName,
              organization: data.organization,
              jobTitle: data.jobTitle,
              accessGroup: data.accessGroup,
              profilePhotoUrl: data.profilePhotoUrl,
              qidNumber: data.identificationType === 'qid' ? data.qidNumber : null,
              qidExpiry: data.identificationType === 'qid' ? data.qidExpiry : null,
              passportNumber: data.identificationType === 'passport' ? data.passportNumber : null,
              passportCountry: data.identificationType === 'passport' ? data.passportCountry : null,
              passportExpiry: data.identificationType === 'passport' ? data.passportExpiry : null,
              hayyaVisaNumber: data.identificationType === 'passport' ? data.hayyaVisaNumber : null,
              hayyaVisaExpiry: data.identificationType === 'passport' ? data.hayyaVisaExpiry : null,
              hasBumpInAccess: data.hasBumpInAccess,
              bumpInStart: data.bumpInStart,
              bumpInEnd: data.bumpInEnd,
              hasLiveAccess: data.hasLiveAccess,
              liveStart: data.liveStart,
              liveEnd: data.liveEnd,
              hasBumpOutAccess: data.hasBumpOutAccess,
              bumpOutStart: data.bumpOutStart,
              bumpOutEnd: data.bumpOutEnd,
              status: data.status,
              qrCodeToken: qrCodeToken,
              approvedById: data.status === AccreditationStatus.APPROVED ? session.user.id : null,
              approvedAt: data.status === AccreditationStatus.APPROVED ? new Date() : null,
              projectId: data.projectId,
              createdById: session.user.id,
            },
          });
        }, {
          timeout: 5000, // Reduced timeout since we only do create operation now
        });

        // Success - break out of retry loop
        break;
      } catch (error: any) {
        attempts++;

        // Check if this is a unique constraint violation on accreditationNumber
        if (error.code === 'P2002' && error.meta?.target?.includes('accreditationNumber')) {
          if (attempts >= MAX_RETRIES) {
            console.error('Failed to generate unique accreditation number after multiple attempts');
            return NextResponse.json(
              { error: 'Failed to generate unique accreditation number. Please try again.' },
              { status: 500 }
            );
          }
          // Wait a small random time before retrying (10-50ms)
          await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 10));
          continue;
        }

        // If it's a different error, throw it
        throw error;
      }
    }

    if (!accreditation) {
      return NextResponse.json(
        { error: 'Failed to create accreditation' },
        { status: 500 }
      );
    }

    // Create history record
    await prisma.accreditationHistory.create({
      data: {
        accreditationId: accreditation.id,
        action: 'CREATED',
        newStatus: data.status,
        performedById: session.user.id,
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_CREATED',
      'accreditation',
      accreditation.id,
      {
        accreditationNumber: accreditation.accreditationNumber,
        name: `${accreditation.firstName} ${accreditation.lastName}`,
        organization: accreditation.organization,
      }
    );

    return NextResponse.json(
      { accreditation, message: 'Accreditation created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create accreditation error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      meta: (error as any)?.meta,
    });

    // Extract meaningful error message
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Check for specific Prisma errors
    if ((error as any)?.code === 'P2002') {
      errorMessage = 'A record with this information already exists';
    } else if ((error as any)?.code === 'P2003') {
      errorMessage = 'Invalid reference: The project or user does not exist';
    }

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
