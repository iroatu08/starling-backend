/**
 * Parses the hostname from a Postgres connection URL for SSL heuristics.
 *
 * @param databaseUrl - e.g. `postgresql://user:pass@host:5432/db`
 * @returns Hostname or null when missing or invalid
 */
function postgresUrlHostname(databaseUrl: string | null | undefined): string | null {
  if (!databaseUrl?.trim()) return null;
  try {
    const normalized = databaseUrl.trim().replace(/^postgres(ql)?:/i, 'http:');
    const parsed = new URL(normalized);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

/**
 * Decides whether the Postgres client must use TLS. Hosted providers (Render, Railway, etc.)
 * often require SSL even when NODE_ENV is not production — local Docker Postgres does not.
 *
 * Precedence:
 * - `DB_SSL=false` disables TLS regardless of URL.
 * - `DB_SSL=true` forces TLS (self-signed tolerated, `sslmode=require`).
 * - `NODE_ENV=production` forces TLS for managed deploys.
 * - Otherwise if `DATABASE_URL` host is non-localhost, TLS is enabled.
 */
export function needsPostgresSsl(options: {
  databaseUrl?: string | null | undefined;
  nodeEnv?: string | null | undefined;
  dbSsl?: string | null | undefined;
}): boolean {
  const { databaseUrl, nodeEnv, dbSsl } = options;
  const flag = dbSsl?.trim().toLowerCase();

  if (flag === 'false') return false;
  if (flag === 'true') return true;
  if (nodeEnv === 'production') return true;

  const host = postgresUrlHostname(databaseUrl ?? undefined);
  if (!host) return false;

  const h = host.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return false;
  // Default Postgres images in Docker Compose rarely enable TLS on the internal service name.
  if (h === 'postgres' || h === 'db' || h === 'database') return false;

  return true;
}

/**
 * Prisma reads SSL mode from the connection string's `sslmode` query param rather than a
 * separate option object (unlike node-pg/TypeORM). This appends `sslmode=require` (no CA
 * verification, matching the old `{ rejectUnauthorized: false }` behavior) when needed,
 * without requiring the raw `DATABASE_URL` in `.env` to be edited.
 */
export function resolvePrismaDatabaseUrl(options: {
  databaseUrl: string;
  nodeEnv?: string | null | undefined;
  dbSsl?: string | null | undefined;
}): string {
  const { databaseUrl, nodeEnv, dbSsl } = options;
  if (!needsPostgresSsl({ databaseUrl, nodeEnv, dbSsl })) return databaseUrl;
  if (/[?&]sslmode=/.test(databaseUrl)) return databaseUrl;
  const separator = databaseUrl.includes('?') ? '&' : '?';
  return `${databaseUrl}${separator}sslmode=require`;
}
