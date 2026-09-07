import { Router } from 'express';
import * as bookingsService from './bookings.service';
import { asyncHandler } from '../../middleware/error-handler';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { createBookingSchema, requestRefundSchema } from './schemas';

export const bookingsRouter = Router();

bookingsRouter.use(requireAuth);

bookingsRouter.post(
  '/',
  validateBody(createBookingSchema),
  asyncHandler(async (req, res) => {
    res.success(await bookingsService.createFromCart(req.user!, req.body));
  }),
);

bookingsRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.success(await bookingsService.findMyBookings(req.user!.id));
  }),
);

bookingsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.success(await bookingsService.findOneForUser(req.params.id, req.user!.id, req.user!.role));
  }),
);

bookingsRouter.post(
  '/:id/refund-requests',
  validateBody(requestRefundSchema),
  asyncHandler(async (req, res) => {
    res.success(await bookingsService.requestRefund(req.params.id, req.user!, req.body.reason));
  }),
);

bookingsRouter.get(
  '/:id/receipt.pdf',
  asyncHandler(async (req, res) => {
    const { fileName, buffer } = await bookingsService.generateReceiptPdf(req.params.id, req.user!);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
  }),
);
