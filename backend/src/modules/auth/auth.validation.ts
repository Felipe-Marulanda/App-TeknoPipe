import { z } from 'zod';
import { loginPasswordSchema } from '../../utils/password.js';

export const loginSchema = z.object({
  email: z.email().transform((email) => email.trim().toLowerCase()),
  password: loginPasswordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
