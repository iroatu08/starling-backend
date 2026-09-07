import { z } from 'zod';
import { PackageType } from '@prisma/client';

export const createPackageSchema = z.object({
  destinationId: z.string().uuid().optional(),
  name: z.string(),
  type: z.nativeEnum(PackageType),
  description: z.string().optional(),
  isRemovable: z.boolean().optional(),
  includesVisa: z.boolean().optional(),
  includesFlight: z.boolean().optional(),
  includesHotel: z.boolean().optional(),
  includesActivities: z.boolean().optional(),
  priceNgn: z.coerce.number().min(0),
  priceUsd: z.coerce.number().min(0),
  durationDays: z.coerce.number().min(1).optional(),
  maxCapacity: z.coerce.number().optional(),
}).strict();

export const updatePackageSchema = createPackageSchema.partial();

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
