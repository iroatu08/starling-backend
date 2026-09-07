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
exports.submit = submit;
exports.findAll = findAll;
exports.markRead = markRead;
const prisma_1 = require("../../prisma");
const mailService = __importStar(require("../mail/mail.service"));
async function submit(dto) {
    const submission = await prisma_1.prisma.contactSubmission.create({ data: dto });
    await mailService.sendContactAutoReply(submission);
    await mailService.sendAdminAlert('New Contact Submission', {
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        budget: dto.budget,
    });
    return { message: 'Thank you for your message. We will be in touch shortly.' };
}
async function findAll(page = 1, limit = 20) {
    const [submissions, total] = await Promise.all([
        prisma_1.prisma.contactSubmission.findMany({
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.prisma.contactSubmission.count(),
    ]);
    return { submissions, total, page, limit };
}
async function markRead(id) {
    await prisma_1.prisma.contactSubmission.update({ where: { id }, data: { isRead: true } });
    return { message: 'Marked as read' };
}
//# sourceMappingURL=contact.service.js.map