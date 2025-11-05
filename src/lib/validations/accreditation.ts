import { z } from 'zod';
import { AccreditationStatus } from '@prisma/client';
import { dateInputToQatarDate } from '@/lib/qatar-timezone';

// Helper to parse dates as Qatar timezone instead of UTC
const qatarDateSchema = z.union([
  z.string().transform((val) => {
    const parsed = dateInputToQatarDate(val);
    if (!parsed) throw new Error('Invalid date format');
    return parsed;
  }),
  z.date(),
]).optional().nullable();

// Create Accreditation Project Schema
export const createAccreditationProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  code: z.string().min(1, 'Project code is required').max(20, 'Project code must be at most 20 characters'),

  // Phase dates (parsed as Qatar timezone)
  bumpInStart: z.string().transform((val) => {
    const parsed = dateInputToQatarDate(val);
    if (!parsed) throw new Error('Invalid date format');
    return parsed;
  }),
  bumpInEnd: z.string().transform((val) => {
    const parsed = dateInputToQatarDate(val);
    if (!parsed) throw new Error('Invalid date format');
    return parsed;
  }),
  liveStart: z.string().transform((val) => {
    const parsed = dateInputToQatarDate(val);
    if (!parsed) throw new Error('Invalid date format');
    return parsed;
  }),
  liveEnd: z.string().transform((val) => {
    const parsed = dateInputToQatarDate(val);
    if (!parsed) throw new Error('Invalid date format');
    return parsed;
  }),
  bumpOutStart: z.string().transform((val) => {
    const parsed = dateInputToQatarDate(val);
    if (!parsed) throw new Error('Invalid date format');
    return parsed;
  }),
  bumpOutEnd: z.string().transform((val) => {
    const parsed = dateInputToQatarDate(val);
    if (!parsed) throw new Error('Invalid date format');
    return parsed;
  }),

  // Access groups as JSON array
  accessGroups: z.array(z.string()).min(1, 'At least one access group is required'),

  isActive: z.boolean().default(true),
}).refine((data) => {
  // Validate that dates are sequential
  const dates = [
    data.bumpInStart,
    data.bumpInEnd,
    data.liveStart,
    data.liveEnd,
    data.bumpOutStart,
    data.bumpOutEnd,
  ];

  for (let i = 0; i < dates.length - 1; i++) {
    if (dates[i] >= dates[i + 1]) {
      return false;
    }
  }

  return true;
}, {
  message: 'Phase dates must be sequential: Bump-In → Live → Bump-Out',
});

export const updateAccreditationProjectSchema = createAccreditationProjectSchema.partial().omit({ name: true, code: true });

// Create/Update Accreditation Record Schema
export const createAccreditationSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  organization: z.string().min(1, 'Organization is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  accessGroup: z.string().min(1, 'Access group is required'),
  profilePhotoUrl: z.string().optional().nullable(),

  // Project
  projectId: z.string().min(1, 'Project is required'),

  // Identification - Either QID OR (Passport + Hayya) (dates in Qatar timezone)
  identificationType: z.enum(['qid', 'passport']),
  qidNumber: z.string().regex(/^\d{11}$/, 'QID must be exactly 11 digits').optional().nullable(),
  qidExpiry: qatarDateSchema,
  passportNumber: z.string().min(6, 'Passport number must be at least 6 characters').max(12, 'Passport number must be at most 12 characters').regex(/^[A-Za-z0-9]+$/, 'Passport number must contain only letters and numbers').optional().nullable(),
  passportCountry: z.string().optional().nullable(),
  passportExpiry: qatarDateSchema,
  hayyaVisaNumber: z.string().optional().nullable(),
  hayyaVisaExpiry: qatarDateSchema,

  // Access Validity Periods (dates in Qatar timezone)
  hasBumpInAccess: z.boolean().default(false),
  bumpInStart: qatarDateSchema,
  bumpInEnd: qatarDateSchema,

  hasLiveAccess: z.boolean().default(false),
  liveStart: qatarDateSchema,
  liveEnd: qatarDateSchema,

  hasBumpOutAccess: z.boolean().default(false),
  bumpOutStart: qatarDateSchema,
  bumpOutEnd: qatarDateSchema,

  status: z.nativeEnum(AccreditationStatus).default(AccreditationStatus.DRAFT),
}).refine((data) => {
  // Validate QID fields if QID is selected
  if (data.identificationType === 'qid') {
    return data.qidNumber && data.qidExpiry;
  }
  return true;
}, {
  message: 'QID Number and Expiry Date are required when using QID',
  path: ['qidNumber'],
}).refine((data) => {
  // Validate Passport fields if Passport is selected
  if (data.identificationType === 'passport') {
    return data.passportNumber && data.passportCountry && data.passportExpiry && data.hayyaVisaNumber && data.hayyaVisaExpiry;
  }
  return true;
}, {
  message: 'Passport Number, Country, Expiry, Hayya Visa Number, and Hayya Expiry are required when using Passport',
  path: ['passportNumber'],
}).refine((data) => {
  // Validate Bump-In dates if access is enabled
  if (data.hasBumpInAccess) {
    if (!data.bumpInStart || !data.bumpInEnd) {
      return false;
    }
    if (data.bumpInStart >= data.bumpInEnd) {
      return false;
    }
  }
  return true;
}, {
  message: 'Valid Bump-In start and end dates are required when Bump-In access is enabled',
  path: ['bumpInStart'],
}).refine((data) => {
  // Validate Live dates if access is enabled
  if (data.hasLiveAccess) {
    if (!data.liveStart || !data.liveEnd) {
      return false;
    }
    if (data.liveStart >= data.liveEnd) {
      return false;
    }
  }
  return true;
}, {
  message: 'Valid Live start and end dates are required when Live access is enabled',
  path: ['liveStart'],
}).refine((data) => {
  // Validate Bump-Out dates if access is enabled
  if (data.hasBumpOutAccess) {
    if (!data.bumpOutStart || !data.bumpOutEnd) {
      return false;
    }
    if (data.bumpOutStart >= data.bumpOutEnd) {
      return false;
    }
  }
  return true;
}, {
  message: 'Valid Bump-Out start and end dates are required when Bump-Out access is enabled',
  path: ['bumpOutStart'],
}).refine((data) => {
  // At least one phase must be selected
  return data.hasBumpInAccess || data.hasLiveAccess || data.hasBumpOutAccess;
}, {
  message: 'At least one access phase must be selected',
  path: ['hasBumpInAccess'],
}).refine((data) => {
  // Validate no overlapping between Bump-In and Live phases
  if (data.hasBumpInAccess && data.hasLiveAccess) {
    if (data.bumpInEnd && data.liveStart && data.bumpInEnd > data.liveStart) {
      return false;
    }
  }
  return true;
}, {
  message: 'Bump-In end date must not overlap with Live start date',
  path: ['bumpInEnd'],
}).refine((data) => {
  // Validate no overlapping between Live and Bump-Out phases
  if (data.hasLiveAccess && data.hasBumpOutAccess) {
    if (data.liveEnd && data.bumpOutStart && data.liveEnd > data.bumpOutStart) {
      return false;
    }
  }
  return true;
}, {
  message: 'Live end date must not overlap with Bump-Out start date',
  path: ['liveEnd'],
}).refine((data) => {
  // Validate no overlapping between Bump-In and Bump-Out phases (if Live is skipped)
  if (data.hasBumpInAccess && data.hasBumpOutAccess && !data.hasLiveAccess) {
    if (data.bumpInEnd && data.bumpOutStart && data.bumpInEnd > data.bumpOutStart) {
      return false;
    }
  }
  return true;
}, {
  message: 'Bump-In end date must not overlap with Bump-Out start date',
  path: ['bumpInEnd'],
});

export const updateAccreditationSchema = createAccreditationSchema.partial().omit({ projectId: true });

// Submit for approval schema
export const submitAccreditationSchema = z.object({
  accreditationId: z.string().min(1, 'Accreditation ID is required'),
});

// Approve/Reject schema
export const approveAccreditationSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const rejectAccreditationSchema = z.object({
  notes: z.string().min(1, 'Rejection notes are required'),
});

// Query schema for filtering
export const accreditationQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.nativeEnum(AccreditationStatus).optional(),
  accessGroup: z.string().optional(),
  q: z.string().optional(), // Search query (name, org, accred number)
  p: z.coerce.number().min(1).default(1), // Page number
  ps: z.coerce.number().min(1).max(100).default(20), // Page size
  sort: z.enum(['accreditationNumber', 'firstName', 'organization', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type CreateAccreditationProjectRequest = z.infer<typeof createAccreditationProjectSchema>;
export type UpdateAccreditationProjectRequest = z.infer<typeof updateAccreditationProjectSchema>;
export type CreateAccreditationRequest = z.infer<typeof createAccreditationSchema>;
export type UpdateAccreditationRequest = z.infer<typeof updateAccreditationSchema>;
export type ApproveAccreditationRequest = z.infer<typeof approveAccreditationSchema>;
export type RejectAccreditationRequest = z.infer<typeof rejectAccreditationSchema>;
export type AccreditationQuery = z.infer<typeof accreditationQuerySchema>;
