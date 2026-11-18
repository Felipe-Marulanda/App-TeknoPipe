import { z } from 'zod';
import { newPasswordSchema } from '../../utils/password.js';

const roleSchema = z.enum(['ADMINISTRADOR', 'EMPLEADO']);

export const userListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  role: roleSchema.optional(),
  active: z.enum(['true', 'false']).optional(),
});

export const userCreateSchema = z.object({
  email: z.email().max(320),
  fullName: z.string().trim().min(2).max(160),
  password: newPasswordSchema,
  role: roleSchema,
});

export const userUpdateSchema = z
  .object({
    email: z.email().max(320).optional(),
    fullName: z.string().trim().min(2).max(160).optional(),
    password: newPasswordSchema.optional(),
    role: roleSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo.');

export const userStatusSchema = z.object({ active: z.boolean() });

export type UserListInput = z.infer<typeof userListSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
