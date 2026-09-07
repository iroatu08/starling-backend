import { Prisma, BookingStatus, PackageType } from '@prisma/client';
import { prisma } from '../../prisma';
import { NotFoundError, ConflictError } from '../../utils/app-error';
import { BookingBundleSnapshot } from '../../types/bundle-snapshot';
import type { CreatePackageInput, UpdatePackageInput } from '../packages/schemas';
import type { z } from 'zod';
import type { createDestinationSchema, updateDestinationSchema } from './schemas';

type CreateDestinationInput = z.infer<typeof createDestinationSchema>;
type UpdateDestinationInput = z.infer<typeof updateDestinationSchema>;

export interface DestinationFilters {
  country?: string;
  featured?: boolean;
  minPriceNgn?: number;
  maxPriceNgn?: number;
}

export function findAll(filters: DestinationFilters = {}) {
  const where: Prisma.DestinationWhereInput = { isActive: true };
  if (filters.country) where.country = filters.country;
  if (filters.featured !== undefined) where.isFeatured = filters.featured;
  if (filters.minPriceNgn !== undefined || filters.maxPriceNgn !== undefined) {
    where.priceFromNgn = {
      ...(filters.minPriceNgn !== undefined ? { gte: filters.minPriceNgn } : {}),
      ...(filters.maxPriceNgn !== undefined ? { lte: filters.maxPriceNgn } : {}),
    };
  }
  return prisma.destination.findMany({
    where,
    include: { packages: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findAllAdmin() {
  const destinations = await prisma.destination.findMany({
    include: { packages: true },
    orderBy: { createdAt: 'desc' },
  });
  // Distinct booking count per destination (matches the original `COUNT(DISTINCT item.bookingId)`).
  const items = await prisma.bookingItem.findMany({
    where: { destinationId: { not: null } },
    select: { destinationId: true, bookingId: true },
  });
  const countMap = new Map<string, Set<string>>();
  for (const row of items) {
    if (!row.destinationId) continue;
    if (!countMap.has(row.destinationId)) countMap.set(row.destinationId, new Set());
    countMap.get(row.destinationId)!.add(row.bookingId);
  }
  return destinations.map((destination) => ({
    ...destination,
    bookingCount: countMap.get(destination.id)?.size ?? 0,
  }));
}

export async function findOne(id: string, options: { includeInactive?: boolean } = {}) {
  const dest = await prisma.destination.findUnique({
    where: { id },
    include: { packages: true, gallery: true },
  });
  if (!dest || (!options.includeInactive && !dest.isActive)) throw new NotFoundError('Destination not found');
  const totalPriceNgn = dest.packages.reduce((sum, pkg) => sum + Number(pkg.priceNgn), 0);
  const totalPriceUsd = dest.packages.reduce((sum, pkg) => sum + Number(pkg.priceUsd), 0);
  return { ...dest, totalPriceNgn, totalPriceUsd };
}

export async function findOneAdmin(id: string) {
  const destination = await findOne(id, { includeInactive: true });
  const bookings = await prisma.bookingItem.findMany({
    where: { destinationId: id },
    include: { booking: { include: { user: true } } },
    orderBy: { booking: { createdAt: 'desc' } },
  });
  return { ...destination, bookings };
}

export async function create(dto: CreateDestinationInput) {
  return prisma.$transaction(async (tx) => {
    const createdDestination = await tx.destination.create({
      data: {
        name: dto.name,
        country: dto.country,
        description: dto.description,
        heroImageUrl: dto.heroImageUrl,
        priceFromNgn: dto.priceFromNgn,
        priceFromUsd: dto.priceFromUsd,
        isFeatured: dto.isFeatured ?? false,
        isActive: true,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    await tx.package.createMany({
      data: dto.packages.map((pkgDto: CreatePackageInput) => ({
        destinationId: createdDestination.id,
        title: pkgDto.name,
        packageType: pkgDto.type,
        description: pkgDto.description,
        isRemovable: pkgDto.isRemovable ?? true,
        includesVisa: pkgDto.includesVisa ?? false,
        includesFlight: pkgDto.includesFlight ?? false,
        includesHotel: pkgDto.includesHotel ?? false,
        includesActivities: pkgDto.includesActivities ?? false,
        priceNgn: pkgDto.priceNgn,
        priceUsd: pkgDto.priceUsd,
        durationDays: pkgDto.durationDays ?? 1,
        maxCapacity: pkgDto.maxCapacity ?? 20,
      })),
    });

    return tx.destination.findUnique({
      where: { id: createdDestination.id },
      include: { packages: true, gallery: true },
    });
  });
}

export async function update(id: string, dto: UpdateDestinationInput) {
  await findOne(id, { includeInactive: true });
  await prisma.destination.update({ where: { id }, data: dto });
  return findOne(id, { includeInactive: true });
}

export async function remove(id: string) {
  await findOne(id, { includeInactive: true });
  await prisma.destination.update({ where: { id }, data: { isActive: false } });
  return { message: 'Destination deactivated' };
}

export async function addPackage(id: string, dto: CreatePackageInput) {
  await findOne(id, { includeInactive: true });
  return prisma.package.create({
    data: {
      destinationId: id,
      title: dto.name,
      packageType: dto.type,
      description: dto.description,
      isRemovable: dto.isRemovable ?? true,
      includesVisa: dto.includesVisa ?? false,
      includesFlight: dto.includesFlight ?? false,
      includesHotel: dto.includesHotel ?? false,
      includesActivities: dto.includesActivities ?? false,
      priceNgn: dto.priceNgn,
      priceUsd: dto.priceUsd,
      durationDays: dto.durationDays ?? 1,
      maxCapacity: dto.maxCapacity ?? 20,
    },
  });
}

export async function updatePackage(destinationId: string, packageId: string, dto: UpdatePackageInput) {
  await findOne(destinationId, { includeInactive: true });
  const pkg = await prisma.package.findFirst({ where: { id: packageId, destinationId } });
  if (!pkg) throw new NotFoundError('Package not found');

  const data: Prisma.PackageUpdateInput = {};
  if (dto.name !== undefined) data.title = dto.name;
  if (dto.type !== undefined) data.packageType = dto.type as PackageType;
  if (dto.description !== undefined) data.description = dto.description;
  if (dto.isRemovable !== undefined) data.isRemovable = dto.isRemovable;
  if (dto.priceNgn !== undefined) data.priceNgn = dto.priceNgn;
  if (dto.priceUsd !== undefined) data.priceUsd = dto.priceUsd;
  if (dto.includesVisa !== undefined) data.includesVisa = dto.includesVisa;
  if (dto.includesFlight !== undefined) data.includesFlight = dto.includesFlight;
  if (dto.includesHotel !== undefined) data.includesHotel = dto.includesHotel;
  if (dto.includesActivities !== undefined) data.includesActivities = dto.includesActivities;
  if (dto.durationDays !== undefined) data.durationDays = dto.durationDays;
  if (dto.maxCapacity !== undefined) data.maxCapacity = dto.maxCapacity;

  await prisma.package.update({ where: { id: packageId }, data });
  return prisma.package.findUnique({ where: { id: packageId } });
}

export async function removePackage(destinationId: string, packageId: string) {
  await findOne(destinationId, { includeInactive: true });
  const pkg = await prisma.package.findFirst({ where: { id: packageId, destinationId } });
  if (!pkg) throw new NotFoundError('Package not found');

  const bookingItems = await prisma.bookingItem.findMany({
    where: {
      destinationId,
      booking: { status: { in: [BookingStatus.confirmed, BookingStatus.completed] } },
    },
    include: { booking: true },
  });

  const usedByConfirmedBooking = bookingItems.some((item) => {
    if (item.packageId === packageId) return true;
    const snapshot = item.bundleSnapshot as unknown as BookingBundleSnapshot | null;
    if (!snapshot) return false;
    const inKept = snapshot.keptPackageIds?.includes(packageId);
    const inSnapshot = snapshot.packagesSnapshot?.some((entry) => entry.id === packageId);
    return Boolean(inKept || inSnapshot);
  });
  if (usedByConfirmedBooking) {
    throw new ConflictError('Cannot remove package because confirmed bookings include this package');
  }

  await prisma.package.delete({ where: { id: packageId } });
  return { message: 'Package deleted' };
}
