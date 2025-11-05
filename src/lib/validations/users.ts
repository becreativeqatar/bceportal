import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(Role, {
    message: 'Invalid role',
  }).optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .optional(),
  isTemporaryStaff: z.boolean().optional().default(false),
}).refine((data) => {
  // If not temporary staff, role is required
  if (!data.isTemporaryStaff && !data.role) {
    return false;
  }
  return true;
}, {
  message: 'Role is required for regular users',
  path: ['role'],
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(Role).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
