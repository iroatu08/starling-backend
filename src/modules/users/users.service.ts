import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../prisma';
import { toPublicUser } from '../../utils/sanitize-user';
import { NotFoundError } from '../../utils/app-error';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');
  return toPublicUser(user);
}

export async function updateMe(userId: string, dto: Prisma.UserUpdateInput) {
  await prisma.user.update({ where: { id: userId }, data: dto });
  return getMe(userId);
}

export async function findAll(page = 1, limit = 20, search?: string) {
  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users: users.map((u) => toPublicUser(u)), total, page, limit };
}

/** Admin-only free-form update (role, isActive, isVerified, etc.) — unrecognized keys are dropped. */
export async function updateUserAdmin(userId: string, updates: Record<string, unknown>) {
  const allowedKeys = [
    'firstName',
    'lastName',
    'phone',
    'address',
    'preferences',
    'role',
    'isVerified',
    'isActive',
  ] as const;
  const data: Prisma.UserUpdateInput = {};
  for (const key of allowedKeys) {
    if (updates[key] !== undefined) {
      (data as Record<string, unknown>)[key] = key === 'role' ? (updates[key] as UserRole) : updates[key];
    }
  }
  await prisma.user.update({ where: { id: userId }, data });
  return getMe(userId);
}

export async function countUsers(): Promise<number> {
  return prisma.user.count();
}

export async function findEmailById(id: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) throw new NotFoundError('User not found');
  return user.email;
}

export async function getVerifiedUserEmails(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { isVerified: true, isActive: true },
    select: { email: true },
  });
  return users.map((u) => u.email);
}
