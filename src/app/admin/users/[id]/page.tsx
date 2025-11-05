import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { getUserSubscriptionHistory } from '@/lib/subscription-lifecycle';
import { getUserAssetHistory } from '@/lib/asset-lifecycle';
import { UserSubscriptionHistory } from '@/components/users/user-subscription-history';
import { UserAssetHistory } from '@/components/users/user-asset-history';
import { UserDetailActions } from '@/components/users/user-detail-actions';
import { formatDateTime } from '@/lib/date-format';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (process.env.NODE_ENV !== 'development' && (!session || session.user.role !== Role.ADMIN)) {
    redirect('/login');
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      deletedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // Get complete subscription history (including inactive ones)
  const subscriptionHistory = await getUserSubscriptionHistory(id);

  // Get complete asset history (including past assignments)
  const assetHistory = await getUserAssetHistory(id);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'EMPLOYEE':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">User Details</h1>
              <p className="text-gray-600">
                Complete information for {user.name || user.email}
              </p>
            </div>
            <UserDetailActions
              userId={user.id}
              userName={user.name || ''}
              userEmail={user.email}
              currentUserId={session?.user.id || ''}
              isSystemAccount={user.isSystemAccount}
            />
          </div>
        </div>

        <div className="grid gap-6">
          {/* Deletion Information - Show if user is deleted */}
          {user.deletedAt && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900">User Deleted</CardTitle>
                <CardDescription className="text-red-700">
                  This user has been soft-deleted and can no longer access the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Deleted On</Label>
                    <div className="text-base font-semibold text-red-900">
                      {formatDateTime(user.deletedAt)}
                    </div>
                  </div>
                  <div>
                    <Label>Deleted By</Label>
                    <div className="text-base font-semibold text-red-900">
                      {user.deletedBy ? (user.deletedBy.name || user.deletedBy.email) : 'Unknown'}
                    </div>
                  </div>
                  {user.deletionNotes && (
                    <div className="md:col-span-2">
                      <Label>Deletion Notes</Label>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700 bg-white p-4 rounded border border-red-200">
                        {user.deletionNotes}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>
                Core user details and account information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <div className="text-lg font-semibold">{user.name || 'Not provided'}</div>
                  </div>
                  {!user.isSystemAccount && (
                    <div>
                      <Label>Email Address</Label>
                      <div className="text-base font-mono">{user.email}</div>
                    </div>
                  )}
                  <div>
                    <Label>Role</Label>
                    <div>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Account Status</Label>
                    <div>
                      {user.isSystemAccount ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                          🏢 System Account
                        </Badge>
                      ) : user.isTemporaryStaff ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                          Temporary Staff
                        </Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription History */}
          <UserSubscriptionHistory subscriptions={subscriptionHistory as any} />

          {/* Asset History */}
          <UserAssetHistory assets={assetHistory as any} />

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                System timestamps and tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Account Created</Label>
                  <div>{formatDateTime(user.createdAt)}</div>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <div>{formatDateTime(user.updatedAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-gray-700 mb-1">{children}</div>;
}