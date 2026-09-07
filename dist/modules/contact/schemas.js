"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContactSchema = void 0;
const zod_1 = require("zod");
exports.createContactSchema = zod_1.z.object({
    name: zod_1.z.string(),
    email: zod_1.z.string().email(),
    subject: zod_1.z.string().optional(),
    message: zod_1.z.string(),
    budget: zod_1.z.string().optional(),
}).strict();
//# sourceMappingURL=schemas.js.map