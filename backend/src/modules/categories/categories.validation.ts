import { z } from 'zod';

export const categoryListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  active: z.enum(['true', 'false']).optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
});

export const categoryUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo.');

export const categoryStatusSchema = z.object({ active: z.boolean() });

export type CategoryListInput = z.infer<typeof categoryListSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
