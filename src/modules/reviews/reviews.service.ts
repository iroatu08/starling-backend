import type { User } from '@prisma/client';
import { prisma } from '../../prisma';
import { NotFoundError, ConflictError } from '../../utils/app-error';

export interface ReviewListItem {
  id: string;
  destinationId: string;
  userId: string | null;
  authorName: string;
  rating: number;
  body: string;
  createdAt: Date;
}

function formatAuthor(user: User): string {
  const initial = user.lastName?.trim()?.charAt(0);
  return initial ? `${user.firstName} ${initial}.` : user.firstName;
}

export async function findByDestination(destinationId: string): Promise<{
  reviews: ReviewListItem[];
  averageRating: number;
  count: number;
}> {
  const dest = await prisma.destination.findUnique({ where: { id: destinationId } });
  if (!dest) throw new NotFoundError('Destination not found');

  const reviews = await prisma.destinationReview.findMany({
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

export async function create(destinationId: string, user: User, dto: { rating: number; body: string }): Promise<ReviewListItem> {
  const dest = await prisma.destination.findUnique({ where: { id: destinationId } });
  if (!dest) throw new NotFoundError('Destination not found');

  const existing = await prisma.destinationReview.findFirst({ where: { destinationId, userId: user.id } });
  if (existing) throw new ConflictError('You have already reviewed this destination');

  const authorName = formatAuthor(user);
  const saved = await prisma.destinationReview.create({
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
