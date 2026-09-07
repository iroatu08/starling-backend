"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUuidParam = requireUuidParam;
const uuid_1 = require("uuid");
const app_error_1 = require("../utils/app-error");
/** Port of `ParseUUIDPipe` (`parse-uuid.pipe.ts`) as an Express param validator. */
function requireUuidParam(paramName) {
    return (req, _res, next) => {
        const value = req.params[paramName];
        if (!(0, uuid_1.validate)(value)) {
            next(new app_error_1.BadRequestError(`"${value}" is not a valid UUID`));
            return;
        }
        next();
    };
}
//# sourceMappingURL=uuid-param.js.map