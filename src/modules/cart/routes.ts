import { Router } from 'express';
import * as cartService from './cart.service';
import { asyncHandler } from '../../middleware/error-handler';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { addCartItemSchema, updateCartItemSchema } from './schemas';

export const cartRouter = Router();

cartRouter.use(requireAuth);

cartRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.success(await cartService.getOrCreateCart(req.user!.id));
  }),
);

cartRouter.post(
  '/items',
  validateBody(addCartItemSchema),
  asyncHandler(async (req, res) => {
    res.success(await cartService.addItem(req.user!.id, req.body));
  }),
);

cartRouter.patch(
  '/items/:id',
  validateBody(updateCartItemSchema),
  asyncHandler(async (req, res) => {
    res.success(await cartService.updateItem(req.user!.id, req.params.id, req.body));
  }),
);

cartRouter.delete(
  '/items/:id',
  asyncHandler(async (req, res) => {
    res.success(await cartService.removeItem(req.user!.id, req.params.id));
  }),
);

cartRouter.delete(
  '/',
  asyncHandler(async (req, res) => {
    res.success(await cartService.clearCart(req.user!.id));
  }),
);
