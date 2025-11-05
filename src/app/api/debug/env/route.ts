import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/debug/env - Check environment variable and session
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const response = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        email: session?.user?.email || 'NO SESSION',
        role: session?.user?.role || 'NO ROLE',
      },
      adminEmails: process.env.ADMIN_EMAILS || 'NOT SET',
      isAdmin: session?.user?.email && process.env.ADMIN_EMAILS?.split(',').includes(session.user.email),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Debug env error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch environment info', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
