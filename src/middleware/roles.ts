import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { ForbiddenError } from '../utils/app-error';

/** Port of `RolesGuard` + `@Roles()` — must run after `requireAuth`. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ForbiddenError('Access denied: insufficient permissions'));
      return;
    }
    next();
  };
}
