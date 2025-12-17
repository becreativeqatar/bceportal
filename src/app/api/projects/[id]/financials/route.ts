import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  calculateProjectFinancials,
  calculatePaymentSummary,
  calculateCategorySummaries
} from '@/lib/domains/projects/project/profitability';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/financials - Get project financial summary
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [financials, payments, categories] = await Promise.all([
      calculateProjectFinancials(id),
      calculatePaymentSummary(id),
      calculateCategorySummaries(id),
    ]);

    if (!financials) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...financials,
        payments,
        categories,
      },
    });
  } catch (error) {
    console.error('Error fetching financials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
