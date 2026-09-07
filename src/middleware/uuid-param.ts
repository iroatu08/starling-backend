import { Request, Response, NextFunction } from 'express';
import { validate as uuidValidate } from 'uuid';
import { BadRequestError } from '../utils/app-error';

/** Port of `ParseUUIDPipe` (`parse-uuid.pipe.ts`) as an Express param validator. */
export function requireUuidParam(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (!uuidValidate(value)) {
      next(new BadRequestError(`"${value}" is not a valid UUID`));
      return;
    }
    next();
  };
}
