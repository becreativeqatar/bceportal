import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminLayoutClient } from './layout-client';

// Cache badge counts for 60 seconds to reduce database load
// This significantly improves performance as these counts don't change frequently
const getCachedBadgeCounts = unstable_cache(
  async () => {
    const [
      pendingChangeRequests,
      pendingLeaveRequests,
      pendingSuppliers,
      pendingPurchaseRequests,
    ] = await Promise.all([
      prisma.profileChangeRequest.count({ where: { status: 'PENDING' } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.supplier.count({ where: { status: 'PENDING' } }),
      prisma.purchaseRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      pendingChangeRequests,
      pendingLeaveRequests,
      pendingSuppliers,
      pendingPurchaseRequests,
    };
  },
  ['admin-badge-counts'],
  {
    revalidate: 60, // Revalidate every 60 seconds
    tags: ['badge-counts'],
  }
);

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

  const badgeCounts = await getCachedBadgeCounts();

  return <AdminLayoutClient badgeCounts={badgeCounts}>{children}</AdminLayoutClient>;
}
