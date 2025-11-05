import { z } from 'zod';
import { AssetStatus, AcquisitionType } from '@prisma/client';

export const createAssetSchema = z.object({
  assetTag: z.string().optional().nullable().or(z.literal('')),
  type: z.string().min(1, 'Type is required'),
  category: z.string().optional().nullable().or(z.literal('')),
  brand: z.string().optional().nullable().or(z.literal('')),
  model: z.string().min(1, 'Model is required'),
  serial: z.string().optional().nullable().or(z.literal('')),
  configuration: z.string().optional().nullable().or(z.literal('')),
  purchaseDate: z.string().optional().nullable().or(z.literal('')),
  warrantyExpiry: z.string().optional().nullable().or(z.literal('')),
  supplier: z.string().optional().nullable().or(z.literal('')),
  invoiceNumber: z.string().optional().nullable().or(z.literal('')),
  price: z.number().positive().optional().nullable(),
  priceCurrency: z.string().optional().nullable().or(z.literal('')),
  priceQAR: z.number().positive().optional().nullable(),
  status: z.nativeEnum(AssetStatus).default(AssetStatus.IN_USE),
  acquisitionType: z.nativeEnum(AcquisitionType).default(AcquisitionType.NEW_PURCHASE),
  transferNotes: z.string().optional().nullable().or(z.literal('')),
  assignedUserId: z.string().optional().nullable().or(z.literal('')),
  assignmentDate: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
  location: z.string().optional().nullable().or(z.literal('')),
});

export const updateAssetSchema = createAssetSchema
  .partial()
  .extend({
    // Remove defaults in updates to preserve existing values
    status: z.nativeEnum(AssetStatus).optional(),
    acquisitionType: z.nativeEnum(AcquisitionType).optional(),
  });

export const assignAssetSchema = z.object({
  assignedUserId: z.string().nullable(),
});

export const assetQuerySchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['model', 'brand', 'type', 'category', 'purchaseDate', 'warrantyExpiry', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateAssetRequest = z.infer<typeof createAssetSchema>;
export type UpdateAssetRequest = z.infer<typeof updateAssetSchema>;
export type AssetQuery = z.infer<typeof assetQuerySchema>;