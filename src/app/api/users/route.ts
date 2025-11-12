import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createUserSchema } from '@/lib/validations/users';
import { logAction, ActivityActions } from '@/lib/activity';
import { withErrorHandler } from '@/lib/http/handler';

async function getUsersHandler(request: NextRequest) {
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
}

export const GET = withErrorHandler(getUsersHandler, { requireAdmin: true, rateLimit: true });

async function createUserHandler(request: NextRequest) {
  // Parse and validate request body
  const body = await request.json();
  const validation = createUserSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues
    }, { status: 400 });
  }

  const { name, email, role } = validation.data;

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
  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      emailVerified: null,
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

  // Log activity (need session for user ID)
  const session = await getServerSession(authOptions);
  if (session) {
    await logAction(
      session.user.id,
      ActivityActions.USER_CREATED,
      'User',
      user.id,
      { userName: user.name, userEmail: user.email, userRole: user.role }
    );
  }

  return NextResponse.json(user, { status: 201 });
}

export const POST = withErrorHandler(createUserHandler, { requireAdmin: true, rateLimit: true });