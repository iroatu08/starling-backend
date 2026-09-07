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
exports.getStats = getStats;
exports.sendEmail = sendEmail;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../prisma");
const app_error_1 = require("../../utils/app-error");
const sanitize_user_1 = require("../../utils/sanitize-user");
const usersService = __importStar(require("../users/users.service"));
const mailService = __importStar(require("../mail/mail.service"));
async function getStats() {
    const totalBookings = await prisma_1.prisma.booking.count();
    const totalUsers = await usersService.countUsers();
    const succeeded = await prisma_1.prisma.payment.findMany({ where: { status: client_1.PaymentStatus.succeeded } });
    const revenueNgn = succeeded.reduce((sum, p) => sum + Number(p.amountNgn), 0);
    const recentBookings = await prisma_1.prisma.booking.findMany({
        include: { user: true, payment: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });
    return {
        totalBookings,
        totalUsers,
        revenueNgn,
        recentBookings: recentBookings.map((b) => (0, sanitize_user_1.sanitizeBooking)(b)),
    };
}
async function sendEmail(dto) {
    if (dto.broadcastToAll) {
        const emails = await usersService.getVerifiedUserEmails();
        for (const email of emails) {
            await mailService.sendHtmlEmail(email, dto.subject, dto.htmlBody);
        }
        return { message: `Sent to ${emails.length} verified users.` };
    }
    let to = dto.toEmail || null;
    if (!to && dto.userId) {
        to = await usersService.findEmailById(dto.userId);
    }
    if (!to)
        throw new app_error_1.BadRequestError('Provide toEmail, userId, or broadcastToAll');
    await mailService.sendHtmlEmail(to, dto.subject, dto.htmlBody);
    return { message: 'Email sent successfully.' };
}
//# sourceMappingURL=admin.service.js.map