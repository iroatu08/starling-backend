"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectRefundSchema = exports.initializePaymentSchema = void 0;
const zod_1 = require("zod");
exports.initializePaymentSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid(),
    email: zod_1.z.string(),
    amount: zod_1.z.coerce.number().min(1).optional(),
    currency: zod_1.z.string().optional(),
    callbackUrl: zod_1.z.string().optional(),
}).strict();
exports.rejectRefundSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(500),
}).strict();
//# sourceMappingURL=schemas.js.map