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
exports.register = register;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.verifyEmail = verifyEmail;
exports.forgotPassword = forgotPassword;
exports.changePassword = changePassword;
exports.resetPassword = resetPassword;
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const prisma_1 = require("../../prisma");
const env_1 = require("../../config/env");
const sanitize_user_1 = require("../../utils/sanitize-user");
const mailService = __importStar(require("../mail/mail.service"));
const app_error_1 = require("../../utils/app-error");
async function generateTokens(user) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
        new Promise((resolve, reject) => {
            jwt.sign(payload, env_1.env.JWT_ACCESS_SECRET, { expiresIn: env_1.env.JWT_ACCESS_EXPIRES_IN }, (err, token) => (err || !token ? reject(err) : resolve(token)));
        }),
        new Promise((resolve, reject) => {
            jwt.sign(payload, env_1.env.JWT_REFRESH_SECRET, { expiresIn: env_1.env.JWT_REFRESH_EXPIRES_IN }, (err, token) => (err || !token ? reject(err) : resolve(token)));
        }),
    ]);
    return { accessToken, refreshToken };
}
async function storeRefreshToken(userId, token) {
    const hash = await bcrypt.hash(token, 10);
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: hash } });
}
function setRefreshCookie(res, token) {
    res.cookie('refresh_token', token, {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
}
async function register(dto) {
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing)
        throw new app_error_1.ConflictError('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = (0, uuid_1.v4)();
    const { password: _pw, ...rest } = dto;
    const user = await prisma_1.prisma.user.create({
        data: { ...rest, passwordHash, verificationToken },
    });
    await mailService.sendVerificationEmail(user, verificationToken);
    await mailService.sendWelcome(user);
    return { message: 'Registration successful. Please check your email to verify your account.' };
}
async function login(dto, res) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user)
        throw new app_error_1.UnauthorizedError('Invalid credentials');
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch)
        throw new app_error_1.UnauthorizedError('Invalid credentials');
    if (!user.isVerified)
        throw new app_error_1.UnauthorizedError('Please verify your email first');
    if (!user.isActive)
        throw new app_error_1.UnauthorizedError('Account is deactivated');
    const tokens = await generateTokens(user);
    await storeRefreshToken(user.id, tokens.refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, user: (0, sanitize_user_1.toPublicUser)(user) };
}
async function refresh(user, res) {
    const tokens = await generateTokens(user);
    await storeRefreshToken(user.id, tokens.refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
}
async function logout(user, res) {
    await prisma_1.prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: null } });
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
}
async function verifyEmail(token) {
    const user = await prisma_1.prisma.user.findFirst({ where: { verificationToken: token } });
    if (!user)
        throw new app_error_1.NotFoundError('Invalid or expired verification token');
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, verificationToken: null },
    });
    return { message: 'Email verified successfully. You can now log in.' };
}
async function forgotPassword(email) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    // Always return success to avoid user enumeration
    if (!user)
        return { message: 'If that email exists, a reset link has been sent.' };
    const token = (0, uuid_1.v4)();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { resetPasswordToken: token, resetPasswordExpires: expires },
    });
    await mailService.sendPasswordReset(user, token);
    return { message: 'If that email exists, a reset link has been sent.' };
}
async function changePassword(userId, currentPassword, newPassword) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new app_error_1.NotFoundError('User not found');
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match)
        throw new app_error_1.UnauthorizedError('Current password is incorrect');
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    return { message: 'Password updated successfully.' };
}
async function resetPassword(token, newPassword) {
    const user = await prisma_1.prisma.user.findFirst({ where: { resetPasswordToken: token } });
    if (!user)
        throw new app_error_1.BadRequestError('Invalid or expired reset token');
    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        throw new app_error_1.BadRequestError('Reset token has expired. Please request a new one.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
    });
    return { message: 'Password reset successfully. You can now log in.' };
}
//# sourceMappingURL=auth.service.js.map