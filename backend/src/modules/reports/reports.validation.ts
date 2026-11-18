import { z } from 'zod';

export const reportQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(100),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    status: z
      .enum(['BORRADOR', 'PENDIENTE', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA'])
      .optional(),
    clientId: z.uuid().optional(),
    userId: z.uuid().optional(),
    format: z.enum(['json', 'csv']).default('json'),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'La fecha final debe ser igual o posterior a la fecha inicial.',
  });

export type ReportQuery = z.infer<typeof reportQuerySchema>;
