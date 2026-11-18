import { z } from 'zod';

export const historyListSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z
      .enum(['BORRADOR', 'PENDIENTE', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA'])
      .optional(),
    clientId: z.uuid().optional(),
    search: z.string().trim().max(200).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    sortBy: z.enum(['issueDate', 'createdAt', 'total']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'La fecha final debe ser igual o posterior a la fecha inicial.',
  });

export type HistoryListInput = z.infer<typeof historyListSchema>;
