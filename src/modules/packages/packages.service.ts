import { prisma } from '../../prisma';
import { NotFoundError } from '../../utils/app-error';

export function findAll(destinationId?: string) {
  return prisma.package.findMany({
    where: destinationId ? { destinationId } : undefined,
    include: { destination: true },
    orderBy: { priceNgn: 'asc' },
  });
}

export async function findOne(id: string) {
  const pkg = await prisma.package.findUnique({ where: { id }, include: { destination: true } });
  if (!pkg) throw new NotFoundError('Package not found');
  return pkg;
}
