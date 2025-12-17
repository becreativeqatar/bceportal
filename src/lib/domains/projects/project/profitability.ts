import { prisma } from '@/lib/prisma';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface CostBreakdown {
  purchaseRequests: {
    count: number;
    totalQAR: number;
  };
  budgetItems: {
    count: number;
    budgetedQAR: number;
    actualQAR: number;
  };
  assets: {
    count: number;
    totalQAR: number;
  };
  subscriptions: {
    count: number;
    totalQAR: number;
    monthlyQAR: number;
  };
}

export interface RevenueBreakdown {
  contractValueQAR: number;
  invoicedQAR: number;
  paidQAR: number;
  pendingQAR: number;
  overdueQAR: number;
}

export interface ProjectFinancials {
  projectId: string;
  projectCode: string;
  projectName: string;

  // Revenue
  revenue: RevenueBreakdown;

  // Costs
  costs: CostBreakdown;
  totalCostQAR: number;

  // Budget
  budgetedCostQAR: number;
  actualCostQAR: number;
  budgetVarianceQAR: number;
  budgetUtilizationPercent: number;

  // Profitability
  grossProfitQAR: number;
  grossMarginPercent: number;
  targetProfitQAR: number;
  actualProfitQAR: number;

  // Status indicators
  isProfitable: boolean;
  isOverBudget: boolean;
}

export interface PaymentSummary {
  totalDueQAR: number;
  paidQAR: number;
  pendingQAR: number;
  overdueQAR: number;
  pendingReimbursementQAR: number;
  byStatus: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────
// MAIN CALCULATION FUNCTION
// ─────────────────────────────────────────────────────────────────

export async function calculateProjectFinancials(projectId: string): Promise<ProjectFinancials | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      budgetItems: {
        include: {
          payments: true,
        },
      },
      revenues: true,
      purchaseRequests: {
        where: { status: 'APPROVED' },
      },
      assetAllocations: {
        include: { asset: true },
      },
      subscriptionAllocations: {
        include: { subscription: true },
      },
    },
  });

  if (!project) return null;

  // ─── Calculate Revenue ───
  const contractValueQAR = project.contractValueQAR?.toNumber() || 0;

  const revenueStats = project.revenues.reduce(
    (acc, rev) => {
      const amount = rev.amountQAR.toNumber();
      acc.invoiced += amount;
      if (rev.status === 'PAID') acc.paid += amount;
      if (rev.status === 'OVERDUE') acc.overdue += amount;
      if (['DRAFT', 'INVOICED', 'PARTIALLY_PAID'].includes(rev.status)) {
        acc.pending += amount;
      }
      return acc;
    },
    { invoiced: 0, paid: 0, pending: 0, overdue: 0 }
  );

  // ─── Calculate Budget Item Costs ───
  const budgetItemStats = project.budgetItems.reduce(
    (acc, item) => {
      acc.count++;
      acc.budgeted += item.budgetedAmount?.toNumber() || 0;
      acc.actual += item.actualAmountQAR?.toNumber() || item.actualAmount?.toNumber() || 0;
      return acc;
    },
    { count: 0, budgeted: 0, actual: 0 }
  );

  // ─── Calculate PR Costs ───
  const prCosts = project.purchaseRequests.reduce(
    (acc, pr) => {
      acc.count++;
      acc.total += pr.totalAmountQAR?.toNumber() || 0;
      return acc;
    },
    { count: 0, total: 0 }
  );

  // ─── Calculate Asset Costs ───
  const assetCosts = project.assetAllocations.reduce(
    (acc, pa) => {
      acc.count++;
      let cost = 0;
      switch (pa.costType) {
        case 'FULL_VALUE':
          cost = pa.asset.priceQAR?.toNumber() || 0;
          break;
        case 'CUSTOM':
          cost = pa.customAmountQAR?.toNumber() || pa.customAmount?.toNumber() || 0;
          break;
        case 'NO_COST':
          cost = 0;
          break;
        default:
          cost = pa.asset.priceQAR?.toNumber() || 0;
      }
      acc.total += cost;
      return acc;
    },
    { count: 0, total: 0 }
  );

  // ─── Calculate Subscription Costs ───
  const subscriptionCosts = project.subscriptionAllocations.reduce(
    (acc, ps) => {
      acc.count++;
      const fullCost = ps.subscription.costQAR?.toNumber() || 0;
      const allocated = fullCost * (ps.allocationPercent.toNumber() / 100);
      acc.total += allocated;
      acc.monthly += allocated; // Assuming monthly for now
      return acc;
    },
    { count: 0, total: 0, monthly: 0 }
  );

  // ─── Aggregate Totals ───
  const budgetedCostQAR = project.budgetAmountQAR?.toNumber() || budgetItemStats.budgeted;
  const actualCostQAR = budgetItemStats.actual;
  const totalCostQAR = actualCostQAR + prCosts.total + assetCosts.total + subscriptionCosts.total;

  const budgetVarianceQAR = budgetedCostQAR - actualCostQAR;
  const budgetUtilizationPercent = budgetedCostQAR > 0
    ? Math.round((actualCostQAR / budgetedCostQAR) * 100 * 10) / 10
    : 0;

  const grossProfitQAR = contractValueQAR - actualCostQAR;
  const grossMarginPercent = contractValueQAR > 0
    ? Math.round((grossProfitQAR / contractValueQAR) * 100 * 10) / 10
    : 0;

  const targetProfitQAR = contractValueQAR - budgetedCostQAR;
  const actualProfitQAR = contractValueQAR - actualCostQAR;

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,

    revenue: {
      contractValueQAR,
      invoicedQAR: revenueStats.invoiced,
      paidQAR: revenueStats.paid,
      pendingQAR: revenueStats.pending,
      overdueQAR: revenueStats.overdue,
    },

    costs: {
      purchaseRequests: { count: prCosts.count, totalQAR: prCosts.total },
      budgetItems: {
        count: budgetItemStats.count,
        budgetedQAR: budgetItemStats.budgeted,
        actualQAR: budgetItemStats.actual,
      },
      assets: { count: assetCosts.count, totalQAR: assetCosts.total },
      subscriptions: {
        count: subscriptionCosts.count,
        totalQAR: subscriptionCosts.total,
        monthlyQAR: subscriptionCosts.monthly,
      },
    },
    totalCostQAR,

    budgetedCostQAR,
    actualCostQAR,
    budgetVarianceQAR,
    budgetUtilizationPercent,

    grossProfitQAR,
    grossMarginPercent,
    targetProfitQAR,
    actualProfitQAR,

    isProfitable: grossProfitQAR > 0,
    isOverBudget: actualCostQAR > budgetedCostQAR,
  };
}

// ─────────────────────────────────────────────────────────────────
// PAYMENT SUMMARY
// ─────────────────────────────────────────────────────────────────

export async function calculatePaymentSummary(projectId: string): Promise<PaymentSummary> {
  const payments = await prisma.projectPayment.findMany({
    where: {
      budgetItem: { projectId },
    },
  });

  const summary: PaymentSummary = {
    totalDueQAR: 0,
    paidQAR: 0,
    pendingQAR: 0,
    overdueQAR: 0,
    pendingReimbursementQAR: 0,
    byStatus: {},
  };

  const now = new Date();

  for (const payment of payments) {
    const amount = payment.amountQAR.toNumber();
    summary.totalDueQAR += amount;

    // By status
    summary.byStatus[payment.status] = (summary.byStatus[payment.status] || 0) + amount;

    if (payment.status === 'PAID') {
      summary.paidQAR += amount;
    } else if (payment.status === 'PENDING' || payment.status === 'SCHEDULED') {
      if (payment.dueDate && payment.dueDate < now) {
        summary.overdueQAR += amount;
      } else {
        summary.pendingQAR += amount;
      }
    }
  }

  // Check budget items for pending reimbursement
  const reimbursementItems = await prisma.projectBudgetItem.findMany({
    where: {
      projectId,
      paymentStatus: 'PENDING_REIMBURSEMENT',
    },
  });

  summary.pendingReimbursementQAR = reimbursementItems.reduce(
    (sum, item) => sum + (item.actualAmountQAR?.toNumber() || item.actualAmount?.toNumber() || 0),
    0
  );

  return summary;
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY SUMMARIES
// ─────────────────────────────────────────────────────────────────

export interface CategorySummary {
  id: string;
  code: string;
  name: string;
  budgetedRevenue: number;
  budgetedCost: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  itemCount: number;
}

export async function calculateCategorySummaries(projectId: string): Promise<CategorySummary[]> {
  const categories = await prisma.projectBudgetCategory.findMany({
    where: { projectId },
    include: {
      items: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  return categories.map((cat) => {
    const actualCost = cat.items.reduce(
      (sum, item) => sum + (item.actualAmountQAR?.toNumber() || item.actualAmount?.toNumber() || 0),
      0
    );
    const budgetedCost = cat.budgetedCost?.toNumber() || 0;
    const variance = budgetedCost - actualCost;
    const variancePercent = budgetedCost > 0
      ? Math.round((variance / budgetedCost) * 100 * 10) / 10
      : 0;

    return {
      id: cat.id,
      code: cat.code,
      name: cat.name,
      budgetedRevenue: cat.budgetedRevenue?.toNumber() || 0,
      budgetedCost,
      actualCost,
      variance,
      variancePercent,
      itemCount: cat.items.length,
    };
  });
}
