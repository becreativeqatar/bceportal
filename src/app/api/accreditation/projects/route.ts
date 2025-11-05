import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAccreditationProjectSchema } from '@/lib/validations/accreditation';
import { logAction } from '@/lib/activity';
import { Role } from '@prisma/client';

// GET /api/accreditation/projects - List all accreditation projects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const projects = await prisma.accreditationProject.findMany({
      where: isActive !== null ? { isActive: isActive === 'true' } : undefined,
      include: {
        _count: {
          select: {
            accreditations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Get accreditation projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accreditation projects' },
      { status: 500 }
    );
  }
}

// POST /api/accreditation/projects - Create new accreditation project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createAccreditationProjectSchema.safeParse(body);

    if (!validation.success) {
      // Format validation errors for better user experience
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

    // Check if project code already exists
    const existing = await prisma.accreditationProject.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Project code "${data.code}" already exists. Please use a different code.` },
        { status: 400 }
      );
    }

    // Create accreditation project
    const accreditationProject = await prisma.accreditationProject.create({
      data: {
        name: data.name,
        code: data.code,
        bumpInStart: data.bumpInStart,
        bumpInEnd: data.bumpInEnd,
        liveStart: data.liveStart,
        liveEnd: data.liveEnd,
        bumpOutStart: data.bumpOutStart,
        bumpOutEnd: data.bumpOutEnd,
        accessGroups: data.accessGroups,
        isActive: data.isActive,
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      'ACCREDITATION_PROJECT_CREATED',
      'accreditation_project',
      accreditationProject.id,
      {
        name: data.name,
        code: data.code,
      }
    );

    return NextResponse.json(
      { accreditationProject, message: 'Accreditation project created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create accreditation project error:', error);
    return NextResponse.json(
      { error: 'Failed to create accreditation project' },
      { status: 500 }
    );
  }
}
