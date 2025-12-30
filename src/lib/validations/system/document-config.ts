import { z } from 'zod';

// Validation for 2-letter uppercase code
const codeSchema = z
  .string()
  .min(2, 'Code must be exactly 2 letters')
  .max(2, 'Code must be exactly 2 letters')
  .regex(/^[A-Z]{2}$/, 'Code must be exactly 2 uppercase letters (A-Z)');

// Create document number config schema
export const createDocumentConfigSchema = z.object({
  entityType: z
    .string()
    .min(1, 'Entity type is required')
    .max(50, 'Entity type must be 50 characters or less')
    .regex(/^[A-Z_]+$/, 'Entity type must be uppercase letters and underscores only'),
  entityLabel: z
    .string()
    .min(1, 'Entity label is required')
    .max(100, 'Entity label must be 100 characters or less'),
  code: codeSchema,
  description: z.string().max(255).optional().nullable(),
  includeMonth: z.boolean().default(false),
  sequenceDigits: z.number().int().min(1).max(6).default(3),
  isAssetCategory: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Update document number config schema
export const updateDocumentConfigSchema = z.object({
  entityLabel: z
    .string()
    .min(1, 'Entity label is required')
    .max(100, 'Entity label must be 100 characters or less')
    .optional(),
  code: codeSchema.optional(),
  description: z.string().max(255).optional().nullable(),
  includeMonth: z.boolean().optional(),
  sequenceDigits: z.number().int().min(1).max(6).optional(),
  isActive: z.boolean().optional(),
});

// Types
export type CreateDocumentConfigInput = z.infer<typeof createDocumentConfigSchema>;
export type UpdateDocumentConfigInput = z.infer<typeof updateDocumentConfigSchema>;
