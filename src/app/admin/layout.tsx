import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminLayoutClient } from './layout-client';

async function getBadgeCounts() {
  const [
    pendingChangeRequests,
    pendingLeaveRequests,
    pendingSuppliers,
    pendingAccreditations,
    pendingPurchaseRequests,
  ] = await Promise.all([
    prisma.profileChangeRequest.count({ where: { status: 'PENDING' } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.supplier.count({ where: { status: 'PENDING' } }),
    prisma.accreditation.count({ where: { status: 'PENDING' } }),
    prisma.purchaseRequest.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    pendingChangeRequests,
    pendingLeaveRequests,
    pendingSuppliers,
    pendingAccreditations,
    pendingPurchaseRequests,
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users
  if (!session && process.env.NODE_ENV !== 'development') {
    redirect('/login');
  }

  // Redirect non-admin users
  if (session?.user?.role !== 'ADMIN' && process.env.NODE_ENV !== 'development') {
    redirect('/employee');
  }

  const badgeCounts = await getBadgeCounts();

  return <AdminLayoutClient badgeCounts={badgeCounts}>{children}</AdminLayoutClient>;
}
