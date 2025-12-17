import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────

export const ProjectStatus = z.enum([
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);

export const ClientType = z.enum(['INTERNAL', 'EXTERNAL', 'SUPPLIER']);

export const BudgetItemStatus = z.enum([
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

export const PaymentStatus = z.enum([
  'PENDING',
  'PARTIAL',
  'PAID',
  'DUE',
  'OVERDUE',
  'PENDING_REIMBURSEMENT',
  'CANCELLED',
]);

export const PaymentTrancheStatus = z.enum([
  'PENDING',
  'SCHEDULED',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
]);

export const RevenueStatus = z.enum([
  'DRAFT',
  'INVOICED',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
  'WRITTEN_OFF',
]);

export const AssetCostType = z.enum([
  'FULL_VALUE',
  'DEPRECIATED',
  'RENTAL_RATE',
  'CUSTOM',
  'NO_COST',
]);

// ─────────────────────────────────────────────────────────────────
// PROJECT SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectCreateSchema = z.object({
  code: z.string().min(1, 'Project code is required').max(50),
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  status: ProjectStatus.default('PLANNING'),

  // Client
  clientType: ClientType.default('INTERNAL'),
  supplierId: z.string().cuid().optional().nullable(),
  clientName: z.string().max(255).optional().nullable(),
  clientContact: z.string().max(255).optional().nullable(),

  // Contract
  contractValue: z.coerce.number().min(0).optional().nullable(),
  contractCurrency: z.string().default('QAR'),

  // Budget
  budgetAmount: z.coerce.number().min(0).optional().nullable(),
  budgetCurrency: z.string().default('QAR'),

  // Timeline
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),

  // Ownership
  managerId: z.string().cuid('Invalid manager ID'),
  documentHandler: z.string().max(255).optional().nullable(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
).refine(
  (data) => {
    if (data.clientType === 'SUPPLIER' && !data.supplierId) {
      return false;
    }
    return true;
  },
  { message: 'Supplier must be selected for Supplier client type', path: ['supplierId'] }
).refine(
  (data) => {
    if (data.clientType === 'EXTERNAL' && !data.clientName) {
      return false;
    }
    return true;
  },
  { message: 'Client name is required for external clients', path: ['clientName'] }
);

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// BUDGET CATEGORY SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const budgetCategoryCreateSchema = z.object({
  projectId: z.string().cuid(),
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  budgetedRevenue: z.coerce.number().min(0).optional().nullable(),
  budgetedCost: z.coerce.number().min(0).optional().nullable(),
});

export const budgetCategoryUpdateSchema = budgetCategoryCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type BudgetCategoryCreateInput = z.infer<typeof budgetCategoryCreateSchema>;
export type BudgetCategoryUpdateInput = z.infer<typeof budgetCategoryUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// BUDGET ITEM SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const budgetItemCreateSchema = z.object({
  projectId: z.string().cuid(),
  categoryId: z.string().cuid().optional().nullable(),
  costCode: z.string().min(1).max(20),
  description: z.string().min(1).max(500),
  sortOrder: z.coerce.number().int().min(0).default(0),

  // Amounts
  budgetedAmount: z.coerce.number().min(0).optional().nullable(),
  actualAmount: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().default('QAR'),

  // Supplier
  supplierId: z.string().cuid().optional().nullable(),
  supplierName: z.string().max(255).optional().nullable(),

  // Procurement
  purchaseRequestId: z.string().cuid().optional().nullable(),
  prNumber: z.string().max(50).optional().nullable(),
  lpoNumber: z.string().max(50).optional().nullable(),
  invoiceNumber: z.string().max(100).optional().nullable(),

  // Status
  paymentStatus: PaymentStatus.default('PENDING'),
  status: BudgetItemStatus.default('DRAFT'),

  // Notes
  notes: z.string().max(2000).optional().nullable(),
});

export const budgetItemUpdateSchema = budgetItemCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type BudgetItemCreateInput = z.infer<typeof budgetItemCreateSchema>;
export type BudgetItemUpdateInput = z.infer<typeof budgetItemUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// PAYMENT SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const paymentCreateSchema = z.object({
  budgetItemId: z.string().cuid(),
  tranche: z.coerce.number().int().min(1).max(10),
  amount: z.coerce.number().min(0),
  currency: z.string().default('QAR'),
  percentage: z.coerce.number().min(0).max(100).optional().nullable(),

  // Dates
  dueDate: z.coerce.date().optional().nullable(),
  paidDate: z.coerce.date().optional().nullable(),
  status: PaymentTrancheStatus.default('PENDING'),

  // Bank details
  bankIban: z.string().max(50).optional().nullable(),
  bankName: z.string().max(255).optional().nullable(),
  bankSwift: z.string().max(20).optional().nullable(),
  accountNumber: z.string().max(50).optional().nullable(),
  paymentMethod: z.string().max(100).optional().nullable(),

  // Reference
  reference: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const paymentUpdateSchema = paymentCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// REVENUE SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const revenueCreateSchema = z.object({
  projectId: z.string().cuid(),
  description: z.string().min(1).max(500),
  invoiceNumber: z.string().max(100).optional().nullable(),
  amount: z.coerce.number().min(0),
  currency: z.string().default('QAR'),

  invoiceDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  paidDate: z.coerce.date().optional().nullable(),
  status: RevenueStatus.default('DRAFT'),

  notes: z.string().max(2000).optional().nullable(),
});

export const revenueUpdateSchema = revenueCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export type RevenueCreateInput = z.infer<typeof revenueCreateSchema>;
export type RevenueUpdateInput = z.infer<typeof revenueUpdateSchema>;

// ─────────────────────────────────────────────────────────────────
// PROJECT ASSET ALLOCATION SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectAssetCreateSchema = z.object({
  projectId: z.string().cuid(),
  assetId: z.string().cuid(),
  costType: AssetCostType.default('FULL_VALUE'),
  customAmount: z.coerce.number().min(0).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
}).refine(
  (data) => {
    if (data.costType === 'CUSTOM' && !data.customAmount) {
      return false;
    }
    return true;
  },
  { message: 'Custom amount is required when cost type is CUSTOM', path: ['customAmount'] }
);

export type ProjectAssetCreateInput = z.infer<typeof projectAssetCreateSchema>;

// ─────────────────────────────────────────────────────────────────
// PROJECT SUBSCRIPTION ALLOCATION SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectSubscriptionCreateSchema = z.object({
  projectId: z.string().cuid(),
  subscriptionId: z.string().cuid(),
  allocationPercent: z.coerce.number().min(0).max(100).default(100),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type ProjectSubscriptionCreateInput = z.infer<typeof projectSubscriptionCreateSchema>;

// ─────────────────────────────────────────────────────────────────
// QUERY/FILTER SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const projectModuleQuerySchema = z.object({
  search: z.string().optional(),
  status: ProjectStatus.optional(),
  clientType: ClientType.optional(),
  managerId: z.string().cuid().optional(),
  startDateFrom: z.coerce.date().optional(),
  startDateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['code', 'name', 'status', 'startDate', 'endDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ProjectModuleQueryInput = z.infer<typeof projectModuleQuerySchema>;
