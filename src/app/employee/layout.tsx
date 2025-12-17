import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { EmployeeLayoutClient } from './layout-client';

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users
  if (!session && process.env.NODE_ENV !== 'development') {
    redirect('/login');
  }

  // Redirect validators to their dashboard
  if (session?.user?.role === 'VALIDATOR') {
    redirect('/validator');
  }

  return <EmployeeLayoutClient>{children}</EmployeeLayoutClient>;
}
