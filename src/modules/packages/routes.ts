import { Router } from 'express';
import * as packagesService from './packages.service';
import { asyncHandler } from '../../middleware/error-handler';

export const packagesRouter = Router();

packagesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const destinationId = typeof req.query.destinationId === 'string' ? req.query.destinationId : undefined;
    res.success(await packagesService.findAll(destinationId));
  }),
);

packagesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.success(await packagesService.findOne(req.params.id));
  }),
);
