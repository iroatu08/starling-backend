"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageSchema = void 0;
const zod_1 = require("zod");
/** Matches Nest's implicit-conversion boolean coercion for multipart string fields ("true"/"false"). */
const implicitBoolean = zod_1.z.preprocess((val) => {
    if (typeof val === 'string') {
        if (val === 'true')
            return true;
        if (val === 'false')
            return false;
    }
    return val;
}, zod_1.z.boolean());
exports.uploadImageSchema = zod_1.z.object({
    destinationId: zod_1.z.string().uuid().optional(),
    altText: zod_1.z.string().optional(),
    isFeatured: implicitBoolean.optional(),
}).strict();
//# sourceMappingURL=schemas.js.map