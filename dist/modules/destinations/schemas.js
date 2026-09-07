"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destinationsQuerySchema = exports.updateDestinationSchema = exports.createDestinationSchema = void 0;
const zod_1 = require("zod");
const schemas_1 = require("../packages/schemas");
exports.createDestinationSchema = zod_1.z.object({
    name: zod_1.z.string(),
    country: zod_1.z.string(),
    description: zod_1.z.string(),
    heroImageUrl: zod_1.z.string().optional(),
    priceFromNgn: zod_1.z.coerce.number().min(0),
    priceFromUsd: zod_1.z.coerce.number().min(0),
    isFeatured: zod_1.z.boolean().optional(),
    latitude: zod_1.z.coerce.number().optional(),
    longitude: zod_1.z.coerce.number().optional(),
    packages: zod_1.z.array(schemas_1.createPackageSchema).min(1),
}).strict();
exports.updateDestinationSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    heroImageUrl: zod_1.z.string().optional(),
    priceFromNgn: zod_1.z.coerce.number().min(0).optional(),
    priceFromUsd: zod_1.z.coerce.number().min(0).optional(),
    isFeatured: zod_1.z.boolean().optional(),
    latitude: zod_1.z.coerce.number().optional(),
    longitude: zod_1.z.coerce.number().optional(),
    isActive: zod_1.z.boolean().optional(),
}).strict();
exports.destinationsQuerySchema = zod_1.z.object({
    country: zod_1.z.string().optional(),
    featured: zod_1.z.string().optional(),
    minPriceNgn: zod_1.z.string().optional(),
    maxPriceNgn: zod_1.z.string().optional(),
}).passthrough();
//# sourceMappingURL=schemas.js.map