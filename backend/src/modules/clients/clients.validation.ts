import { z } from 'zod';

const clientFields = {
  identificationType: z.string().trim().min(1).max(32),
  identificationNumber: z.string().trim().min(1).max(64),
  legalName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(160).nullable().optional(),
  email: z.email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  department: z.string().trim().max(120).nullable().optional(),
};

export const clientCreateSchema = z.object(clientFields);
export const clientUpdateSchema = z.object({
  identificationType: clientFields.identificationType.optional(),
  identificationNumber: clientFields.identificationNumber.optional(),
  legalName: clientFields.legalName.optional(),
  contactName: clientFields.contactName,
  email: clientFields.email,
  phone: clientFields.phone,
  address: clientFields.address,
  city: clientFields.city,
  department: clientFields.department,
});
export const clientListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  active: z.enum(['true', 'false']).optional(),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
export type ClientListInput = z.infer<typeof clientListSchema>;
