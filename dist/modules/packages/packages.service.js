"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
exports.findOne = findOne;
const prisma_1 = require("../../prisma");
const app_error_1 = require("../../utils/app-error");
function findAll(destinationId) {
    return prisma_1.prisma.package.findMany({
        where: destinationId ? { destinationId } : undefined,
        include: { destination: true },
        orderBy: { priceNgn: 'asc' },
    });
}
async function findOne(id) {
    const pkg = await prisma_1.prisma.package.findUnique({ where: { id }, include: { destination: true } });
    if (!pkg)
        throw new app_error_1.NotFoundError('Package not found');
    return pkg;
}
//# sourceMappingURL=packages.service.js.map