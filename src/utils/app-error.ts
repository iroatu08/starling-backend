/** Port of Nest's HttpException family — status + message, caught by the global error handler. */
export class AppError extends Error {
  /** Message as originally passed (string or string[]) — matches Nest's exception response shape. */
  public readonly raw: string | string[];

  constructor(
    public readonly status: number,
    message: string | string[],
  ) {
    super(Array.isArray(message) ? message.join(', ') : message);
    this.name = 'AppError';
    this.raw = message;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string | string[] = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string | string[] = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string | string[] = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string | string[] = 'Not Found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string | string[] = 'Conflict') {
    super(409, message);
  }
}
