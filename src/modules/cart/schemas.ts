import { z } from 'zod';

export const addCartItemSchema = z.object({
  packageId: z.string().uuid().optional(),
  destinationId: z.string().uuid().optional(),
  keptPackageIds: z.array(z.string().uuid()).optional(),
  removedPackageIds: z.array(z.string().uuid()).optional(),
  quantity: z.coerce.number().min(1).optional(),
}).strict();

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().min(1).optional(),
  keptPackageIds: z.array(z.string().uuid()).optional(),
  removedPackageIds: z.array(z.string().uuid()).optional(),
}).strict();
