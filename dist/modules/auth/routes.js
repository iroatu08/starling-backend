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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authService = __importStar(require("./auth.service"));
const error_handler_1 = require("../../middleware/error-handler");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const schemas_1 = require("./schemas");
exports.authRouter = (0, express_1.Router)();
// Matches the Nest controller's `@Throttle({ default: { limit: 10, ttl: 60000 } })` on the whole controller.
exports.authRouter.use((0, express_rate_limit_1.default)({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }));
exports.authRouter.post('/register', (0, validate_1.validateBody)(schemas_1.registerSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const result = await authService.register(req.body);
    res.success(result);
}));
exports.authRouter.post('/login', (0, validate_1.validateBody)(schemas_1.loginSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const result = await authService.login(req.body, res);
    res.success(result);
}));
exports.authRouter.post('/refresh', auth_1.requireRefreshCookie, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const result = await authService.refresh(req.user, res);
    res.success(result);
}));
exports.authRouter.post('/logout', auth_1.requireAuth, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const result = await authService.logout(req.user, res);
    res.success(result);
}));
exports.authRouter.get('/verify/:token', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const result = await authService.verifyEmail(req.params.token);
    res.success(result);
}));
exports.authRouter.post('/forgot-password', (0, validate_1.validateBody)(schemas_1.forgotPasswordSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    res.success(result);
}));
exports.authRouter.post('/reset-password', (0, validate_1.validateBody)(schemas_1.resetPasswordSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const result = await authService.resetPassword(req.body.token, req.body.newPassword);
    res.success(result);
}));
exports.authRouter.patch('/password', auth_1.requireAuth, (0, validate_1.validateBody)(schemas_1.changePasswordSchema), (0, error_handler_1.asyncHandler)(async (req, res) => {
    const result = await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.success(result);
}));
//# sourceMappingURL=routes.js.map