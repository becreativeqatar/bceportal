import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { UserListClient } from '@/components/users/user-list-client';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (process.env.NODE_ENV !== 'development' && (!session || !session.user || session.user.role !== Role.ADMIN)) {
    redirect('/login');
  }

  // Fetch all users (including deleted) with their asset and subscription counts
  const users = await prisma.user.findMany({
    include: {
      deletedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          assets: true,
          subscriptions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const activeUsers = users.filter(u => !u.deletedAt);
  const deletedUsers = users.filter(u => u.deletedAt);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Users</h1>
                <p className="text-gray-600">
                  View and manage all system users and their access levels
                </p>
              </div>
              <Link href="/admin/users/new">
                <Button>+ Add User</Button>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeUsers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activeUsers.filter(u => u.role === 'ADMIN').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Validators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activeUsers.filter(u => u.role === 'VALIDATOR').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activeUsers.filter(u => u.role === 'EMPLOYEE' && !u.isTemporaryStaff && !u.isSystemAccount).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Deleted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{deletedUsers.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <UserListClient users={users as any} currentUserId={session?.user?.id || ''} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}