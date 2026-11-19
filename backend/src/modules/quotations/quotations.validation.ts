import { z } from 'zod';

const quantitySchema = z
  .string()
  .regex(/^\d{1,11}(\.\d{1,3})?$/)
  .refine((quantity) => Number(quantity) > 0);
const amountSchema = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/);

export const quotationCreateSchema = z.object({
  clientId: z.uuid(),
  expirationDate: z.iso.date().optional(),
  observations: z.string().trim().max(5000).optional(),
  commercialTerms: z.string().trim().max(5000).optional(),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: quantitySchema,
        discountAmount: amountSchema.optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const quotationListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['BORRADOR', 'PENDIENTE', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA'])
    .optional(),
  clientId: z.uuid().optional(),
  search: z.string().trim().max(40).optional(),
});

export const quotationStatusSchema = z.object({
  status: z.enum(['BORRADOR', 'PENDIENTE', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA']),
  observation: z.string().trim().min(1).max(1000).optional(),
});

export const quotationDuplicateSchema = z.object({
  expirationDate: z.iso.date().optional(),
  observations: z.string().trim().max(5000).optional(),
});

export type QuotationCreateInput = z.infer<typeof quotationCreateSchema>;
export type QuotationDuplicateInput = z.infer<typeof quotationDuplicateSchema>;
export type QuotationListInput = z.infer<typeof quotationListSchema>;
