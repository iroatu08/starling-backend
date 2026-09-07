"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommaSeparatedOrigins = parseCommaSeparatedOrigins;
exports.resolveCorsOrigins = resolveCorsOrigins;
/**
 * Splits a comma-separated list of browser origins into trimmed non-empty strings.
 *
 * @param raw - e.g. `https://a.com, http://localhost:5173`
 * @returns Ordered list (duplicates preserved until dedupe by caller)
 */
function parseCommaSeparatedOrigins(raw) {
    if (!raw?.trim())
        return [];
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
/**
 * Resolves allowed CORS `origin` values.
 * Precedence: `ALLOWED_ORIGINS` (if non-empty) → else production uses only `FRONTEND_URL` → else dev merges common local Vite ports.
 *
 * @param env - Typically from `process.env`.
 * @returns A single origin string or an array for multiple allowed origins (credentials-safe).
 */
function resolveCorsOrigins(env) {
    const explicit = parseCommaSeparatedOrigins(env.allowedOriginsRaw);
    if (explicit.length > 0) {
        return explicit.length === 1 ? explicit[0] : explicit;
    }
    const primary = env.frontendUrl?.trim() || 'http://localhost:5173';
    if (env.nodeEnv === 'production') {
        return primary;
    }
    const commonLocal = ['http://localhost:5173', 'http://localhost:5174'];
    const merged = [...new Set([primary, ...commonLocal])];
    return merged.length === 1 ? merged[0] : merged;
}
//# sourceMappingURL=cors-origins.js.map