import { prisma } from '../../prisma';
import { cloudinary } from '../../config/cloudinary';
import { NotFoundError } from '../../utils/app-error';

export async function findAll(destinationId?: string, page: number | string = 1, limit: number | string = 30) {
  const parsedLimit = Number(limit);
  const parsedPage = Number(page);
  const safeLimit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 30, 1), 60);
  const safePage = Math.max(Number.isFinite(parsedPage) ? parsedPage : 1, 1);

  const rows = await prisma.galleryImage.findMany({
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

export async function uploadImage(
  file: Express.Multer.File,
  dto: { destinationId?: string; altText?: string; isFeatured?: boolean },
) {
  const result = await new Promise<{ public_id: string; secure_url: string; width: number; height: number }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'starlings', resource_type: 'image' }, (error, uploadResult) => {
          if (error || !uploadResult) reject(error);
          else resolve(uploadResult as { public_id: string; secure_url: string; width: number; height: number });
        })
        .end(file.buffer);
    },
  );

  return prisma.galleryImage.create({
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

export async function remove(id: string) {
  const image = await prisma.galleryImage.findUnique({ where: { id } });
  if (!image) throw new NotFoundError('Image not found');

  await cloudinary.uploader.destroy(image.cloudinaryPublicId);
  await prisma.galleryImage.delete({ where: { id } });
  return { message: 'Image deleted' };
}
