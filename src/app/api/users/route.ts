import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createUserSchema } from '@/lib/validations/users';
import { logAction, ActivityActions } from '@/lib/activity';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    
    // Build where clause
    const where: any = {};
    if (role) where.role = role;

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            assets: true,
            subscriptions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);

  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { name, email, role, isTemporaryStaff } = validation.data;

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create user
    // Note: Password is not stored as users authenticate via Azure AD or OAuth
    // emailVerified is set to null - they'll verify on first login
    // Temporary staff don't need email verification or login access and default to EMPLOYEE role
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: role || Role.EMPLOYEE,
        isTemporaryStaff: isTemporaryStaff || false,
        emailVerified: isTemporaryStaff ? null : null,
      },
      include: {
        _count: {
          select: {
            assets: true,
            subscriptions: true,
          },
        },
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      ActivityActions.USER_CREATED,
      'User',
      user.id,
      { userName: user.name, userEmail: user.email, userRole: user.role }
    );

    return NextResponse.json(user, { status: 201 });

  } catch (error) {
    console.error('User POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}