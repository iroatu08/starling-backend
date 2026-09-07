import { Router } from 'express';
import * as paymentsService from './payments.service';
import { asyncHandler } from '../../middleware/error-handler';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { initializePaymentSchema } from './schemas';

export const paymentsRouter = Router();

paymentsRouter.post(
  '/initialize',
  requireAuth,
  validateBody(initializePaymentSchema),
  asyncHandler(async (req, res) => {
    res.success(await paymentsService.initialize(req.user!, req.body));
  }),
);

paymentsRouter.get(
  '/verify/:reference',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.success(await paymentsService.verify(req.params.reference, req.user!));
  }),
);

paymentsRouter.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-paystack-signature'] as string;
    res.success(await paymentsService.handleWebhook(req.body, signature));
  }),
);

paymentsRouter.get(
  '/history',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.success(await paymentsService.getHistory(req.user!.id));
  }),
);
