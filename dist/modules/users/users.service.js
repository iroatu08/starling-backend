"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = getMe;
exports.updateMe = updateMe;
exports.findAll = findAll;
exports.updateUserAdmin = updateUserAdmin;
exports.countUsers = countUsers;
exports.findEmailById = findEmailById;
exports.getVerifiedUserEmails = getVerifiedUserEmails;
const prisma_1 = require("../../prisma");
const sanitize_user_1 = require("../../utils/sanitize-user");
const app_error_1 = require("../../utils/app-error");
async function getMe(userId) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new app_error_1.NotFoundError('User not found');
    return (0, sanitize_user_1.toPublicUser)(user);
}
async function updateMe(userId, dto) {
    await prisma_1.prisma.user.update({ where: { id: userId }, data: dto });
    return getMe(userId);
}
async function findAll(page = 1, limit = 20, search) {
    const where = search
        ? {
            OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ],
        }
        : {};
    const [users, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.prisma.user.count({ where }),
    ]);
    return { users: users.map((u) => (0, sanitize_user_1.toPublicUser)(u)), total, page, limit };
}
/** Admin-only free-form update (role, isActive, isVerified, etc.) — unrecognized keys are dropped. */
async function updateUserAdmin(userId, updates) {
    const allowedKeys = [
        'firstName',
        'lastName',
        'phone',
        'address',
        'preferences',
        'role',
        'isVerified',
        'isActive',
    ];
    const data = {};
    for (const key of allowedKeys) {
        if (updates[key] !== undefined) {
            data[key] = key === 'role' ? updates[key] : updates[key];
        }
    }
    await prisma_1.prisma.user.update({ where: { id: userId }, data });
    return getMe(userId);
}
async function countUsers() {
    return prisma_1.prisma.user.count();
}
async function findEmailById(id) {
    const user = await prisma_1.prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user)
        throw new app_error_1.NotFoundError('User not found');
    return user.email;
}
async function getVerifiedUserEmails() {
    const users = await prisma_1.prisma.user.findMany({
        where: { isVerified: true, isActive: true },
        select: { email: true },
    });
    return users.map((u) => u.email);
}
//# sourceMappingURL=users.service.js.map