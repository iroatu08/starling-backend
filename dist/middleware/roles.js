"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const app_error_1 = require("../utils/app-error");
/** Port of `RolesGuard` + `@Roles()` — must run after `requireAuth`. */
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            next(new app_error_1.ForbiddenError('Access denied: insufficient permissions'));
            return;
        }
        next();
    };
}
//# sourceMappingURL=roles.js.map