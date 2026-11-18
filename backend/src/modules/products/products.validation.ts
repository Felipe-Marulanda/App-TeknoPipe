import { z } from 'zod';

const unitPriceSchema = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/);

export const productListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  categoryId: z.uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
});

export const productCreateSchema = z.object({
  reference: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  unit: z.string().trim().min(1).max(40),
  unitPrice: unitPriceSchema,
});

export const productUpdateSchema = z
  .object({
    reference: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    unitPrice: unitPriceSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo.');

export const productStatusSchema = z.object({ active: z.boolean() });

export type ProductListInput = z.infer<typeof productListSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
