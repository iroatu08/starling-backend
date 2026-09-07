"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRefreshCookie = requireRefreshCookie;
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt = __importStar(require("bcrypt"));
const prisma_1 = require("../prisma");
const env_1 = require("../config/env");
const app_error_1 = require("../utils/app-error");
function extractBearerToken(req) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
        return null;
    return header.slice('Bearer '.length).trim() || null;
}
/** Port of `JwtStrategy` (`jwt.strategy.ts`) — verifies the access token and loads `req.user`. */
async function requireAuth(req, _res, next) {
    try {
        const token = extractBearerToken(req);
        if (!token)
            throw new app_error_1.UnauthorizedError('Unauthorized');
        let payload;
        try {
            payload = jwt.verify(token, env_1.env.JWT_ACCESS_SECRET);
        }
        catch {
            throw new app_error_1.UnauthorizedError('Unauthorized');
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.isActive) {
            throw new app_error_1.UnauthorizedError('User not found or inactive');
        }
        req.user = user;
        next();
    }
    catch (err) {
        next(err);
    }
}
/** Port of `JwtRefreshStrategy` (`jwt-refresh.strategy.ts`) — verifies the `refresh_token` cookie. */
async function requireRefreshCookie(req, _res, next) {
    try {
        const refreshToken = req.cookies?.refresh_token;
        if (!refreshToken)
            throw new app_error_1.UnauthorizedError('No refresh token');
        let payload;
        try {
            payload = jwt.verify(refreshToken, env_1.env.JWT_REFRESH_SECRET);
        }
        catch {
            throw new app_error_1.UnauthorizedError('Invalid refresh token');
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.refreshTokenHash) {
            throw new app_error_1.UnauthorizedError('Invalid refresh token');
        }
        const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!isValid)
            throw new app_error_1.UnauthorizedError('Refresh token mismatch');
        req.user = user;
        next();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=auth.js.map