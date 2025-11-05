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
      { key: 'serviceName', header: 'Service Name *', example: 'Adobe Creative Cloud' },
      { key: 'accountId', header: 'Account ID/Email', example: 'team@company.com' },
      { key: 'vendor', header: 'Vendor', example: 'Adobe' },
      { key: 'purchaseDate', header: 'Purchase Date (YYYY-MM-DD)', example: '2024-01-01' },
      { key: 'renewalDate', header: 'Renewal Date (YYYY-MM-DD)', example: '2025-01-01' },
      { key: 'billingCycle', header: 'Billing Cycle (MONTHLY/YEARLY/ONE_TIME)', example: 'YEARLY' },
      { key: 'costPerCycle', header: 'Cost Per Cycle', example: '599.88' },
      { key: 'usageType', header: 'Usage Type (OFFICE/PROJECT)', example: 'OFFICE' },
      { key: 'autoRenew', header: 'Auto Renew (Yes/No)', example: 'Yes' },
      { key: 'paymentMethod', header: 'Payment Method', example: 'Credit Card' },
      { key: 'notes', header: 'Notes', example: 'Team license for 5 users' },
    ];

    // Generate template
    const templateBuffer = await generateTemplate(headers);

    // Return template file
    const filename = `subscriptions_import_template.xlsx`;

    return new NextResponse(templateBuffer, {
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
