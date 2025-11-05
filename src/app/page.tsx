import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { getNextRenewalDate, getDaysUntilRenewal } from '@/lib/utils/renewal-date';
import { UpcomingRenewalsFilter } from '@/components/admin/upcoming-renewals-filter';
import { ActivityDetailPopup } from '@/components/admin/activity-detail-popup';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users to login (skip in development for easy testing)
  if (!session && process.env.NODE_ENV !== 'development') {
    redirect('/login');
  }

  // Redirect validators to their dedicated dashboard
  if (session?.user?.role === 'VALIDATOR') {
    redirect('/validator');
  }

  // Redirect employees to their dedicated dashboard
  if (session?.user?.role === 'EMPLOYEE') {
    redirect('/employee');
  }

  const isAdmin = session?.user?.role === 'ADMIN' || process.env.NODE_ENV === 'development';

  // Admin dashboard data
  let adminData = null;
  let statsData = null;

  if (isAdmin) {
    const [
      allSubscriptions,
      recentActivity,
      monthlySpendData,
      totalAssets,
      activeUsers,
      totalSubscriptions,
      totalSuppliers,
      pendingAccreditations,
      pendingSuppliers,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          renewalDate: { not: null },
        },
        include: {
          assignedUser: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.activityLog.findMany({
        take: 5,
        orderBy: { at: 'desc' },
        include: {
          actorUser: {
            select: { name: true, email: true },
          },
        },
      }),
      getMonthlySpendData(),
      prisma.asset.count(),
      prisma.user.count({ where: { role: { in: ['ADMIN', 'EMPLOYEE'] } } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.supplier.count(),
      prisma.accreditation.count({ where: { status: 'PENDING' } }),
      prisma.supplier.count({ where: { status: 'PENDING' } }),
    ]);

    statsData = {
      totalAssets,
      activeUsers,
      totalSubscriptions,
      totalSuppliers,
    };

    const subscriptionsWithNextRenewal = allSubscriptions.map(sub => {
      const nextRenewal = sub.renewalDate ? getNextRenewalDate(sub.renewalDate, sub.billingCycle) : null;
      const daysUntil = getDaysUntilRenewal(nextRenewal);
      return {
        id: sub.id,
        serviceName: sub.serviceName,
        costPerCycle: sub.costPerCycle ? Number(sub.costPerCycle) : null,
        costCurrency: sub.costCurrency,
        paymentMethod: sub.paymentMethod,
        status: sub.status,
        assignedUser: sub.assignedUser,
        nextRenewalDate: nextRenewal,
        daysUntilRenewal: daysUntil,
      };
    });

    adminData = {
      subscriptionsWithNextRenewal,
      recentActivity,
      monthlySpendData,
      pendingAccreditations,
      pendingSuppliers,
    };
  }

  async function getMonthlySpendData() {
    const months = [];
    const currentDate = new Date();

    const allSubscriptions = await prisma.subscription.findMany({
      where: {
        costPerCycle: { not: null },
        purchaseDate: { not: null },
      },
      select: {
        costPerCycle: true,
        costCurrency: true,
        costQAR: true,
        billingCycle: true,
        purchaseDate: true,
        renewalDate: true,
        status: true,
      },
    });

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);

      const assetSpend = await prisma.asset.aggregate({
        where: {
          purchaseDate: {
            gte: monthStart,
            lt: monthEnd,
          },
          priceQAR: { not: null },
        },
        _sum: { priceQAR: true },
      });

      let recurringSubscriptionSpend = 0;
      let newSubscriptionSpend = 0;

      allSubscriptions.forEach(sub => {
        if (!sub.costPerCycle || !sub.purchaseDate) return;

        const purchaseDate = new Date(sub.purchaseDate);
        const renewalDate = sub.renewalDate ? new Date(sub.renewalDate) : null;

        const costInQAR = sub.costQAR ? Number(sub.costQAR) :
                         (sub.costCurrency === 'QAR' ? Number(sub.costPerCycle) / 3.64 : Number(sub.costPerCycle));

        const isPurchasedThisMonth = purchaseDate >= monthStart && purchaseDate < monthEnd;
        const isActiveThisMonth = purchaseDate < monthEnd && sub.status === 'ACTIVE';

        if (isPurchasedThisMonth && sub.billingCycle === 'ONE_TIME') {
          newSubscriptionSpend += costInQAR;
        } else if (isActiveThisMonth && purchaseDate < monthStart) {
          if (sub.billingCycle === 'MONTHLY') {
            if (renewalDate) {
              const nextRenewal = getNextRenewalDate(renewalDate, sub.billingCycle);
              if (nextRenewal && new Date(nextRenewal) >= monthStart && new Date(nextRenewal) < monthEnd) {
                recurringSubscriptionSpend += costInQAR;
              }
            } else {
              recurringSubscriptionSpend += costInQAR;
            }
          } else if (sub.billingCycle === 'YEARLY') {
            if (renewalDate) {
              const nextRenewal = getNextRenewalDate(renewalDate, sub.billingCycle);
              if (nextRenewal && new Date(nextRenewal) >= monthStart && new Date(nextRenewal) < monthEnd) {
                recurringSubscriptionSpend += costInQAR;
              }
            }
          }
        } else if (isPurchasedThisMonth && sub.billingCycle !== 'ONE_TIME') {
          newSubscriptionSpend += costInQAR;
        }
      });

      const totalSubscriptionSpend = recurringSubscriptionSpend + newSubscriptionSpend;

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        assets: Number(assetSpend._sum.priceQAR || 0),
        subscriptions: totalSubscriptionSpend,
        recurringSubscriptions: recurringSubscriptionSpend,
        newSubscriptions: newSubscriptionSpend,
        total: Number(assetSpend._sum.priceQAR || 0) + totalSubscriptionSpend,
      });
    }

    return months;
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
        <div className="container mx-auto py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">
              Welcome to Be Creative Portal
            </h1>
            <p className="text-xl text-slate-200 mb-8">
              Your central hub for managing assets, suppliers, and accreditations
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">

          {/* Modules Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Quick Access Modules</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {isAdmin ? (
              <>
                {/* Assets */}
                <Link href="/admin/assets">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-4xl">📦</div>
                        {statsData && <div className="text-2xl font-bold text-slate-700">{statsData.totalAssets}</div>}
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Manage physical and digital assets</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Subscriptions */}
                <Link href="/admin/subscriptions">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-4xl">💳</div>
                        {statsData && <div className="text-2xl font-bold text-slate-700">{statsData.totalSubscriptions}</div>}
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Subscriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Track software licenses and renewals</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Suppliers */}
                <Link href="/admin/suppliers">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-4xl">🤝</div>
                        {statsData && <div className="text-2xl font-bold text-slate-700">{statsData.totalSuppliers}</div>}
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Suppliers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Manage vendors and suppliers</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Accreditation */}
                <Link href="/admin/accreditation">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">🎫</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Accreditation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Event badges and access control</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Users */}
                <Link href="/admin/users">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-4xl">👥</div>
                        {statsData && <div className="text-2xl font-bold text-slate-700">{statsData.activeUsers}</div>}
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Manage team members and assignments</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Reports */}
                <Link href="/admin/reports">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">📊</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Reports
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">View analytics and generate reports</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Settings */}
                <Link href="/admin/settings">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">⚙️</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">System configuration and data export/import</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </>
            ) : (
              <>
                <Link href="/employee/my-assets">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">👤💼</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        My Holdings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">View assets and subscriptions assigned to you</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/employee/assets">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">📦</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        All Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Browse all company assets</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/employee/subscriptions">
                  <Card className="group cursor-pointer hover:shadow-lg hover:border-slate-400 transition-all duration-200 bg-white border-gray-200 h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">💳</div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-slate-700 transition-colors">
                        All Subscriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-600">Browse all company subscriptions</CardDescription>
                      <div className="mt-4 flex items-center text-sm text-slate-600 font-medium group-hover:text-slate-800">
                        Open Module <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </>
            )}
          </div>

          {/* ATTENTION ITEMS SECTION - Admin Only */}
          {isAdmin && adminData && (
            <div className="mb-8 mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Needs Your Attention
              </h2>

              <div className="grid md:grid-cols-3 gap-4">

                {/* Upcoming Renewals */}
                <Card className="bg-white border-l-4 border-l-orange-500 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900">Upcoming Renewals</CardTitle>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {adminData.subscriptionsWithNextRenewal.filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal <= 30).length} Soon
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {adminData.subscriptionsWithNextRenewal
                        .filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal <= 30)
                        .sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0))
                        .slice(0, 3)
                        .map(sub => (
                          <div key={sub.id} className="flex justify-between">
                            <span className="text-gray-600">{sub.serviceName}</span>
                            <span className="text-orange-600 font-medium">{sub.daysUntilRenewal} days</span>
                          </div>
                        ))}
                      {adminData.subscriptionsWithNextRenewal.filter(s => s.daysUntilRenewal !== null && s.daysUntilRenewal <= 30).length === 0 && (
                        <p className="text-gray-500 text-sm">No upcoming renewals</p>
                      )}
                    </div>
                    <Link href="/admin/subscriptions">
                      <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                        View All Renewals →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Pending Approvals */}
                <Card className="bg-white border-l-4 border-l-red-500 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900">Pending Approvals</CardTitle>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {adminData.pendingAccreditations + adminData.pendingSuppliers} Waiting
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {adminData.pendingAccreditations > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Accreditations</span>
                          <span className="text-red-600 font-medium">{adminData.pendingAccreditations}</span>
                        </div>
                      )}
                      {adminData.pendingSuppliers > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Suppliers</span>
                          <span className="text-red-600 font-medium">{adminData.pendingSuppliers}</span>
                        </div>
                      )}
                      {adminData.pendingAccreditations === 0 && adminData.pendingSuppliers === 0 && (
                        <p className="text-gray-500 text-sm">No pending approvals</p>
                      )}
                    </div>
                    {adminData.pendingAccreditations > 0 ? (
                      <Link href="/admin/accreditation/projects">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          Review Accreditations →
                        </Button>
                      </Link>
                    ) : adminData.pendingSuppliers > 0 ? (
                      <Link href="/admin/suppliers">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          Review Suppliers →
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/admin/accreditation/projects">
                        <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                          View Approvals →
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-white border-l-4 border-l-green-500 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900">Recent Activity</CardTitle>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {adminData.recentActivity.length} Recent
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {adminData.recentActivity.slice(0, 3).map((activity, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 line-clamp-1">{activity.action}</span>
                        </div>
                      ))}
                      {adminData.recentActivity.length === 0 && (
                        <p className="text-gray-500 text-sm">No recent activity</p>
                      )}
                    </div>
                    <Link href="/admin/reports#activity-logs">
                      <Button variant="ghost" size="sm" className="w-full mt-4 text-slate-700 hover:bg-slate-50">
                        View Activity Log →
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
