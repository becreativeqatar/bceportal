import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Activity, TrendingUp, Users, Package, CreditCard, Building2, IdCard } from 'lucide-react';

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);

  if (process.env.NODE_ENV !== 'development' && (!session || session.user.role !== Role.ADMIN)) {
    redirect('/login');
  }

  // Get comprehensive stats from ALL modules
  const [
    // Assets
    totalAssets,
    assetsByStatus,
    assetsByType,
    assetsValue,

    // Subscriptions
    totalSubscriptions,
    subscriptionsByStatus,
    subscriptionsByBilling,
    subscriptionsCost,
    upcomingRenewals,

    // Suppliers
    totalSuppliers,
    suppliersByStatus,
    suppliersByCategory,
    totalEngagements,

    // Users
    totalUsers,
    usersByRole,
    activeUsers,

    // Accreditations
    totalAccreditations,
    accreditationsByStatus,
    accreditationsByProject,
    totalScans,
    validScans,
    invalidScans,

    // Activity Logs
    recentActivity,
    activityByAction,
    activityByEntity,
  ] = await Promise.all([
    // Assets queries
    prisma.asset.count(),
    prisma.asset.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.asset.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
      take: 10,
    }),
    prisma.asset.aggregate({
      _sum: { priceQAR: true },
    }),

    // Subscriptions queries
    prisma.subscription.count(),
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.subscription.groupBy({
      by: ['billingCycle'],
      _count: { billingCycle: true },
    }),
    prisma.subscription.aggregate({
      _sum: { costQAR: true },
    }),
    prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        renewalDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // Suppliers queries
    prisma.supplier.count(),
    prisma.supplier.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.supplier.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 10,
    }),
    prisma.supplierEngagement.count(),

    // Users queries
    prisma.user.count(),
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
      },
    }),

    // Accreditations queries
    prisma.accreditation.count(),
    prisma.accreditation.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.accreditation.groupBy({
      by: ['projectId'],
      _count: { projectId: true },
      orderBy: { _count: { projectId: 'desc' } },
      take: 5,
    }),
    prisma.accreditationScan.count(),
    prisma.accreditationScan.count({ where: { wasValid: true } }),
    prisma.accreditationScan.count({ where: { wasValid: false } }),

    // Activity Logs queries
    prisma.activityLog.findMany({
      take: 20,
      orderBy: { at: 'desc' },
      include: {
        actorUser: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.activityLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),
    prisma.activityLog.groupBy({
      by: ['entityType'],
      _count: { entityType: true },
      orderBy: { _count: { entityType: 'desc' } },
    }),
  ]);

  // Get project names for accreditation stats
  const projectIds = accreditationsByProject.map(a => a.projectId);
  const projects = await prisma.accreditationProject.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true },
  });

  const accreditationProjectStats = accreditationsByProject.map(stat => {
    const project = projects.find(p => p.id === stat.projectId);
    return {
      projectName: project?.name || 'Unknown Project',
      count: stat._count.projectId,
    };
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
              <p className="text-gray-600">
                Comprehensive system reports across all modules with activity logs
              </p>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Assets</CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalAssets}</div>
              <p className="text-xs text-gray-500 mt-1">
                Value: QAR {(Number(assetsValue._sum.priceQAR || 0)).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Subscriptions</CardTitle>
                <CreditCard className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalSubscriptions}</div>
              <p className="text-xs text-gray-500 mt-1">
                Monthly: QAR {(Number(subscriptionsCost._sum.costQAR || 0)).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Suppliers</CardTitle>
                <Building2 className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalSuppliers}</div>
              <p className="text-xs text-gray-500 mt-1">
                {totalEngagements} total engagements
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
                <Users className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{activeUsers}</div>
              <p className="text-xs text-gray-500 mt-1">
                {totalUsers} total (including deleted)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Assets Reports */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            Assets Reports
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Assets by Status</CardTitle>
                <CardDescription>Current status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assetsByStatus.map((item) => (
                    <div key={item.status} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item.status.replace('_', ' ').toLowerCase()}</span>
                      <span className="font-semibold">{item._count.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Asset Types</CardTitle>
                <CardDescription>Most common asset categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assetsByType.map((item) => (
                    <div key={item.type} className="flex justify-between items-center">
                      <span className="text-gray-700">{item.type}</span>
                      <span className="font-semibold">{item._count.type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Subscriptions Reports */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-green-500" />
            Subscriptions Reports
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>By Status</CardTitle>
                <CardDescription>Subscription status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subscriptionsByStatus.map((item) => (
                    <div key={item.status} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item.status.toLowerCase()}</span>
                      <span className="font-semibold">{item._count.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Billing Cycle</CardTitle>
                <CardDescription>Payment frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subscriptionsByBilling.map((item) => (
                    <div key={item.billingCycle} className="flex justify-between items-center">
                      <span className="text-gray-700">{formatBillingCycle(item.billingCycle)}</span>
                      <span className="font-semibold">{item._count.billingCycle}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Renewals</CardTitle>
                <CardDescription>Next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-orange-600">{upcomingRenewals}</div>
                <p className="text-sm text-gray-600 mt-2">Subscriptions due for renewal</p>
                <Link href="/admin/subscriptions" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                  View details →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Suppliers Reports */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-purple-500" />
            Suppliers Reports
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Suppliers by Status</CardTitle>
                <CardDescription>Approval status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suppliersByStatus.map((item) => (
                    <div key={item.status} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item.status.toLowerCase()}</span>
                      <span className="font-semibold">{item._count.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Supplier Categories</CardTitle>
                <CardDescription>Most common categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suppliersByCategory.map((item) => (
                    <div key={item.category} className="flex justify-between items-center">
                      <span className="text-gray-700">{item.category}</span>
                      <span className="font-semibold">{item._count.category}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Users Reports */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-500" />
            Users Reports
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
              <CardDescription>System role distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                {usersByRole.map((item) => (
                  <div key={item.role} className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{item._count.role}</div>
                    <div className="text-sm text-gray-600 capitalize">{item.role.toLowerCase()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accreditation Reports */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <IdCard className="h-6 w-6 text-indigo-500" />
            Accreditation Reports
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Accreditations by Status</CardTitle>
                <CardDescription>Current status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {accreditationsByStatus.map((item) => (
                    <div key={item.status} className="flex justify-between items-center">
                      <span className="capitalize text-gray-700">{item.status.replace('_', ' ').toLowerCase()}</span>
                      <span className="font-semibold">{item._count.status}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Project</CardTitle>
                <CardDescription>Top 5 projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {accreditationProjectStats.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-700">{item.projectName}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Total Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{totalScans}</div>
                <p className="text-sm text-gray-600 mt-1">All QR validations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Valid Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{validScans}</div>
                <p className="text-sm text-gray-600 mt-1">Approved access</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Invalid Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{invalidScans}</div>
                <p className="text-sm text-gray-600 mt-1">Denied access</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Logs */}
        <div id="activity-logs" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-6 w-6 text-teal-500" />
            Activity Logs
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>By Action Type</CardTitle>
                <CardDescription>Most common actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activityByAction.slice(0, 5).map((item) => (
                    <div key={item.action} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{item.action}</span>
                      <span className="font-semibold text-gray-900">{item._count.action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Entity Type</CardTitle>
                <CardDescription>Activity distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activityByEntity.map((item) => (
                    <div key={item.entityType} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{item.entityType}</span>
                      <span className="font-semibold text-gray-900">{item._count.entityType}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Activities</CardTitle>
                <CardDescription>System-wide events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-teal-600">{activityByAction.reduce((sum, item) => sum + item._count.action, 0)}</div>
                <p className="text-sm text-gray-600 mt-2">All tracked actions</p>
                <Link href="/admin/activity" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                  View full log →
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Last 20 system events across all modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className="flex-shrink-0 mt-1">
                      <Activity className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.entityType} • {activity.actorUser ? (activity.actorUser.name || activity.actorUser.email) : 'System'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Link href="/admin/activity" className="text-sm text-blue-600 hover:underline font-medium">
                  View complete activity log →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
