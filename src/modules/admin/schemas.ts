import { z } from 'zod';

export const adminSendEmailSchema = z.object({
  toEmail: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  broadcastToAll: z.boolean().optional(),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
}).strict();
