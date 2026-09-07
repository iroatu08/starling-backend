"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByDestination = findByDestination;
exports.create = create;
const prisma_1 = require("../../prisma");
const app_error_1 = require("../../utils/app-error");
function formatAuthor(user) {
    const initial = user.lastName?.trim()?.charAt(0);
    return initial ? `${user.firstName} ${initial}.` : user.firstName;
}
async function findByDestination(destinationId) {
    const dest = await prisma_1.prisma.destination.findUnique({ where: { id: destinationId } });
    if (!dest)
        throw new app_error_1.NotFoundError('Destination not found');
    const reviews = await prisma_1.prisma.destinationReview.findMany({
        where: { destinationId },
        orderBy: { createdAt: 'desc' },
    });
    const count = reviews.length;
    const averageRating = count === 0 ? 0 : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10;
    return {
        reviews: reviews.map((r) => ({
            id: r.id,
            destinationId: r.destinationId,
            userId: r.userId,
            authorName: r.authorName,
            rating: r.rating,
            body: r.body,
            createdAt: r.createdAt,
        })),
        averageRating,
        count,
    };
}
async function create(destinationId, user, dto) {
    const dest = await prisma_1.prisma.destination.findUnique({ where: { id: destinationId } });
    if (!dest)
        throw new app_error_1.NotFoundError('Destination not found');
    const existing = await prisma_1.prisma.destinationReview.findFirst({ where: { destinationId, userId: user.id } });
    if (existing)
        throw new app_error_1.ConflictError('You have already reviewed this destination');
    const authorName = formatAuthor(user);
    const saved = await prisma_1.prisma.destinationReview.create({
        data: {
            destinationId,
            userId: user.id,
            authorName,
            rating: dto.rating,
            body: dto.body.trim(),
        },
    });
    return {
        id: saved.id,
        destinationId: saved.destinationId,
        userId: saved.userId,
        authorName: saved.authorName,
        rating: saved.rating,
        body: saved.body,
        createdAt: saved.createdAt,
    };
}
//# sourceMappingURL=reviews.service.js.map