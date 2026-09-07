import { z } from 'zod';
import { createPackageSchema } from '../packages/schemas';

export const createDestinationSchema = z.object({
  name: z.string(),
  country: z.string(),
  description: z.string(),
  heroImageUrl: z.string().optional(),
  priceFromNgn: z.coerce.number().min(0),
  priceFromUsd: z.coerce.number().min(0),
  isFeatured: z.boolean().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  packages: z.array(createPackageSchema).min(1),
}).strict();

export const updateDestinationSchema = z.object({
  name: z.string().optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  heroImageUrl: z.string().optional(),
  priceFromNgn: z.coerce.number().min(0).optional(),
  priceFromUsd: z.coerce.number().min(0).optional(),
  isFeatured: z.boolean().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
}).strict();

export const destinationsQuerySchema = z.object({
  country: z.string().optional(),
  featured: z.string().optional(),
  minPriceNgn: z.string().optional(),
  maxPriceNgn: z.string().optional(),
}).passthrough();
