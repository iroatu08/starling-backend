import { Router } from 'express';
import * as newsletterService from './newsletter.service';
import { asyncHandler } from '../../middleware/error-handler';
import { validateBody } from '../../middleware/validate';
import { subscribeNewsletterSchema } from './schemas';

export const newsletterRouter = Router();

newsletterRouter.post(
  '/subscribe',
  validateBody(subscribeNewsletterSchema),
  asyncHandler(async (req, res) => {
    res.success(await newsletterService.subscribe(req.body));
  }),
);
