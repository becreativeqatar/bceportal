import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  CreditCard,
  Calendar,
  ShoppingCart,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  UserCircle,
  Building2,
  Search,
} from 'lucide-react';
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
    // Get all data in parallel
    const [
      subscriptionHistory,
      assetHistory,
      purchaseRequests,
      assignedTasks,
      hrProfile,
    ] = await Promise.all([
      getUserSubscriptionHistory(session.user.id),
      getUserAssetHistory(session.user.id),
      // Get user's purchase requests
      prisma.purchaseRequest.findMany({
        where: { requesterId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: { select: { items: true } },
        },
      }),
      // Get tasks assigned to user
      prisma.taskAssignee.findMany({
        where: { userId: session.user.id },
        include: {
          task: {
            include: {
              column: {
                include: {
                  board: { select: { id: true, title: true } },
                },
              },
              _count: {
                select: { checklist: true, comments: true },
              },
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
        take: 10,
      }),
      // Get HR profile for document expiry alerts
      prisma.hRProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          qidNumber: true,
          qidExpiry: true,
          passportNumber: true,
          passportExpiry: true,
          healthCardExpiry: true,
        },
      }),
    ]);

    // Calculate stats
    const activeAssets = assetHistory.filter((a: any) => a.isCurrentlyAssigned);
    const activeSubscriptions = subscriptionHistory.filter((s: any) => s.status === 'ACTIVE');
    const pendingPurchaseRequests = purchaseRequests.filter((pr) => pr.status === 'PENDING');
    const incompleteTasks = assignedTasks.filter((t) => !t.task.isCompleted);

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
      .filter(Boolean);

    // Calculate document expiry alerts
    const today = new Date();
    const documentAlerts: { type: string; expiry: Date; daysLeft: number }[] = [];

    if (hrProfile) {
      const checkExpiry = (date: Date | null, type: string) => {
        if (date) {
          const daysLeft = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 90) {
            documentAlerts.push({ type, expiry: date, daysLeft });
          }
        }
      };

      checkExpiry(hrProfile.qidExpiry, 'QID');
      checkExpiry(hrProfile.passportExpiry, 'Passport');
      checkExpiry(hrProfile.healthCardExpiry, 'Health Card');
    }

    documentAlerts.sort((a, b) => a.daysLeft - b.daysLeft);

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {session.user.name}!
            </h1>
            <p className="text-gray-600 text-sm">
              Here&apos;s your workspace overview
            </p>
          </div>

          {/* Document Alert Banner */}
          {documentAlerts.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800">Document Expiry Alert</p>
                <p className="text-sm text-amber-700">
                  {documentAlerts.length === 1
                    ? `Your ${documentAlerts[0].type} ${documentAlerts[0].daysLeft <= 0 ? 'has expired' : `expires in ${documentAlerts[0].daysLeft} days`}`
                    : `You have ${documentAlerts.length} documents expiring soon`}
                </p>
              </div>
              <Link href="/profile">
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  View Details →
                </Button>
              </Link>
            </div>
          )}

          {/* PRIMARY SECTION: Tasks + Purchase Requests */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* My Tasks Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-0 border-b">
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <CheckSquare className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">My Tasks</h2>
                      <p className="text-sm text-gray-500">{incompleteTasks.length} active tasks</p>
                    </div>
                  </div>
                  {incompleteTasks.length > 0 && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      {incompleteTasks.length} active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {incompleteTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm">No pending tasks assigned to you</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incompleteTasks.slice(0, 4).map((t) => (
                      <Link
                        key={t.task.id}
                        href={`/admin/tasks/boards/${t.task.column.board.id}`}
                        className="block"
                      >
                        <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                            t.task.priority === 'URGENT' ? 'bg-red-500' :
                            t.task.priority === 'HIGH' ? 'bg-orange-500' :
                            t.task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{t.task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {t.task.column.title}
                              </Badge>
                              <span className="text-xs text-gray-500 truncate">
                                {t.task.column.board.title}
                              </span>
                            </div>
                          </div>
                          {t.task.dueDate && (
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatDate(t.task.dueDate)}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="px-6 py-3 border-t bg-gray-50 rounded-b-lg">
                <Link href="/admin/tasks" className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
                  View All Tasks
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>

            {/* Purchase Requests Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-0 border-b">
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Purchase Requests</h2>
                      <p className="text-sm text-gray-500">Your submitted requests</p>
                    </div>
                  </div>
                  {pendingPurchaseRequests.length > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      {pendingPurchaseRequests.length} pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {purchaseRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No purchase requests yet</p>
                    <p className="text-sm">Create your first request</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseRequests.slice(0, 4).map((pr) => (
                      <Link
                        key={pr.id}
                        href={`/employee/purchase-requests/${pr.id}`}
                        className="block"
                      >
                        <div className="flex items-start justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-gray-900 truncate">{pr.title}</p>
                              <Badge
                                variant={
                                  pr.status === 'APPROVED' ? 'default' :
                                  pr.status === 'REJECTED' ? 'destructive' :
                                  pr.status === 'PENDING' ? 'secondary' : 'outline'
                                }
                                className={`text-xs ${
                                  pr.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                  pr.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''
                                }`}
                              >
                                {pr.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {pr.referenceNumber} • {pr._count.items} item(s)
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatDate(pr.createdAt)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="px-6 py-3 border-t bg-gray-50 rounded-b-lg flex items-center justify-between">
                <Link href="/employee/purchase-requests" className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/employee/purchase-requests/new">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                    + New Request
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* SECONDARY STATS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* My Holdings - Combined Assets & Subscriptions */}
            <Link href="/employee/my-assets">
              <Card className="p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">My Holdings</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-600">
                        <span className="font-bold text-blue-600">{activeAssets.length}</span> Assets
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-xs text-gray-600">
                        <span className="font-bold text-emerald-600">{activeSubscriptions.length}</span> Subscriptions
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Card>
            </Link>

            {/* Renewals - with names */}
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">Renewals in 30 days</p>
                  {upcomingRenewals.length === 0 ? (
                    <p className="text-xs text-amber-600 mt-1">No upcoming renewals</p>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      {upcomingRenewals.slice(0, 3).map((sub: any) => (
                        <p key={sub.id} className="text-xs text-amber-700 truncate">
                          • {sub.serviceName} ({sub.daysUntilRenewal}d)
                        </p>
                      ))}
                      {upcomingRenewals.length > 3 && (
                        <p className="text-xs text-amber-600 font-medium">
                          +{upcomingRenewals.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Suppliers */}
            <Link href="/employee/suppliers">
              <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-indigo-700">Suppliers</p>
                    <p className="text-xs text-indigo-600">Browse Directory</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-indigo-400" />
                </div>
              </Card>
            </Link>
          </div>

          {/* QUICK LINKS */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-gray-500 font-medium">Quick Links:</span>
              <Link href="/employee/assets" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
                <Search className="h-4 w-4" />
                Browse Assets
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/employee/subscriptions" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                Browse Subscriptions
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/profile" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
                <UserCircle className="h-4 w-4" />
                My Profile
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in EmployeeDashboard:', error);
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Error Loading Dashboard</h2>
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
