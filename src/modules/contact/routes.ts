import { Router } from 'express';
import * as contactService from './contact.service';
import { asyncHandler } from '../../middleware/error-handler';
import { validateBody } from '../../middleware/validate';
import { createContactSchema } from './schemas';

export const contactRouter = Router();

contactRouter.post(
  '/',
  validateBody(createContactSchema),
  asyncHandler(async (req, res) => {
    res.success(await contactService.submit(req.body));
  }),
);
