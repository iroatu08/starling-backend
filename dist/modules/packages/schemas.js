"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePackageSchema = exports.createPackageSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createPackageSchema = zod_1.z.object({
    destinationId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string(),
    type: zod_1.z.nativeEnum(client_1.PackageType),
    description: zod_1.z.string().optional(),
    isRemovable: zod_1.z.boolean().optional(),
    includesVisa: zod_1.z.boolean().optional(),
    includesFlight: zod_1.z.boolean().optional(),
    includesHotel: zod_1.z.boolean().optional(),
    includesActivities: zod_1.z.boolean().optional(),
    priceNgn: zod_1.z.coerce.number().min(0),
    priceUsd: zod_1.z.coerce.number().min(0),
    durationDays: zod_1.z.coerce.number().min(1).optional(),
    maxCapacity: zod_1.z.coerce.number().optional(),
}).strict();
exports.updatePackageSchema = exports.createPackageSchema.partial();
//# sourceMappingURL=schemas.js.map