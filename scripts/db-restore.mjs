#!/usr/bin/env node
// Restore a pg_dump backup into a target PostgreSQL database via pg_restore.
// See docs/backup-restore-runbook.md for the full procedure.
//
// Reads credentials ONLY from RESTORE_TARGET_URL (never DATABASE_URL).
// Guarded against pointing at production:
//   - RESTORE_TARGET_URL host/db-name must not look like a managed prod DB
//     (mirrors src/lib/assertTestDatabaseUrl.ts's Supabase/RDS blocklist).
//   - CONFIRM_RESTORE=yes must be set explicitly.
//   - Target database must already be empty (no user tables) unless --force
//     is passed, so a restore never silently clobbers existing data.

import { spawnSync } from 'node:child_process';
import { Client } from 'pg';

// Mirrors src/lib/assertTestDatabaseUrl.ts. Duplicated (not imported) because
// this script runs standalone via plain Node, outside the TS build — same
// convention as scripts/run-integration-tests.mjs.
const BLOCKED_HOST_PATTERNS = [/supabase\.co$/i, /supabase\.in$/i, /rds\.amazonaws\.com$/i];
const BLOCKED_DATABASE_NAMES = ['postgres'];

function assertRestoreTargetUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (BLOCKED_HOST_PATTERNS.some((p) => p.test(url.hostname))) {
    throw new Error(
      `RESTORE_TARGET_URL host "${url.hostname}" looks like a production/managed database. ` +
        'Restore into a disposable local/staging database instead.',
    );
  }
  const databaseName = url.pathname.replace(/^\//, '');
  if (BLOCKED_DATABASE_NAMES.includes(databaseName)) {
    throw new Error(
      `RESTORE_TARGET_URL database name "${databaseName}" is Supabase's default database name — ` +
        'this looks like a production database, not a disposable restore target.',
    );
  }
}

async function assertTargetIsEmpty(url, force) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
    );
    const tableCount = rows[0].n;
    if (tableCount > 0 && !force) {
      throw new Error(
        `RESTORE_TARGET_URL already has ${tableCount} table(s) in schema 'public'. ` +
          'Refusing to restore over existing data. Pass --force to override.',
      );
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const dumpFile = process.argv[2];
  if (!dumpFile || dumpFile.startsWith('--')) {
    console.error('Usage: node scripts/db-restore.mjs <dump-file> [--force]');
    process.exit(1);
  }
  const force = process.argv.includes('--force');

  const targetUrl = process.env.RESTORE_TARGET_URL;
  if (!targetUrl) {
    console.error('RESTORE_TARGET_URL is required (the database to restore into). Not read from DATABASE_URL.');
    process.exit(1);
  }
  if (process.env.CONFIRM_RESTORE !== 'yes') {
    console.error('Refusing to restore: set CONFIRM_RESTORE=yes to confirm you intend to overwrite RESTORE_TARGET_URL.');
    process.exit(1);
  }

  assertRestoreTargetUrl(targetUrl);
  await assertTargetIsEmpty(targetUrl, force);

  const pgRestore = process.env.PG_BIN_DIR ? `${process.env.PG_BIN_DIR}/pg_restore` : 'pg_restore';
  const dbName = new URL(targetUrl).pathname.replace(/^\//, '');

  console.log(`Restoring ${dumpFile} -> ${dbName}`);
  const start = Date.now();

  const result = spawnSync(
    pgRestore,
    ['--no-owner', '--no-privileges', '--clean', '--if-exists', '--dbname', targetUrl, dumpFile],
    { stdio: 'inherit' },
  );

  // pg_restore exits 1 on warnings (e.g. "role does not exist" from --clean on
  // an empty DB) even when the restore itself succeeded; only treat >1 as fatal.
  if ((result.status ?? 1) > 1) {
    console.error(`pg_restore exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }

  const durationMs = Date.now() - start;
  console.log(`Restore complete. Duration: ${(durationMs / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
