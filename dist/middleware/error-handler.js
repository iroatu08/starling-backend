"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.asyncHandler = asyncHandler;
const app_error_1 = require("../utils/app-error");
/** Port of Nest's `HttpExceptionFilter` — last middleware in the chain. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err, req, res, _next) {
    const isAppError = err instanceof app_error_1.AppError;
    const status = isAppError ? err.status : 500;
    const errorMessage = isAppError
        ? err.raw
        : err instanceof Error
            ? err.message
            : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error(`${req.method} ${req.originalUrl} ${status} - ${JSON.stringify(errorMessage)}`, err instanceof Error ? err.stack : undefined);
    res.status(status).json({
        success: false,
        statusCode: status,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    });
}
/** Mounted after all routes — matches Nest's implicit 404 for unmatched routes. */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        statusCode: 404,
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    });
}
/** Wraps an async route handler so rejected promises reach `errorHandler` instead of hanging. */
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
//# sourceMappingURL=error-handler.js.map