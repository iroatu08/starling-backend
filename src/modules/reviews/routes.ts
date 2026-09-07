import { Router } from 'express';
import * as reviewsService from './reviews.service';
import { asyncHandler } from '../../middleware/error-handler';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { createReviewSchema } from './schemas';

// Mounted at `/destinations` — routes are `/:destinationId/reviews`.
export const reviewsRouter = Router();

reviewsRouter.get(
  '/:destinationId/reviews',
  asyncHandler(async (req, res) => {
    res.success(await reviewsService.findByDestination(req.params.destinationId));
  }),
);

reviewsRouter.post(
  '/:destinationId/reviews',
  requireAuth,
  validateBody(createReviewSchema),
  asyncHandler(async (req, res) => {
    res.success(await reviewsService.create(req.params.destinationId, req.user!, req.body));
  }),
);
