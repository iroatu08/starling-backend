"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
exports.uploadImage = uploadImage;
exports.remove = remove;
const prisma_1 = require("../../prisma");
const cloudinary_1 = require("../../config/cloudinary");
const app_error_1 = require("../../utils/app-error");
async function findAll(destinationId, page = 1, limit = 30) {
    const parsedLimit = Number(limit);
    const parsedPage = Number(page);
    const safeLimit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 30, 1), 60);
    const safePage = Math.max(Number.isFinite(parsedPage) ? parsedPage : 1, 1);
    const rows = await prisma_1.prisma.galleryImage.findMany({
        where: destinationId ? { destinationId } : undefined,
        include: { destination: true },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit + 1,
    });
    const hasMore = rows.length > safeLimit;
    const data = hasMore ? rows.slice(0, safeLimit) : rows;
    return { data, page: safePage, limit: safeLimit, hasMore };
}
async function uploadImage(file, dto) {
    const result = await new Promise((resolve, reject) => {
        cloudinary_1.cloudinary.uploader
            .upload_stream({ folder: 'starlings', resource_type: 'image' }, (error, uploadResult) => {
            if (error || !uploadResult)
                reject(error);
            else
                resolve(uploadResult);
        })
            .end(file.buffer);
    });
    return prisma_1.prisma.galleryImage.create({
        data: {
            destinationId: dto.destinationId,
            cloudinaryPublicId: result.public_id,
            url: result.secure_url,
            altText: dto.altText,
            width: result.width,
            height: result.height,
            isFeatured: dto.isFeatured || false,
        },
    });
}
async function remove(id) {
    const image = await prisma_1.prisma.galleryImage.findUnique({ where: { id } });
    if (!image)
        throw new app_error_1.NotFoundError('Image not found');
    await cloudinary_1.cloudinary.uploader.destroy(image.cloudinaryPublicId);
    await prisma_1.prisma.galleryImage.delete({ where: { id } });
    return { message: 'Image deleted' };
}
//# sourceMappingURL=gallery.service.js.map