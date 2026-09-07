import { z } from 'zod';

export const initializePaymentSchema = z.object({
  bookingId: z.string().uuid(),
  email: z.string(),
  amount: z.coerce.number().min(1).optional(),
  currency: z.string().optional(),
  callbackUrl: z.string().optional(),
}).strict();

export const rejectRefundSchema = z.object({
  reason: z.string().min(1).max(500),
}).strict();
