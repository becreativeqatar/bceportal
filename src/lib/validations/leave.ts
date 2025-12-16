import { z } from 'zod';
import { LeaveStatus, LeaveRequestType } from '@prisma/client';

// ===== Leave Type Schemas =====

export const createLeaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#3B82F6'),
  defaultDays: z.number().int().min(0, 'Default days must be 0 or more').default(0),
  requiresApproval: z.boolean().default(true),
  requiresDocument: z.boolean().default(false),
  isPaid: z.boolean().default(true),
  isActive: z.boolean().default(true),
  maxConsecutiveDays: z.number().int().min(1).optional().nullable(),
  minNoticeDays: z.number().int().min(0).default(0),
  allowCarryForward: z.boolean().default(false),
  maxCarryForwardDays: z.number().int().min(0).optional().nullable(),
}).refine(
  (data) => {
    // If allowCarryForward is true, maxCarryForwardDays should be specified
    if (data.allowCarryForward && !data.maxCarryForwardDays) {
      return false;
    }
    return true;
  },
  {
    message: 'Max carry forward days is required when carry forward is allowed',
    path: ['maxCarryForwardDays'],
  }
);

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial();

// ===== Leave Request Schemas =====

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  requestType: z.nativeEnum(LeaveRequestType).default('FULL_DAY'),
  reason: z.string().max(1000, 'Reason is too long').optional().nullable(),
  documentUrl: z.string().url('Invalid document URL').optional().nullable(),
  emergencyContact: z.string().max(100, 'Emergency contact name is too long').optional().nullable(),
  emergencyPhone: z.string().max(20, 'Emergency phone is too long').optional().nullable(),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start <= end;
  },
  {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  }
).refine(
  (data) => {
    // For half-day requests, start and end date must be the same
    if (data.requestType !== 'FULL_DAY') {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start.toDateString() === end.toDateString();
    }
    return true;
  },
  {
    message: 'Half-day requests must be for a single day',
    path: ['endDate'],
  }
);

export const updateLeaveRequestSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  requestType: z.nativeEnum(LeaveRequestType).optional(),
  reason: z.string().max(1000, 'Reason is too long').optional().nullable(),
  documentUrl: z.string().url('Invalid document URL').optional().nullable(),
  emergencyContact: z.string().max(100, 'Emergency contact name is too long').optional().nullable(),
  emergencyPhone: z.string().max(20, 'Emergency phone is too long').optional().nullable(),
});

// ===== Leave Approval/Rejection/Cancellation Schemas =====

export const approveLeaveRequestSchema = z.object({
  notes: z.string().max(500, 'Notes are too long').optional().nullable(),
});

export const rejectLeaveRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500, 'Reason is too long'),
});

export const cancelLeaveRequestSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500, 'Reason is too long'),
});

// ===== Leave Balance Schemas =====

export const updateLeaveBalanceSchema = z.object({
  adjustment: z.number().min(-365, 'Adjustment is too low').max(365, 'Adjustment is too high'),
  adjustmentNotes: z.string().min(1, 'Adjustment notes are required').max(500, 'Notes are too long'),
});

export const initializeLeaveBalanceSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  leaveTypeId: z.string().min(1, 'Leave type ID is required'),
  year: z.number().int().min(2000).max(2100),
  entitlement: z.number().min(0, 'Entitlement must be 0 or more').optional(),
  carriedForward: z.number().min(0, 'Carried forward must be 0 or more').optional(),
});

// ===== Query Schemas =====

export const leaveRequestQuerySchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(LeaveStatus).optional(),
  userId: z.string().optional(),
  leaveTypeId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(50),
  sort: z.enum(['requestNumber', 'startDate', 'endDate', 'totalDays', 'createdAt', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const leaveBalanceQuerySchema = z.object({
  userId: z.string().optional(),
  leaveTypeId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(50),
});

export const teamCalendarQuerySchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.nativeEnum(LeaveStatus).optional(),
  leaveTypeId: z.string().optional(),
});

export const leaveTypeQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
});

// ===== Type Exports =====

export type CreateLeaveTypeRequest = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeRequest = z.infer<typeof updateLeaveTypeSchema>;
export type CreateLeaveRequestRequest = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveRequestRequest = z.infer<typeof updateLeaveRequestSchema>;
export type ApproveLeaveRequestRequest = z.infer<typeof approveLeaveRequestSchema>;
export type RejectLeaveRequestRequest = z.infer<typeof rejectLeaveRequestSchema>;
export type CancelLeaveRequestRequest = z.infer<typeof cancelLeaveRequestSchema>;
export type UpdateLeaveBalanceRequest = z.infer<typeof updateLeaveBalanceSchema>;
export type InitializeLeaveBalanceRequest = z.infer<typeof initializeLeaveBalanceSchema>;
export type LeaveRequestQuery = z.infer<typeof leaveRequestQuerySchema>;
export type LeaveBalanceQuery = z.infer<typeof leaveBalanceQuerySchema>;
export type TeamCalendarQuery = z.infer<typeof teamCalendarQuerySchema>;
export type LeaveTypeQuery = z.infer<typeof leaveTypeQuerySchema>;
