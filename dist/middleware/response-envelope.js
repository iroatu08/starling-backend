"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseEnvelope = responseEnvelope;
/** Port of Nest's `TransformInterceptor` — attaches `res.success(data)` to every request. */
function responseEnvelope(_req, res, next) {
    res.success = (data) => {
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString(),
        });
    };
    next();
}
//# sourceMappingURL=response-envelope.js.map