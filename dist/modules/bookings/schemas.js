"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestRefundSchema = exports.createBookingSchema = exports.bookingTravelerSchema = void 0;
const zod_1 = require("zod");
exports.bookingTravelerSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(80),
    lastName: zod_1.z.string().min(1).max(80),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().max(40).optional(),
    isPrimary: zod_1.z.boolean().optional(),
}).strict();
exports.createBookingSchema = zod_1.z.object({
    travelers: zod_1.z.array(exports.bookingTravelerSchema).min(1).max(30).optional(),
}).strict();
exports.requestRefundSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(500),
}).strict();
//# sourceMappingURL=schemas.js.map