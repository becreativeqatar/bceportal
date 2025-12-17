import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { projectUpdateSchema } from '@/lib/validations/projects/project';
import { convertToQAR } from '@/lib/domains/projects/project/project-utils';
import { logAction, ActivityActions } from '@/lib/activity';
import { Role } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get single project with full details
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, name: true } },
        budgetCategories: {
          orderBy: { sortOrder: 'asc' },
        },
        budgetItems: {
          include: {
            category: true,
            supplier: { select: { id: true, name: true } },
            payments: { orderBy: { tranche: 'asc' } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        revenues: {
          orderBy: { invoiceDate: 'desc' },
        },
        _count: {
          select: {
            purchaseRequests: true,
            assetAllocations: true,
            subscriptionAllocations: true,
            taskBoards: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = projectUpdateSchema.parse({ ...body, id });

    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Convert to QAR if currency changed
    let contractValueQAR = data.contractValue;
    if (data.contractValue && data.contractCurrency && data.contractCurrency !== 'QAR') {
      contractValueQAR = await convertToQAR(data.contractValue, data.contractCurrency);
    }

    let budgetAmountQAR = data.budgetAmount;
    if (data.budgetAmount && data.budgetCurrency && data.budgetCurrency !== 'QAR') {
      budgetAmountQAR = await convertToQAR(data.budgetAmount, data.budgetCurrency);
    }

    const { id: _, ...updateData } = data;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...updateData,
        contractValueQAR,
        budgetAmountQAR,
      },
      include: {
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    await logAction(
      session.user.id,
      ActivityActions.PROJECT_UPDATED,
      'Project',
      project.id,
      { changes: updateData }
    );

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin only
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            budgetItems: true,
            purchaseRequests: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    await logAction(
      session.user.id,
      ActivityActions.PROJECT_DELETED,
      'Project',
      id,
      { code: existing.code, name: existing.name }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
