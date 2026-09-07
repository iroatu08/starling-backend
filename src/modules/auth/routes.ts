import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authService from './auth.service';
import { asyncHandler } from '../../middleware/error-handler';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRefreshCookie } from '../../middleware/auth';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './schemas';

export const authRouter = Router();

// Matches the Nest controller's `@Throttle({ default: { limit: 10, ttl: 60000 } })` on the whole controller.
authRouter.use(rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }));

authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.success(result);
  }),
);

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, res);
    res.success(result);
  }),
);

authRouter.post(
  '/refresh',
  requireRefreshCookie,
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.user!, res);
    res.success(result);
  }),
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await authService.logout(req.user!, res);
    res.success(result);
  }),
);

authRouter.get(
  '/verify/:token',
  asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.params.token);
    res.success(result);
  }),
);

authRouter.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    res.success(result);
  }),
);

authRouter.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body.token, req.body.newPassword);
    res.success(result);
  }),
);

authRouter.patch(
  '/password',
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    res.success(result);
  }),
);
