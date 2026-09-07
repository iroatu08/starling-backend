import { z } from 'zod';

export const bookingTravelerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  isPrimary: z.boolean().optional(),
}).strict();

export const createBookingSchema = z.object({
  travelers: z.array(bookingTravelerSchema).min(1).max(30).optional(),
}).strict();

export const requestRefundSchema = z.object({
  reason: z.string().min(1).max(500),
}).strict();
