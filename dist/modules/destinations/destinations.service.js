"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
exports.findAllAdmin = findAllAdmin;
exports.findOne = findOne;
exports.findOneAdmin = findOneAdmin;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.addPackage = addPackage;
exports.updatePackage = updatePackage;
exports.removePackage = removePackage;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../prisma");
const app_error_1 = require("../../utils/app-error");
function findAll(filters = {}) {
    const where = { isActive: true };
    if (filters.country)
        where.country = filters.country;
    if (filters.featured !== undefined)
        where.isFeatured = filters.featured;
    if (filters.minPriceNgn !== undefined || filters.maxPriceNgn !== undefined) {
        where.priceFromNgn = {
            ...(filters.minPriceNgn !== undefined ? { gte: filters.minPriceNgn } : {}),
            ...(filters.maxPriceNgn !== undefined ? { lte: filters.maxPriceNgn } : {}),
        };
    }
    return prisma_1.prisma.destination.findMany({
        where,
        include: { packages: true },
        orderBy: { createdAt: 'desc' },
    });
}
async function findAllAdmin() {
    const destinations = await prisma_1.prisma.destination.findMany({
        include: { packages: true },
        orderBy: { createdAt: 'desc' },
    });
    // Distinct booking count per destination (matches the original `COUNT(DISTINCT item.bookingId)`).
    const items = await prisma_1.prisma.bookingItem.findMany({
        where: { destinationId: { not: null } },
        select: { destinationId: true, bookingId: true },
    });
    const countMap = new Map();
    for (const row of items) {
        if (!row.destinationId)
            continue;
        if (!countMap.has(row.destinationId))
            countMap.set(row.destinationId, new Set());
        countMap.get(row.destinationId).add(row.bookingId);
    }
    return destinations.map((destination) => ({
        ...destination,
        bookingCount: countMap.get(destination.id)?.size ?? 0,
    }));
}
async function findOne(id, options = {}) {
    const dest = await prisma_1.prisma.destination.findUnique({
        where: { id },
        include: { packages: true, gallery: true },
    });
    if (!dest || (!options.includeInactive && !dest.isActive))
        throw new app_error_1.NotFoundError('Destination not found');
    const totalPriceNgn = dest.packages.reduce((sum, pkg) => sum + Number(pkg.priceNgn), 0);
    const totalPriceUsd = dest.packages.reduce((sum, pkg) => sum + Number(pkg.priceUsd), 0);
    return { ...dest, totalPriceNgn, totalPriceUsd };
}
async function findOneAdmin(id) {
    const destination = await findOne(id, { includeInactive: true });
    const bookings = await prisma_1.prisma.bookingItem.findMany({
        where: { destinationId: id },
        include: { booking: { include: { user: true } } },
        orderBy: { booking: { createdAt: 'desc' } },
    });
    return { ...destination, bookings };
}
async function create(dto) {
    return prisma_1.prisma.$transaction(async (tx) => {
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
            data: dto.packages.map((pkgDto) => ({
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
async function update(id, dto) {
    await findOne(id, { includeInactive: true });
    await prisma_1.prisma.destination.update({ where: { id }, data: dto });
    return findOne(id, { includeInactive: true });
}
async function remove(id) {
    await findOne(id, { includeInactive: true });
    await prisma_1.prisma.destination.update({ where: { id }, data: { isActive: false } });
    return { message: 'Destination deactivated' };
}
async function addPackage(id, dto) {
    await findOne(id, { includeInactive: true });
    return prisma_1.prisma.package.create({
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
async function updatePackage(destinationId, packageId, dto) {
    await findOne(destinationId, { includeInactive: true });
    const pkg = await prisma_1.prisma.package.findFirst({ where: { id: packageId, destinationId } });
    if (!pkg)
        throw new app_error_1.NotFoundError('Package not found');
    const data = {};
    if (dto.name !== undefined)
        data.title = dto.name;
    if (dto.type !== undefined)
        data.packageType = dto.type;
    if (dto.description !== undefined)
        data.description = dto.description;
    if (dto.isRemovable !== undefined)
        data.isRemovable = dto.isRemovable;
    if (dto.priceNgn !== undefined)
        data.priceNgn = dto.priceNgn;
    if (dto.priceUsd !== undefined)
        data.priceUsd = dto.priceUsd;
    if (dto.includesVisa !== undefined)
        data.includesVisa = dto.includesVisa;
    if (dto.includesFlight !== undefined)
        data.includesFlight = dto.includesFlight;
    if (dto.includesHotel !== undefined)
        data.includesHotel = dto.includesHotel;
    if (dto.includesActivities !== undefined)
        data.includesActivities = dto.includesActivities;
    if (dto.durationDays !== undefined)
        data.durationDays = dto.durationDays;
    if (dto.maxCapacity !== undefined)
        data.maxCapacity = dto.maxCapacity;
    await prisma_1.prisma.package.update({ where: { id: packageId }, data });
    return prisma_1.prisma.package.findUnique({ where: { id: packageId } });
}
async function removePackage(destinationId, packageId) {
    await findOne(destinationId, { includeInactive: true });
    const pkg = await prisma_1.prisma.package.findFirst({ where: { id: packageId, destinationId } });
    if (!pkg)
        throw new app_error_1.NotFoundError('Package not found');
    const bookingItems = await prisma_1.prisma.bookingItem.findMany({
        where: {
            destinationId,
            booking: { status: { in: [client_1.BookingStatus.confirmed, client_1.BookingStatus.completed] } },
        },
        include: { booking: true },
    });
    const usedByConfirmedBooking = bookingItems.some((item) => {
        if (item.packageId === packageId)
            return true;
        const snapshot = item.bundleSnapshot;
        if (!snapshot)
            return false;
        const inKept = snapshot.keptPackageIds?.includes(packageId);
        const inSnapshot = snapshot.packagesSnapshot?.some((entry) => entry.id === packageId);
        return Boolean(inKept || inSnapshot);
    });
    if (usedByConfirmedBooking) {
        throw new app_error_1.ConflictError('Cannot remove package because confirmed bookings include this package');
    }
    await prisma_1.prisma.package.delete({ where: { id: packageId } });
    return { message: 'Package deleted' };
}
//# sourceMappingURL=destinations.service.js.map