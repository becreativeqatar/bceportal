import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateTemplate } from '@/lib/csv-utils';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Define template headers with examples
    const headers = [
      { key: 'assetTag', header: 'Asset Tag', example: 'LAP-2024-001 (leave empty to auto-generate)' },
      { key: 'name', header: 'Name *', example: 'MacBook Pro 16"' },
      { key: 'type', header: 'Type *', example: 'Laptop' },
      { key: 'serial', header: 'Serial Number', example: 'SN123456789' },
      { key: 'vendor', header: 'Vendor', example: 'Apple' },
      { key: 'purchaseDate', header: 'Purchase Date (YYYY-MM-DD)', example: '2024-01-15' },
      { key: 'price', header: 'Price', example: '3640' },
      { key: 'priceCurrency', header: 'Currency (QAR/USD)', example: 'QAR' },
      { key: 'warrantyExpiry', header: 'Warranty Expiry (YYYY-MM-DD)', example: '2026-01-15' },
      { key: 'status', header: 'Status (IN_USE/SPARE/REPAIR/DISPOSED)', example: 'IN_USE' },
      { key: 'projectTitle', header: 'Project Title', example: 'Website Redesign' },
    ];

    // Generate template
    const templateBuffer = await generateTemplate(headers);

    // Return template file
    const filename = `assets_import_template.xlsx`;

    return new NextResponse(templateBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
