"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCartItemSchema = exports.addCartItemSchema = void 0;
const zod_1 = require("zod");
exports.addCartItemSchema = zod_1.z.object({
    packageId: zod_1.z.string().uuid().optional(),
    destinationId: zod_1.z.string().uuid().optional(),
    keptPackageIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    removedPackageIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    quantity: zod_1.z.coerce.number().min(1).optional(),
}).strict();
exports.updateCartItemSchema = zod_1.z.object({
    quantity: zod_1.z.coerce.number().min(1).optional(),
    keptPackageIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    removedPackageIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
}).strict();
//# sourceMappingURL=schemas.js.map