import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string(),
  budget: z.string().optional(),
}).strict();
