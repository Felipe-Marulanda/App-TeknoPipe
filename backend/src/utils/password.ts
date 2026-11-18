import { z } from 'zod';

export const loginPasswordSchema = z
  .string()
  .min(1)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'La contraseña supera 72 bytes UTF-8.',
  );

export const newPasswordSchema = z
  .string()
  .min(12)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'La contraseña supera 72 bytes UTF-8.',
  );
