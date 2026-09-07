import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';

/** Port of Nest's `HttpExceptionFilter` — last middleware in the chain. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const isAppError = err instanceof AppError;
  const status = isAppError ? err.status : 500;
  const errorMessage: string | string[] = isAppError
    ? err.raw
    : err instanceof Error
      ? err.message
      : 'Internal server error';

  // eslint-disable-next-line no-console
  console.error(
    `${req.method} ${req.originalUrl} ${status} - ${JSON.stringify(errorMessage)}`,
    err instanceof Error ? err.stack : undefined,
  );

  res.status(status).json({
    success: false,
    statusCode: status,
    message: errorMessage,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}

/** Mounted after all routes — matches Nest's implicit 404 for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}

/** Wraps an async route handler so rejected promises reach `errorHandler` instead of hanging. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
