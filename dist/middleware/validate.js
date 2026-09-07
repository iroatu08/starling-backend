"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
const app_error_1 = require("../utils/app-error");
function formatIssues(schema, data) {
    const result = schema.safeParse(data);
    if (result.success)
        return [];
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
function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            next(new app_error_1.BadRequestError(formatIssues(schema, req.body)));
            return;
        }
        req.body = result.data;
        next();
    };
}
/** Same as {@link validateBody} but validates/replaces `req.query`. */
function validateQuery(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            next(new app_error_1.BadRequestError(formatIssues(schema, req.query)));
            return;
        }
        // req.query is technically read-only in types but assignable at runtime.
        req.query = result.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map