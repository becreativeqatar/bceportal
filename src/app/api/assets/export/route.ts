import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { arrayToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-utils';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all assets with related data
    const assets = await prisma.asset.findMany({
      include: {
        assignedUser: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data for CSV
    const csvData = assets.map(asset => ({
      assetTag: asset.assetTag || '',
      type: asset.type,
      category: asset.category || '',
      brand: asset.brand || '',
      model: asset.model,
      serial: asset.serial || '',
      configuration: asset.configuration || '',
      supplier: asset.supplier || '',
      invoiceNumber: asset.invoiceNumber || '',
      location: asset.location || '',
      purchaseDate: formatDateForCSV(asset.purchaseDate),
      price: formatCurrencyForCSV(asset.price ? Number(asset.price) : null),
      priceCurrency: asset.priceCurrency || '',
      priceQAR: formatCurrencyForCSV(asset.priceQAR ? Number(asset.priceQAR) : null),
      warrantyExpiry: formatDateForCSV(asset.warrantyExpiry),
      status: asset.status,
      acquisitionType: asset.acquisitionType,
      transferNotes: asset.transferNotes || '',
      notes: asset.notes || '',
      assignedUserName: asset.assignedUser?.name || '',
      assignedUserEmail: asset.assignedUser?.email || '',
      createdAt: formatDateForCSV(asset.createdAt),
      updatedAt: formatDateForCSV(asset.updatedAt),
    }));

    // Define CSV headers
    const headers = [
      { key: 'assetTag' as const, header: 'Asset Tag' },
      { key: 'type' as const, header: 'Type' },
      { key: 'category' as const, header: 'Category' },
      { key: 'brand' as const, header: 'Brand' },
      { key: 'model' as const, header: 'Model' },
      { key: 'serial' as const, header: 'Serial Number' },
      { key: 'configuration' as const, header: 'Configuration/Specs' },
      { key: 'supplier' as const, header: 'Supplier' },
      { key: 'invoiceNumber' as const, header: 'Invoice/PO Number' },
      { key: 'location' as const, header: 'Location' },
      { key: 'purchaseDate' as const, header: 'Purchase Date' },
      { key: 'price' as const, header: 'Price' },
      { key: 'priceCurrency' as const, header: 'Currency' },
      { key: 'priceQAR' as const, header: 'Price (QAR)' },
      { key: 'warrantyExpiry' as const, header: 'Warranty Expiry' },
      { key: 'status' as const, header: 'Status' },
      { key: 'acquisitionType' as const, header: 'Acquisition Type' },
      { key: 'transferNotes' as const, header: 'Transfer Notes' },
      { key: 'notes' as const, header: 'Notes' },
      { key: 'assignedUserName' as const, header: 'Assigned User Name' },
      { key: 'assignedUserEmail' as const, header: 'Assigned User Email' },
      { key: 'createdAt' as const, header: 'Created At' },
      { key: 'updatedAt' as const, header: 'Updated At' },
    ];

    // Generate CSV
    const csvBuffer = await arrayToCSV(csvData, headers);

    // Return CSV file
    const filename = `assets_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(csvBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Asset export error:', error);
    return NextResponse.json({ error: 'Failed to export assets' }, { status: 500 });
  }
}
