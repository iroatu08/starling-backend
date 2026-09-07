import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  address: z.string().optional(),
  preferences: z.string().optional(),
}).strict();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
}).strict();
