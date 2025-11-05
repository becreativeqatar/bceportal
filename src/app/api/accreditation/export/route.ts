import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all accreditations with related data
    const accreditations = await prisma.accreditation.findMany({
      include: {
        project: true,
        createdBy: true,
        approvedBy: true,
        revokedBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to CSV
    const headers = [
      'ID',
      'Accreditation Number',
      'Project Code',
      'Project Name',
      'First Name',
      'Last Name',
      'Organization',
      'Job Title',
      'Access Group',
      'QID Number',
      'QID Expiry',
      'Passport Number',
      'Passport Country',
      'Passport Expiry',
      'Hayya Visa Number',
      'Hayya Visa Expiry',
      'Status',
      'Has Bump-In Access',
      'Bump-In Start',
      'Bump-In End',
      'Has Live Access',
      'Live Start',
      'Live End',
      'Has Bump-Out Access',
      'Bump-Out Start',
      'Bump-Out End',
      'Created By',
      'Created At',
      'Approved By',
      'Approved At',
      'Revoked By',
      'Revoked At',
      'Revocation Reason',
    ];

    const rows = accreditations.map(acc => [
      acc.id,
      acc.accreditationNumber,
      acc.project?.code || '',
      acc.project?.name || '',
      acc.firstName,
      acc.lastName,
      acc.organization,
      acc.jobTitle,
      acc.accessGroup,
      acc.qidNumber || '',
      acc.qidExpiry ? new Date(acc.qidExpiry).toISOString().split('T')[0] : '',
      acc.passportNumber || '',
      acc.passportCountry || '',
      acc.passportExpiry ? new Date(acc.passportExpiry).toISOString().split('T')[0] : '',
      acc.hayyaVisaNumber || '',
      acc.hayyaVisaExpiry ? new Date(acc.hayyaVisaExpiry).toISOString().split('T')[0] : '',
      acc.status,
      acc.hasBumpInAccess ? 'Yes' : 'No',
      acc.bumpInStart ? new Date(acc.bumpInStart).toISOString().split('T')[0] : '',
      acc.bumpInEnd ? new Date(acc.bumpInEnd).toISOString().split('T')[0] : '',
      acc.hasLiveAccess ? 'Yes' : 'No',
      acc.liveStart ? new Date(acc.liveStart).toISOString().split('T')[0] : '',
      acc.liveEnd ? new Date(acc.liveEnd).toISOString().split('T')[0] : '',
      acc.hasBumpOutAccess ? 'Yes' : 'No',
      acc.bumpOutStart ? new Date(acc.bumpOutStart).toISOString().split('T')[0] : '',
      acc.bumpOutEnd ? new Date(acc.bumpOutEnd).toISOString().split('T')[0] : '',
      acc.createdBy ? (acc.createdBy.name || acc.createdBy.email) : '',
      new Date(acc.createdAt).toISOString(),
      acc.approvedBy ? (acc.approvedBy.name || acc.approvedBy.email) : '',
      acc.approvedAt ? new Date(acc.approvedAt).toISOString() : '',
      acc.revokedBy ? (acc.revokedBy.name || acc.revokedBy.email) : '',
      acc.revokedAt ? new Date(acc.revokedAt).toISOString() : '',
      acc.revocationReason || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="accreditations_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Accreditations export error:', error);
    return NextResponse.json(
      { error: 'Failed to export accreditations' },
      { status: 500 }
    );
  }
}
