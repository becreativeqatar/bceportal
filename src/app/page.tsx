import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Package, CreditCard, Building2, Briefcase,
  ClipboardList, FileCheck, ShoppingCart, Settings,
  BarChart3, Activity, CalendarDays, Wallet, FileText,
  AlertTriangle, Clock, CheckCircle2, ArrowRight
} from 'lucide-react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session && process.env.NODE_ENV !== 'development') {
    redirect('/login');
  }

  if (session?.user?.role === 'VALIDATOR') {
    redirect('/validator');
  }

  if (session?.user?.role === 'EMPLOYEE') {
    redirect('/employee');
  }

  const isAdmin = session?.user?.role === 'ADMIN' || process.env.NODE_ENV === 'development';

  // Fetch counts for admin
  let stats = {
    employees: 0,
    assets: 0,
    subscriptions: 0,
    suppliers: 0,
    projects: 0,
    pendingLeave: 0,
    pendingPR: 0,
    pendingSuppliers: 0,
    pendingAccreditations: 0,
  };

  if (isAdmin) {
    const [
      employees,
      assets,
      subscriptions,
      suppliers,
      projects,
      pendingLeave,
      pendingPR,
      pendingSuppliers,
      pendingAccreditations,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['ADMIN', 'EMPLOYEE'] } } }),
      prisma.asset.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.supplier.count(),
      prisma.project.count(),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.purchaseRequest.count({ where: { status: 'PENDING' } }),
      prisma.supplier.count({ where: { status: 'PENDING' } }),
      prisma.accreditation.count({ where: { status: 'PENDING' } }),
    ]);

    stats = {
      employees,
      assets,
      subscriptions,
      suppliers,
      projects,
      pendingLeave,
      pendingPR,
      pendingSuppliers,
      pendingAccreditations,
    };
  }

  const totalPending = stats.pendingLeave + stats.pendingPR + stats.pendingSuppliers + stats.pendingAccreditations;

  const modules = [
    { name: 'Employees', href: '/admin/employees', icon: Users, count: stats.employees, color: 'bg-emerald-500' },
    { name: 'Assets', href: '/admin/assets', icon: Package, count: stats.assets, color: 'bg-blue-500' },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard, count: stats.subscriptions, color: 'bg-purple-500' },
    { name: 'Suppliers', href: '/admin/suppliers', icon: Building2, count: stats.suppliers, badge: stats.pendingSuppliers, color: 'bg-orange-500' },
    { name: 'Projects', href: '/admin/projects', icon: Briefcase, count: stats.projects, color: 'bg-indigo-500' },
    { name: 'Task Boards', href: '/admin/tasks', icon: ClipboardList, color: 'bg-pink-500' },
    { name: 'Accreditation', href: '/admin/accreditation', icon: FileCheck, badge: stats.pendingAccreditations, color: 'bg-teal-500' },
    { name: 'Purchase Requests', href: '/admin/purchase-requests', icon: ShoppingCart, badge: stats.pendingPR, color: 'bg-amber-500' },
    { name: 'Leave Management', href: '/admin/leave', icon: CalendarDays, badge: stats.pendingLeave, color: 'bg-cyan-500' },
    { name: 'Payroll', href: '/admin/payroll', icon: Wallet, color: 'bg-green-500' },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3, color: 'bg-slate-500' },
    { name: 'Settings', href: '/admin/settings', icon: Settings, color: 'bg-gray-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Welcome to Be Creative Portal</h1>
          <p className="text-slate-300">Manage your business operations in one place</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        {isAdmin && totalPending > 0 && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-amber-800 font-medium">
              You have {totalPending} pending item{totalPending > 1 ? 's' : ''} requiring attention
            </span>
          </div>
        )}

        {/* Module Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.href} href={module.href}>
                <Card className="h-full hover:shadow-lg transition-all cursor-pointer group border-gray-200 hover:border-gray-300">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${module.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {module.badge !== undefined && module.badge > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {module.badge}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-slate-700 mb-1">
                      {module.name}
                    </h3>
                    {module.count !== undefined && (
                      <p className="text-2xl font-bold text-gray-700">{module.count}</p>
                    )}
                    <div className="mt-2 flex items-center text-xs text-gray-500 group-hover:text-gray-700">
                      Open <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Link href="/admin/employees/new">
            <Card className="hover:shadow-md transition-all cursor-pointer border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="font-medium text-gray-700">Add Employee</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/assets/new">
            <Card className="hover:shadow-md transition-all cursor-pointer border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium text-gray-700">Add Asset</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/subscriptions/new">
            <Card className="hover:shadow-md transition-all cursor-pointer border-gray-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                </div>
                <span className="font-medium text-gray-700">Add Subscription</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
