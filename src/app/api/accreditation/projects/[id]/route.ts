import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateAccreditationProjectSchema } from '@/lib/validations/accreditation';
import { logAction } from '@/lib/activity';
import { Role } from '@prisma/client';

// GET /api/accreditation/projects/[id] - Get single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const accreditationProject = await prisma.accreditationProject.findUnique({
      where: { id },
      include: {
        accreditations: {
          select: {
            id: true,
            accreditationNumber: true,
            firstName: true,
            lastName: true,
            status: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!accreditationProject) {
      return NextResponse.json(
        { error: 'Accreditation project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ accreditationProject });
  } catch (error) {
    console.error('Get accreditation project error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accreditation project' },
      { status: 500 }
    );
  }
}

// PUT /api/accreditation/projects/[id] - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const validation = updateAccreditationProjectSchema.safeParse(body);

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

    // Check if project exists
    const existing = await prisma.accreditationProject.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Accreditation project not found' },
        { status: 404 }
      );
    }

    // Update accreditation project
    const accreditationProject = await prisma.accreditationProject.update({
      where: { id },
      data: {
        ...(data.bumpInStart && { bumpInStart: data.bumpInStart }),
        ...(data.bumpInEnd && { bumpInEnd: data.bumpInEnd }),
        ...(data.liveStart && { liveStart: data.liveStart }),
        ...(data.liveEnd && { liveEnd: data.liveEnd }),
        ...(data.bumpOutStart && { bumpOutStart: data.bumpOutStart }),
        ...(data.bumpOutEnd && { bumpOutEnd: data.bumpOutEnd }),
        ...(data.accessGroups && { accessGroups: data.accessGroups }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_PROJECT_UPDATED',
      'accreditation_project',
      accreditationProject.id,
      {
        changes: data,
      }
    );

    return NextResponse.json({
      accreditationProject,
      message: 'Accreditation project updated successfully',
    });
  } catch (error) {
    console.error('Update accreditation project error:', error);
    return NextResponse.json(
      { error: 'Failed to update accreditation project' },
      { status: 500 }
    );
  }
}

// DELETE /api/accreditation/projects/[id] - Delete project
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

    // Check if project exists
    const existing = await prisma.accreditationProject.findUnique({
      where: { id },
      include: {
        accreditations: {
          where: {
            status: 'APPROVED',
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Accreditation project not found' },
        { status: 404 }
      );
    }

    // Check if there are approved accreditations
    if (existing.accreditations.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete project with ${existing.accreditations.length} approved accreditation(s)` },
        { status: 400 }
      );
    }

    // Delete accreditation project
    await prisma.accreditationProject.delete({
      where: { id },
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_PROJECT_DELETED',
      'accreditation_project',
      id,
      {}
    );

    return NextResponse.json({
      message: 'Accreditation project deleted successfully',
    });
  } catch (error) {
    console.error('Delete accreditation project error:', error);
    return NextResponse.json(
      { error: 'Failed to delete accreditation project' },
      { status: 500 }
    );
  }
}
