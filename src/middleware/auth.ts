import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { prisma } from '../prisma';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/app-error';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/** Port of `JwtStrategy` (`jwt.strategy.ts`) — verifies the access token and loads `req.user`. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) throw new UnauthorizedError('Unauthorized');

    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedError('Unauthorized');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Port of `JwtRefreshStrategy` (`jwt-refresh.strategy.ts`) — verifies the `refresh_token` cookie. */
export async function requireRefreshCookie(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken) throw new UnauthorizedError('No refresh token');

    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) throw new UnauthorizedError('Refresh token mismatch');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
