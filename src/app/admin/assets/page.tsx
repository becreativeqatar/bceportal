import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { AssetListTable } from '@/components/assets/asset-list-table';

export default async function AdminAssetsPage() {
  const session = await getServerSession(authOptions);

  if (process.env.NODE_ENV !== 'development' && (!session || session.user.role !== Role.ADMIN)) {
    redirect('/login');
  }

  // Fetch all assets with related data and stats
  const [assetsRaw, totalUsers, assetStats] = await Promise.all([
    prisma.asset.findMany({
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
    prisma.asset.aggregate({
      _count: { _all: true },
      _sum: { priceQAR: true },
    }),
  ]);

  // Convert Decimal to string for client component
  const assets = assetsRaw.map(asset => ({
    ...asset,
    price: asset.price ? asset.price.toString() : null,
    priceQAR: asset.priceQAR ? Number(asset.priceQAR) : null,
  }));

  // Calculate key figures
  const assignedAssets = assets.filter(a => a.assignedUserId).length;
  const totalValueQAR = Number(assetStats._sum.priceQAR || 0); // priceQAR is already in QAR

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Assets</h1>
                <p className="text-gray-600">
                  View, edit, and manage all company assets
                </p>
              </div>
              <Link href="/admin/assets/new">
                <Button>+ Add Asset</Button>
              </Link>
            </div>

            {/* Key Figures */}
            <div className="grid md:grid-cols-3 gap-3 mb-6">
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Total Assets</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-2xl font-bold text-gray-900">{assets.length}</div>
                  <p className="text-xs text-gray-500">All registered assets</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Assigned to Users</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {assignedAssets}
                    <span className="text-lg text-gray-500 ml-1">/{assets.length}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {assets.length > 0 ? Math.round((assignedAssets / assets.length) * 100) : 0}% assigned to {totalUsers} users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Total Value</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-2xl font-bold text-gray-900">
                    QAR {totalValueQAR.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-gray-500">Combined asset value</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Assets ({assets.length})</CardTitle>
              <CardDescription>
                Complete list of registered assets with filters and sorting
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assets.length > 0 ? (
                <AssetListTable assets={assets} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No assets found</p>
                  <Link href="/admin/assets/new">
                    <Button>Create your first asset</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}