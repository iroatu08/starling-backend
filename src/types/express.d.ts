import type { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
    interface Response {
      /** Port of Nest's TransformInterceptor: wraps the happy path in {success, data, timestamp}. */
      success: (data: unknown) => void;
    }
  }
}

export {};
