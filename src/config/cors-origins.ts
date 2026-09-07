/**
 * Splits a comma-separated list of browser origins into trimmed non-empty strings.
 *
 * @param raw - e.g. `https://a.com, http://localhost:5173`
 * @returns Ordered list (duplicates preserved until dedupe by caller)
 */
export function parseCommaSeparatedOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export type CorsOriginsEnv = {
  /** `ALLOWED_ORIGINS` — comma-separated; when set, replaces default CORS list in all environments. */
  allowedOriginsRaw?: string;
  /** `FRONTEND_URL` — primary site URL; used when `ALLOWED_ORIGINS` is unset. */
  frontendUrl?: string;
  /** `NODE_ENV` — when not `production`, localhost Vite ports are merged unless `ALLOWED_ORIGINS` is set. */
  nodeEnv?: string;
};

/**
 * Resolves allowed CORS `origin` values.
 * Precedence: `ALLOWED_ORIGINS` (if non-empty) → else production uses only `FRONTEND_URL` → else dev merges common local Vite ports.
 *
 * @param env - Typically from `process.env`.
 * @returns A single origin string or an array for multiple allowed origins (credentials-safe).
 */
export function resolveCorsOrigins(env: CorsOriginsEnv): string | string[] {
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
