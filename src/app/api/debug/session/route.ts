import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  return NextResponse.json({
    session,
    hasSession: !!session,
    hasUser: !!session?.user,
    hasRole: !!session?.user?.role,
    hasId: !!session?.user?.id,
    user: session?.user,
  });
}
