import { Request, Response, NextFunction } from 'express';

/** Port of Nest's `TransformInterceptor` — attaches `res.success(data)` to every request. */
export function responseEnvelope(_req: Request, res: Response, next: NextFunction): void {
  res.success = (data: unknown) => {
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  };
  next();
}
