import { z } from 'zod';

/** Matches Nest's implicit-conversion boolean coercion for multipart string fields ("true"/"false"). */
const implicitBoolean = z.preprocess((val) => {
  if (typeof val === 'string') {
    if (val === 'true') return true;
    if (val === 'false') return false;
  }
  return val;
}, z.boolean());

export const uploadImageSchema = z.object({
  destinationId: z.string().uuid().optional(),
  altText: z.string().optional(),
  isFeatured: implicitBoolean.optional(),
}).strict();
