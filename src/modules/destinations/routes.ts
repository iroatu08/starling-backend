import { Router } from 'express';
import * as destinationsService from './destinations.service';
import { asyncHandler } from '../../middleware/error-handler';

export const destinationsRouter = Router();

destinationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { country, featured, minPriceNgn, maxPriceNgn } = req.query as Record<string, string | undefined>;
    res.success(
      await destinationsService.findAll({
        country,
        featured: featured ? featured === 'true' : undefined,
        minPriceNgn: minPriceNgn ? Number(minPriceNgn) : undefined,
        maxPriceNgn: maxPriceNgn ? Number(maxPriceNgn) : undefined,
      }),
    );
  }),
);

destinationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.success(await destinationsService.findOne(req.params.id));
  }),
);
