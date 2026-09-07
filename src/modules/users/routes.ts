import { Router } from 'express';
import * as usersService from './users.service';
import { asyncHandler } from '../../middleware/error-handler';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { updateUserSchema } from './schemas';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.success(await usersService.getMe(req.user!.id));
  }),
);

usersRouter.patch(
  '/me',
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    res.success(await usersService.updateMe(req.user!.id, req.body));
  }),
);
