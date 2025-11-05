import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { arrayToCSV } from '@/lib/csv-utils';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all users with related data
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            assets: true,
            subscriptions: true,
          },
        },
        deletedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data for CSV
    const csvData = users.map(user => ({
      name: user.name || '',
      email: user.email,
      role: user.role,
      isTemporaryStaff: user.isTemporaryStaff ? 'Yes' : 'No',
      isSystemAccount: user.isSystemAccount ? 'Yes' : 'No',
      emailVerified: user.emailVerified ? 'Yes' : 'No',
      assignedAssets: user._count.assets,
      assignedSubscriptions: user._count.subscriptions,
      deletedAt: user.deletedAt ? user.deletedAt.toISOString().split('T')[0] : '',
      deletedBy: user.deletedBy ? (user.deletedBy.name || user.deletedBy.email) : '',
      deletionNotes: user.deletionNotes || '',
      image: user.image || '',
      createdAt: user.createdAt.toISOString().split('T')[0],
      updatedAt: user.updatedAt.toISOString().split('T')[0],
    }));

    // Define CSV headers
    const headers = [
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Role' },
      { key: 'isTemporaryStaff', header: 'Temporary Staff' },
      { key: 'isSystemAccount', header: 'System Account' },
      { key: 'emailVerified', header: 'Email Verified' },
      { key: 'assignedAssets', header: 'Assigned Assets' },
      { key: 'assignedSubscriptions', header: 'Assigned Subscriptions' },
      { key: 'deletedAt', header: 'Deleted At' },
      { key: 'deletedBy', header: 'Deleted By' },
      { key: 'deletionNotes', header: 'Deletion Notes' },
      { key: 'image', header: 'Profile Image URL' },
      { key: 'createdAt', header: 'Created At' },
      { key: 'updatedAt', header: 'Updated At' },
    ];

    // Generate CSV
    const csvBuffer = await arrayToCSV(csvData, headers);

    // Return CSV file
    const filename = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(csvBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Users export error:', error);
    return NextResponse.json({ error: 'Failed to export users' }, { status: 500 });
  }
}
