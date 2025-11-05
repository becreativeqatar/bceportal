import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rejectSupplierSchema } from '@/lib/validations/suppliers';
import { logAction } from '@/lib/activity';
import { Role } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check authentication - only ADMIN can reject
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = rejectSupplierSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { rejectionReason } = validation.data;

    // Check if supplier exists and is PENDING
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    if (existingSupplier.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only PENDING suppliers can be rejected' },
        { status: 400 }
      );
    }

    // Reject supplier
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason,
        approvedAt: null,
        approvedById: null,
      },
    });

    // Log the rejection activity
    await logAction(
      session.user.id,
      'SUPPLIER_REJECTED',
      'supplier',
      supplier.id,
      {
        suppCode: supplier.suppCode,
        name: supplier.name,
        rejectedBy: session.user.name || session.user.email,
        rejectionReason,
      }
    );

    return NextResponse.json({
      message: 'Supplier rejected',
      supplier,
    });

  } catch (error) {
    console.error('Reject supplier error:', error);
    return NextResponse.json(
      { error: 'Failed to reject supplier' },
      { status: 500 }
    );
  }
}
