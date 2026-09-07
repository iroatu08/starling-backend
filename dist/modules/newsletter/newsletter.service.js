"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribe = subscribe;
const prisma_1 = require("../../prisma");
async function subscribe(dto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await prisma_1.prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) {
        return { message: 'You are already subscribed.' };
    }
    await prisma_1.prisma.newsletterSubscriber.create({ data: { email } });
    return { message: 'Thanks for subscribing!' };
}
//# sourceMappingURL=newsletter.service.js.map