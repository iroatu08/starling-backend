"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSendEmailSchema = void 0;
const zod_1 = require("zod");
exports.adminSendEmailSchema = zod_1.z.object({
    toEmail: zod_1.z.string().email().optional(),
    userId: zod_1.z.string().uuid().optional(),
    broadcastToAll: zod_1.z.boolean().optional(),
    subject: zod_1.z.string().min(1),
    htmlBody: zod_1.z.string().min(1),
}).strict();
//# sourceMappingURL=schemas.js.map