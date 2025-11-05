import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateAccreditationSchema } from '@/lib/validations/accreditation';
import { logAction } from '@/lib/activity';
import { Role } from '@prisma/client';

// GET /api/accreditation/records/[id] - Get single accreditation
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

    const accreditation = await prisma.accreditation.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        history: {
          include: {
            performedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!accreditation) {
      return NextResponse.json(
        { error: 'Accreditation not found' },
        { status: 404 }
      );
    }

    // Normalize profilePhotoUrl: convert empty strings or invalid URLs to null
    const normalizedAccreditation = {
      ...accreditation,
      profilePhotoUrl: accreditation.profilePhotoUrl &&
                      (accreditation.profilePhotoUrl.startsWith('http://') || accreditation.profilePhotoUrl.startsWith('https://'))
                      ? accreditation.profilePhotoUrl
                      : null,
    };

    return NextResponse.json({ accreditation: normalizedAccreditation });
  } catch (error) {
    console.error('Get accreditation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accreditation' },
      { status: 500 }
    );
  }
}

// PUT /api/accreditation/records/[id] - Update accreditation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const validation = updateAccreditationSchema.safeParse(body);

    if (!validation.success) {
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

    // Check if accreditation exists
    const existing = await prisma.accreditation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Accreditation not found' },
        { status: 404 }
      );
    }

    // If editing an APPROVED record, reset status to PENDING for re-approval
    let statusUpdate = {};
    let qrTokenUpdate = {};
    if (existing.status === 'APPROVED') {
      statusUpdate = { status: 'PENDING' };
      qrTokenUpdate = { qrCodeToken: null }; // Clear QR token since it needs re-approval
    }

    // Validate access group if provided
    if (data.accessGroup) {
      const project = await prisma.accreditationProject.findUnique({
        where: { id: existing.projectId },
      });
      if (project) {
        const accessGroups = project.accessGroups as string[];
        if (!accessGroups.includes(data.accessGroup)) {
          return NextResponse.json(
            { error: 'Invalid access group for this project' },
            { status: 400 }
          );
        }
      }
    }

    // Store old values for history
    const oldValues = {
      firstName: existing.firstName,
      lastName: existing.lastName,
      organization: existing.organization,
      jobTitle: existing.jobTitle,
      accessGroup: existing.accessGroup,
      status: existing.status,
    };

    // Update accreditation
    const accreditation = await prisma.accreditation.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.organization && { organization: data.organization }),
        ...(data.jobTitle && { jobTitle: data.jobTitle }),
        ...(data.accessGroup && { accessGroup: data.accessGroup }),
        ...(data.profilePhotoUrl !== undefined && { profilePhotoUrl: data.profilePhotoUrl }),
        ...(data.qidNumber !== undefined && { qidNumber: data.qidNumber }),
        ...(data.qidExpiry !== undefined && { qidExpiry: data.qidExpiry }),
        ...(data.passportNumber !== undefined && { passportNumber: data.passportNumber }),
        ...(data.passportCountry !== undefined && { passportCountry: data.passportCountry }),
        ...(data.passportExpiry !== undefined && { passportExpiry: data.passportExpiry }),
        ...(data.hayyaVisaNumber !== undefined && { hayyaVisaNumber: data.hayyaVisaNumber }),
        ...(data.hayyaVisaExpiry !== undefined && { hayyaVisaExpiry: data.hayyaVisaExpiry }),
        ...(data.hasBumpInAccess !== undefined && { hasBumpInAccess: data.hasBumpInAccess }),
        ...(data.bumpInStart !== undefined && { bumpInStart: data.bumpInStart }),
        ...(data.bumpInEnd !== undefined && { bumpInEnd: data.bumpInEnd }),
        ...(data.hasLiveAccess !== undefined && { hasLiveAccess: data.hasLiveAccess }),
        ...(data.liveStart !== undefined && { liveStart: data.liveStart }),
        ...(data.liveEnd !== undefined && { liveEnd: data.liveEnd }),
        ...(data.hasBumpOutAccess !== undefined && { hasBumpOutAccess: data.hasBumpOutAccess }),
        ...(data.bumpOutStart !== undefined && { bumpOutStart: data.bumpOutStart }),
        ...(data.bumpOutEnd !== undefined && { bumpOutEnd: data.bumpOutEnd }),
        ...(data.status && { status: data.status }),
        ...statusUpdate, // Reset to PENDING if editing approved record
        ...qrTokenUpdate, // Clear QR token if editing approved record
      },
    });

    // Create history record
    await prisma.accreditationHistory.create({
      data: {
        accreditationId: accreditation.id,
        action: 'UPDATED',
        oldStatus: oldValues.status,
        newStatus: accreditation.status,
        changes: data,
        performedById: session.user.id,
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_UPDATED',
      'accreditation',
      accreditation.id,
      {
        accreditationNumber: accreditation.accreditationNumber,
        changes: data,
      }
    );

    return NextResponse.json({
      accreditation,
      message: 'Accreditation updated successfully',
    });
  } catch (error) {
    console.error('Update accreditation error:', error);
    return NextResponse.json(
      { error: 'Failed to update accreditation' },
      { status: 500 }
    );
  }
}

// DELETE /api/accreditation/records/[id] - Delete accreditation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if accreditation exists
    const existing = await prisma.accreditation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Accreditation not found' },
        { status: 404 }
      );
    }

    // Delete accreditation (cascades to history)
    await prisma.accreditation.delete({
      where: { id },
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_DELETED',
      'accreditation',
      id,
      {
        accreditationNumber: existing.accreditationNumber,
        name: `${existing.firstName} ${existing.lastName}`,
      }
    );

    return NextResponse.json({
      message: 'Accreditation deleted successfully',
    });
  } catch (error) {
    console.error('Delete accreditation error:', error);
    return NextResponse.json(
      { error: 'Failed to delete accreditation' },
      { status: 500 }
    );
  }
}
