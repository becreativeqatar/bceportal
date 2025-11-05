import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { supplierQuerySchema } from '@/lib/validations/suppliers';
import { Role } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = supplierQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { q, status, category, p, ps, sort, order } = validation.data;

    // Build where clause based on role
    const where: any = {};

    // EMPLOYEE can only see APPROVED suppliers
    // ADMIN can see all suppliers
    if (session.user.role === Role.EMPLOYEE) {
      where.status = 'APPROVED';
    } else if (status) {
      // Admin can filter by status
      where.status = status;
    }

    // Apply search filter
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { suppCode: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Apply category filter
    if (category) {
      where.category = category;
    }

    // Calculate pagination
    const skip = (p - 1) * ps;

    // Fetch suppliers
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { [sort]: order },
        take: ps,
        skip,
        include: {
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              engagements: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return NextResponse.json({
      suppliers,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
      },
    });

  } catch (error) {
    console.error('Supplier list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}
