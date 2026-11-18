import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max).nullable();

export const settingsUpdateSchema = z
  .object({
    commercialName: text(200).optional(),
    taxIdentification: text(64).optional(),
    logoData: z
      .string()
      .max(700_000)
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/)
      .nullable()
      .optional(),
    email: z.email().max(320).nullable().optional(),
    phone: text(40).optional(),
    address: text(240).optional(),
    city: text(120).optional(),
    department: text(120).optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .regex(/^[A-Z]{3}$/)
      .optional(),
    taxRate: z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/)
      .refine((value) => Number(value) <= 100, 'El impuesto no puede superar el 100 %.')
      .optional(),
    defaultValidityDays: z.number().int().min(1).max(365).nullable().optional(),
    defaultTerms: z.string().trim().max(10000).nullable().optional(),
    discountsEnabled: z.boolean().optional(),
    quotationPrefix: z
      .string()
      .trim()
      .min(2)
      .max(12)
      .regex(/^[A-Z0-9]+$/)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo.');

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
