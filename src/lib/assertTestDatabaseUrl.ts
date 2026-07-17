/**
 * Fail-fast guard for the disposable integration-test database.
 *
 * `TEST_DATABASE_URL` must point at a throwaway local/CI Postgres — never at
 * Supabase or any other shared/production host. This is checked synchronously
 * at test-collection time (before any connection is opened) so a misconfigured
 * env fails the whole suite immediately instead of silently running — or
 * skipping — against the wrong database.
 */

const BLOCKED_HOST_PATTERNS = [/supabase\.co$/i, /supabase\.in$/i, /rds\.amazonaws\.com$/i];
/** Supabase's default database name — a strong signal this isn't a disposable instance. */
const BLOCKED_DATABASE_NAMES = ['postgres'];

export function assertTestDatabaseUrl(rawUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid connection string.');
  }

  const host = url.hostname;
  if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    throw new Error(
      `TEST_DATABASE_URL host "${host}" looks like a production/managed database. ` +
        'Point it at a disposable local or CI-only PostgreSQL instance instead.',
    );
  }

  const databaseName = url.pathname.replace(/^\//, '');
  if (BLOCKED_DATABASE_NAMES.includes(databaseName)) {
    throw new Error(
      `TEST_DATABASE_URL database name "${databaseName}" is Supabase's default database name — ` +
        'this looks like a production/managed database, not a disposable test instance.',
    );
  }
}
