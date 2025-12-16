import { LeaveStatus, LeaveRequestType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Check if a date is a weekend (Qatar: Friday and Saturday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6; // Friday = 5, Saturday = 6
}

/**
 * Calculate working days between two dates, excluding Fri/Sat (Qatar weekend)
 * @param startDate Start date
 * @param endDate End date
 * @param requestType Type of leave request
 * @returns Number of working days
 */
export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  requestType: LeaveRequestType = 'FULL_DAY'
): number {
  // For half-day requests, return 0.5
  if (requestType === 'HALF_DAY_AM' || requestType === 'HALF_DAY_PM') {
    // Half day should be on a working day
    if (isWeekend(startDate)) {
      return 0;
    }
    return 0.5;
  }

  // For full day requests, count working days
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    if (!isWeekend(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Generate a leave request number
 * Format: LR-XXXXX (e.g., LR-00001)
 */
export function generateLeaveRequestNumber(existingCount: number): string {
  const nextNumber = existingCount + 1;
  return `LR-${String(nextNumber).padStart(5, '0')}`;
}

/**
 * Calculate remaining balance
 */
export function calculateRemainingBalance(
  entitlement: number | string | Decimal,
  used: number | string | Decimal,
  pending: number | string | Decimal,
  carriedForward: number | string | Decimal,
  adjustment: number | string | Decimal
): number {
  const ent = Number(entitlement);
  const u = Number(used);
  const p = Number(pending);
  const cf = Number(carriedForward);
  const adj = Number(adjustment);

  return ent + cf + adj - u - p;
}

/**
 * Get available balance (excluding pending)
 */
export function calculateAvailableBalance(
  entitlement: number | string | Decimal,
  used: number | string | Decimal,
  carriedForward: number | string | Decimal,
  adjustment: number | string | Decimal
): number {
  const ent = Number(entitlement);
  const u = Number(used);
  const cf = Number(carriedForward);
  const adj = Number(adjustment);

  return ent + cf + adj - u;
}

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Check if two date ranges overlap
 */
export function datesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 <= end2 && end1 >= start2;
}

/**
 * Format leave days for display
 */
export function formatLeaveDays(days: number | string | Decimal): string {
  const num = Number(days);
  if (num === 0.5) {
    return 'Half day';
  }
  if (num === 1) {
    return '1 day';
  }
  return `${num} days`;
}

/**
 * Get status color for badges
 */
export function getLeaveStatusColor(status: LeaveStatus): string {
  switch (status) {
    case 'PENDING':
      return '#F59E0B'; // Amber
    case 'APPROVED':
      return '#10B981'; // Green
    case 'REJECTED':
      return '#EF4444'; // Red
    case 'CANCELLED':
      return '#6B7280'; // Gray
    default:
      return '#6B7280';
  }
}

/**
 * Get status variant for Badge component
 */
export function getLeaveStatusVariant(status: LeaveStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'PENDING':
      return 'secondary';
    case 'APPROVED':
      return 'default';
    case 'REJECTED':
      return 'destructive';
    case 'CANCELLED':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * Get status display text with emoji
 */
export function getLeaveStatusText(status: LeaveStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * Check if a leave request can be cancelled
 * Can only cancel pending or approved requests with future start dates
 */
export function canCancelLeaveRequest(status: LeaveStatus, startDate: Date): boolean {
  if (status !== 'PENDING' && status !== 'APPROVED') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  return start > today;
}

/**
 * Check if a leave request can be edited
 * Can only edit pending requests with future start dates
 */
export function canEditLeaveRequest(status: LeaveStatus, startDate: Date): boolean {
  if (status !== 'PENDING') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  return start > today;
}

/**
 * Get date range text for display
 */
export function getDateRangeText(startDate: Date, endDate: Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-GB', options);
  }

  // Check if same month and year
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} - ${end.toLocaleDateString('en-GB', options)}`;
  }

  // Check if same year
  if (start.getFullYear() === end.getFullYear()) {
    const startOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('en-GB', startOpts)} - ${end.toLocaleDateString('en-GB', options)}`;
  }

  return `${start.toLocaleDateString('en-GB', options)} - ${end.toLocaleDateString('en-GB', options)}`;
}

/**
 * Get request type display text
 */
export function getRequestTypeText(requestType: LeaveRequestType): string {
  switch (requestType) {
    case 'FULL_DAY':
      return 'Full Day';
    case 'HALF_DAY_AM':
      return 'Half Day (AM)';
    case 'HALF_DAY_PM':
      return 'Half Day (PM)';
    default:
      return requestType;
  }
}

/**
 * Check if minimum notice days requirement is met
 */
export function meetsNoticeDaysRequirement(startDate: Date, minNoticeDays: number): boolean {
  if (minNoticeDays === 0) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const diffTime = start.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= minNoticeDays;
}

/**
 * Check if max consecutive days limit is exceeded
 */
export function exceedsMaxConsecutiveDays(totalDays: number, maxConsecutiveDays: number | null): boolean {
  if (maxConsecutiveDays === null) return false;
  return totalDays > maxConsecutiveDays;
}

/**
 * Default leave types for seeding
 */
export const DEFAULT_LEAVE_TYPES = [
  {
    name: 'Annual Leave',
    description: 'Paid annual vacation leave',
    color: '#3B82F6', // Blue
    defaultDays: 30,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    maxConsecutiveDays: 15,
    minNoticeDays: 7,
    allowCarryForward: true,
    maxCarryForwardDays: 5,
  },
  {
    name: 'Sick Leave',
    description: 'Leave for medical reasons',
    color: '#EF4444', // Red
    defaultDays: 14,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    maxConsecutiveDays: null,
    minNoticeDays: 0,
    allowCarryForward: false,
    maxCarryForwardDays: null,
  },
  {
    name: 'Maternity Leave',
    description: 'Leave for new mothers',
    color: '#EC4899', // Pink
    defaultDays: 50,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    maxConsecutiveDays: null,
    minNoticeDays: 30,
    allowCarryForward: false,
    maxCarryForwardDays: null,
  },
  {
    name: 'Paternity Leave',
    description: 'Leave for new fathers',
    color: '#8B5CF6', // Purple
    defaultDays: 3,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    maxConsecutiveDays: null,
    minNoticeDays: 0,
    allowCarryForward: false,
    maxCarryForwardDays: null,
  },
  {
    name: 'Unpaid Leave',
    description: 'Unpaid leave of absence',
    color: '#6B7280', // Gray
    defaultDays: 0,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: false,
    isActive: true,
    maxConsecutiveDays: 30,
    minNoticeDays: 14,
    allowCarryForward: false,
    maxCarryForwardDays: null,
  },
  {
    name: 'Compassionate Leave',
    description: 'Leave for bereavement or family emergencies',
    color: '#14B8A6', // Teal
    defaultDays: 5,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    maxConsecutiveDays: null,
    minNoticeDays: 0,
    allowCarryForward: false,
    maxCarryForwardDays: null,
  },
];

/**
 * Get leave type badge style
 */
export function getLeaveTypeBadgeStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: `${color}20`,
    color: color,
    borderColor: `${color}40`,
  };
}
