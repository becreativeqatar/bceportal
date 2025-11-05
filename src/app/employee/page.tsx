import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Package, FileText, Users, Calendar } from 'lucide-react';
import { getUserSubscriptionHistory } from '@/lib/subscription-lifecycle';
import { getUserAssetHistory } from '@/lib/asset-lifecycle';
import { getNextRenewalDate, getDaysUntilRenewal } from '@/lib/utils/renewal-date';
import { formatDate } from '@/lib/date-format';

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Redirect if not an employee
  if (session.user.role !== 'EMPLOYEE') {
    redirect('/');
  }

  try {
    // Get user's subscription and asset history
    const [subscriptionHistory, assetHistory] = await Promise.all([
      getUserSubscriptionHistory(session.user.id),
      getUserAssetHistory(session.user.id),
    ]);

    // Get user's recent activity
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        actorUserId: session.user.id,
      },
      take: 5,
      orderBy: { at: 'desc' },
      include: {
        actorUser: {
          select: { name: true, email: true },
        },
      },
    });

    // Calculate stats
    const activeAssets = assetHistory.filter((a: any) => a.isCurrentlyAssigned);
    const activeSubscriptions = subscriptionHistory.filter((s: any) => s.status === 'ACTIVE');

    // Get upcoming renewals for user's subscriptions
    const upcomingRenewals = activeSubscriptions
      .map((sub: any) => {
        if (!sub.currentPeriod?.renewalDate) return null;
        const nextRenewal = getNextRenewalDate(sub.currentPeriod.renewalDate, sub.billingCycle);
        const daysUntil = getDaysUntilRenewal(nextRenewal);
        if (daysUntil === null || daysUntil > 30) return null;
        return {
          ...sub,
          nextRenewalDate: nextRenewal,
          daysUntilRenewal: daysUntil,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.daysUntilRenewal - b.daysUntilRenewal);

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {session.user.name}!
            </h1>
            <p className="text-gray-600">
              Here&apos;s an overview of your assets and subscriptions
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Link href="/employee/my-assets?tab=assets">
              <Card className="cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-200">
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-sm font-medium text-gray-600">My Assets</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 px-5">
                  <div className="text-3xl font-bold text-blue-600">{activeAssets.length}</div>
                  <p className="text-sm text-gray-500 mt-1">Currently assigned</p>
                  {activeAssets.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 font-medium mb-1">Preview:</p>
                      {activeAssets.slice(0, 2).map((asset: any) => (
                        <p key={asset.id} className="text-xs text-gray-500 truncate">
                          • {asset.assetTag || asset.model}
                        </p>
                      ))}
                      {activeAssets.length > 2 && (
                        <p className="text-xs text-blue-600 mt-1">
                          +{activeAssets.length - 2} more
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Link href="/employee/my-assets?tab=subscriptions">
              <Card className="cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all duration-200">
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-sm font-medium text-gray-600">My Subscriptions</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 px-5">
                  <div className="text-3xl font-bold text-emerald-600">{activeSubscriptions.length}</div>
                  <p className="text-sm text-gray-500 mt-1">Active services</p>
                  {activeSubscriptions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 font-medium mb-1">Preview:</p>
                      {activeSubscriptions.slice(0, 2).map((sub: any) => (
                        <p key={sub.id} className="text-xs text-gray-500 truncate">
                          • {sub.serviceName}
                        </p>
                      ))}
                      {activeSubscriptions.length > 2 && (
                        <p className="text-xs text-emerald-600 mt-1">
                          +{activeSubscriptions.length - 2} more
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-sm font-medium text-gray-600">Upcoming Renewals</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <div className="text-3xl font-bold text-orange-600">{upcomingRenewals.length}</div>
                <p className="text-sm text-gray-500 mt-1">In next 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-sm font-medium text-gray-600">Recent Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <div className="text-3xl font-bold text-purple-600">{recentActivity.length}</div>
                <p className="text-sm text-gray-500 mt-1">Last 5 actions</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and navigation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/employee/my-assets">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    View My Holdings
                  </Button>
                </Link>
                <Link href="/employee/assets">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Browse All Assets
                  </Button>
                </Link>
                <Link href="/employee/subscriptions">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Browse All Subscriptions
                  </Button>
                </Link>
                <Link href="/employee/suppliers">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    View Suppliers
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Upcoming Renewals */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Renewals</CardTitle>
                <CardDescription>Subscriptions renewing soon</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingRenewals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No upcoming renewals in the next 30 days</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingRenewals.slice(0, 5).map((sub: any) => (
                      <div key={sub.id} className="border-l-4 border-orange-400 pl-3 py-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{sub.serviceName}</p>
                            <p className="text-xs text-gray-600">{sub.vendor || 'Unknown vendor'}</p>
                          </div>
                          <Badge variant={sub.daysUntilRenewal <= 7 ? 'destructive' : 'secondary'}>
                            {sub.daysUntilRenewal === 0 ? 'Today' : `${sub.daysUntilRenewal}d`}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Renews: {formatDate(sub.nextRenewalDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="border-l-2 border-gray-300 pl-3 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-600">{activity.entityType || 'General'}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDate(activity.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in EmployeeDashboard:', error);
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Error Loading Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">An error occurred while loading your dashboard. Please try again later.</p>
              <p className="text-sm text-gray-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}
