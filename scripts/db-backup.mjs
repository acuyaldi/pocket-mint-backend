#!/usr/bin/env node
// Logical backup of Pocket Mint's PostgreSQL database via native pg_dump.
// See docs/backup-restore-runbook.md for the full procedure.
//
// Reads credentials ONLY from BACKUP_SOURCE_URL (never DATABASE_URL, so a
// backup is never run by accident against whatever happens to be in .env).
// Never accepts a connection string as a CLI argument (would leak into shell
// history / process list).

import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const sourceUrl = process.env.BACKUP_SOURCE_URL;
if (!sourceUrl) {
  console.error('BACKUP_SOURCE_URL is required (the database to back up). Not read from DATABASE_URL on purpose.');
  process.exit(1);
}

const outDir = process.env.BACKUP_OUTPUT_DIR || join(process.cwd(), 'backups');
mkdirSync(outDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const dbName = new URL(sourceUrl).pathname.replace(/^\//, '') || 'db';
const outFile = join(outDir, `pocketmint_${dbName}_${timestamp}.dump`);

// pg_dump binary resolution: PATH by default; PG_BIN_DIR lets a dev without
// PostgreSQL on PATH (common on Windows) point at an install's bin/ folder.
const pgDump = process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, 'pg_dump') : 'pg_dump';

console.log(`Backing up ${dbName} -> ${outFile}`);
const start = Date.now();

// -Fc: custom format (compressed, required for pg_restore's selective/
// parallel restore). --no-owner/--no-privileges: dump is portable across
// roles (source and restore-target roles won't match in general).
const result = spawnSync(
  pgDump,
  ['--format=custom', '--no-owner', '--no-privileges', '--file', outFile, sourceUrl],
  { stdio: 'inherit' },
);

if (result.status !== 0) {
  console.error(`pg_dump exited with code ${result.status}`);
  process.exit(result.status ?? 1);
}

const durationMs = Date.now() - start;
const { size } = statSync(outFile);
console.log(`Backup complete: ${outFile}`);
console.log(`Duration: ${(durationMs / 1000).toFixed(1)}s, size: ${(size / 1024 / 1024).toFixed(2)} MiB`);
