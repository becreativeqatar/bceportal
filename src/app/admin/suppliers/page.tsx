import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { SupplierListTable } from '@/components/suppliers/supplier-list-table';

export default async function AdminSuppliersPage() {
  const session = await getServerSession(authOptions);

  if (process.env.NODE_ENV !== 'development' && (!session || session.user.role !== Role.ADMIN)) {
    redirect('/login');
  }

  // Fetch all suppliers with related data and stats
  const suppliers = await prisma.supplier.findMany({
    include: {
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          engagements: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate key figures
  const uniqueCategories = new Set(suppliers.map(s => s.category)).size;
  const totalEngagements = suppliers.reduce((sum, s) => sum + s._count.engagements, 0);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Suppliers</h1>
              <p className="text-gray-600">
                View, approve, and manage all supplier registrations
              </p>
            </div>
            <Link href="/suppliers/register" target="_blank">
              <Button>+ Register Supplier</Button>
            </Link>
          </div>

          {/* Key Figures */}
          <div className="grid md:grid-cols-3 gap-3 mb-6">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">Total Suppliers</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-gray-900">{suppliers.length}</div>
                <p className="text-xs text-gray-500">Registered in database</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">Categories</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-blue-600">{uniqueCategories}</div>
                <p className="text-xs text-gray-500">Unique supplier categories</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">Total Engagements</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-purple-600">{totalEngagements}</div>
                <p className="text-xs text-gray-500">Recorded interactions</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Suppliers ({suppliers.length})</CardTitle>
            <CardDescription>
              Complete list of registered suppliers with status and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suppliers.length > 0 ? (
              <SupplierListTable suppliers={suppliers} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No suppliers found</p>
                <Link href="/suppliers/register" target="_blank">
                  <Button>Register your first supplier</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
