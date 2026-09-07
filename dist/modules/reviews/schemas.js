"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReviewSchema = void 0;
const zod_1 = require("zod");
exports.createReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    body: zod_1.z.string().min(10).max(2000),
}).strict();
//# sourceMappingURL=schemas.js.map