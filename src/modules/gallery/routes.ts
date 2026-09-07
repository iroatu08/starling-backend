import { Router } from 'express';
import * as galleryService from './gallery.service';
import { asyncHandler } from '../../middleware/error-handler';

export const galleryRouter = Router();

galleryRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const destinationId = typeof req.query.destinationId === 'string' ? req.query.destinationId : undefined;
    const page = typeof req.query.page === 'string' ? req.query.page : undefined;
    const limit = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    res.success(await galleryService.findAll(destinationId, page, limit));
  }),
);
