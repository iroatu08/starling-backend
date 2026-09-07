import { Router } from 'express';
import multer from 'multer';
import { UserRole, BookingStatus, PaymentStatus, RefundRequestStatus } from '@prisma/client';
import { asyncHandler } from '../../middleware/error-handler';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';
import * as adminService from './admin.service';
import * as usersService from '../users/users.service';
import * as bookingsService from '../bookings/bookings.service';
import * as paymentsService from '../payments/payments.service';
import * as destinationsService from '../destinations/destinations.service';
import * as galleryService from '../gallery/gallery.service';
import * as contactService from '../contact/contact.service';
import { adminSendEmailSchema } from './schemas';
import { createDestinationSchema, updateDestinationSchema } from '../destinations/schemas';
import { createPackageSchema, updatePackageSchema } from '../packages/schemas';
import { uploadImageSchema } from '../gallery/schemas';
import { rejectRefundSchema } from '../payments/schemas';

const upload = multer({ storage: multer.memoryStorage() });

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(UserRole.admin));

// ─── STATS ─────────────────────────────────────────────
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.success(await adminService.getStats());
  }),
);

// ─── EMAIL ─────────────────────────────────────────────
adminRouter.post(
  '/email/send',
  validateBody(adminSendEmailSchema),
  asyncHandler(async (req, res) => {
    res.success(await adminService.sendEmail(req.body));
  }),
);

// ─── USERS ─────────────────────────────────────────────
adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, limit, search } = req.query as Record<string, string | undefined>;
    res.success(await usersService.findAll(page ? Number(page) : undefined, limit ? Number(limit) : undefined, search));
  }),
);

adminRouter.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    res.success(await usersService.updateUserAdmin(req.params.id, req.body));
  }),
);

// ─── BOOKINGS ────────────────────────────────────────────
adminRouter.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const { page, limit, status, destinationId, userId, from, to } = req.query as Record<string, string | undefined>;
    res.success(
      await bookingsService.findAll(
        page ? Number(page) : undefined,
        limit ? Number(limit) : undefined,
        status as BookingStatus | undefined,
        { destinationId, userId, from, to },
      ),
    );
  }),
);

adminRouter.get(
  '/bookings/:id',
  asyncHandler(async (req, res) => {
    res.success(await bookingsService.findOne(req.params.id));
  }),
);

adminRouter.patch(
  '/bookings/:id/status',
  asyncHandler(async (req, res) => {
    res.success(await bookingsService.updateStatus(req.params.id, req.body.status, req.user!));
  }),
);

// ─── PAYMENTS ────────────────────────────────────────────
adminRouter.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const { page, limit, status, search } = req.query as Record<string, string | undefined>;
    res.success(
      await paymentsService.getAllPayments({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as PaymentStatus | undefined,
        search,
      }),
    );
  }),
);

adminRouter.patch(
  '/payments/:id/status',
  asyncHandler(async (req, res) => {
    res.success(await paymentsService.updateStatus(req.params.id, req.body.status));
  }),
);

adminRouter.get(
  '/refund-requests',
  asyncHandler(async (req, res) => {
    const { page, limit, status } = req.query as Record<string, string | undefined>;
    res.success(
      await paymentsService.getRefundRequests({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as RefundRequestStatus | undefined,
      }),
    );
  }),
);

adminRouter.patch(
  '/refund-requests/:id/approve',
  asyncHandler(async (req, res) => {
    res.success(await paymentsService.approveRefundRequest(req.params.id, req.user!));
  }),
);

adminRouter.patch(
  '/refund-requests/:id/reject',
  validateBody(rejectRefundSchema),
  asyncHandler(async (req, res) => {
    res.success(await paymentsService.rejectRefundRequest(req.params.id, req.user!, req.body.reason));
  }),
);

// ─── DESTINATIONS ────────────────────────────────────────
adminRouter.post(
  '/destinations',
  validateBody(createDestinationSchema),
  asyncHandler(async (req, res) => {
    res.success(await destinationsService.create(req.body));
  }),
);

adminRouter.get(
  '/destinations',
  asyncHandler(async (_req, res) => {
    res.success(await destinationsService.findAllAdmin());
  }),
);

adminRouter.get(
  '/destinations/:id',
  asyncHandler(async (req, res) => {
    res.success(await destinationsService.findOneAdmin(req.params.id));
  }),
);

adminRouter.patch(
  '/destinations/:id',
  validateBody(updateDestinationSchema),
  asyncHandler(async (req, res) => {
    res.success(await destinationsService.update(req.params.id, req.body));
  }),
);

adminRouter.delete(
  '/destinations/:id',
  asyncHandler(async (req, res) => {
    res.success(await destinationsService.remove(req.params.id));
  }),
);

// ─── PACKAGES ────────────────────────────────────────────
adminRouter.post(
  '/destinations/:id/packages',
  validateBody(createPackageSchema),
  asyncHandler(async (req, res) => {
    res.success(await destinationsService.addPackage(req.params.id, req.body));
  }),
);

adminRouter.patch(
  '/destinations/:id/packages/:packageId',
  validateBody(updatePackageSchema),
  asyncHandler(async (req, res) => {
    res.success(await destinationsService.updatePackage(req.params.id, req.params.packageId, req.body));
  }),
);

adminRouter.delete(
  '/destinations/:id/packages/:packageId',
  asyncHandler(async (req, res) => {
    res.success(await destinationsService.removePackage(req.params.id, req.params.packageId));
  }),
);

// ─── GALLERY ─────────────────────────────────────────────
adminRouter.post(
  '/gallery/upload',
  upload.single('file'),
  validateBody(uploadImageSchema),
  asyncHandler(async (req, res) => {
    res.success(await galleryService.uploadImage(req.file as Express.Multer.File, req.body));
  }),
);

adminRouter.delete(
  '/gallery/:id',
  asyncHandler(async (req, res) => {
    res.success(await galleryService.remove(req.params.id));
  }),
);

// ─── CONTACT ─────────────────────────────────────────────
adminRouter.get(
  '/contact',
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as Record<string, string | undefined>;
    res.success(await contactService.findAll(page ? Number(page) : undefined, limit ? Number(limit) : undefined));
  }),
);

adminRouter.patch(
  '/contact/:id/read',
  asyncHandler(async (req, res) => {
    res.success(await contactService.markRead(req.params.id));
  }),
);
