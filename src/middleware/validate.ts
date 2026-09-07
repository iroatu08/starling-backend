import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { BadRequestError } from '../utils/app-error';

function formatIssues(schema: ZodSchema, data: unknown): string[] {
  const result = schema.safeParse(data);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/**
 * Validates `req.body` against a zod schema and replaces it with the parsed
 * (and therefore coerced/whitelisted) value — the Express analogue of Nest's
 * global `ValidationPipe({whitelist: true, forbidNonWhitelisted: true, transform: true})`.
 * On failure, throws a `BadRequestError` whose `message` is a string[] (matches
 * class-validator's error shape, which the frontend already tolerates).
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new BadRequestError(formatIssues(schema, req.body)));
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Same as {@link validateBody} but validates/replaces `req.query`. */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new BadRequestError(formatIssues(schema, req.query)));
      return;
    }
    // req.query is technically read-only in types but assignable at runtime.
    (req as unknown as { query: unknown }).query = result.data;
    next();
  };
}
