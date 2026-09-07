"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeNewsletterSchema = void 0;
const zod_1 = require("zod");
exports.subscribeNewsletterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
}).strict();
//# sourceMappingURL=schemas.js.map