# Database backup & restore runbook (PM-STAB-010C)

Pocket Mint's database is PostgreSQL 18, hosted on Supabase, migrated with
Prisma Migrate (see `docs/deployment-runbook.md`). This runbook covers the
manual logical-backup / restore path — a controlled, testable procedure that
doesn't depend on anyone remembering the steps.

## 1. Three distinct things — don't confuse them

| Need | Tool | Where |
|---|---|---|
| **Provider-managed backup** | Supabase's built-in daily backups (Point-in-Time-Recovery on paid plans) | Supabase Dashboard → Project Settings → Database → Backups. First line of defense; not scripted here, not controlled by this repo. **Verify retention/PITR is actually enabled for the production project** — this runbook does not turn it on. |
| **Manual logical backup / restore** | `pg_dump` / `pg_restore` (native Postgres tools) via `scripts/db-backup.mjs` / `scripts/db-restore.mjs` | This document. Used for ad-hoc snapshots before a risky migration, exporting for local debugging, or as a second copy independent of the provider. |
| **Migration rollback** | `prisma migrate resolve` / a hand-written down-migration, per `docs/deployment-runbook.md` | Undoes a *schema* change going forward. **Not** the same as restoring data — some migrations (e.g. `generalize_wallets_and_bills`) are documented as not cleanly reversible and explicitly call for a backup restore instead (`docs/deployment-runbook.md:184-186`). |

A backup/restore drill answers "can we get the data back", not "can we undo a
migration" — those are separate failure modes with separate procedures.

## 2. Prerequisites

- PostgreSQL 18 client tools (`pg_dump`, `pg_restore`, `psql`) — must match
  (or exceed) the server's major version. Not bundled with this repo's
  `embedded-postgres` dev dependency (that only ships a minimal server
  runtime for integration tests, no client binaries). Install separately:
  - Windows: `winget install PostgreSQL.PostgreSQL.18`, then either add
    `C:\Program Files\PostgreSQL\18\bin` to `PATH` or set `PG_BIN_DIR` (see
    below) to that folder.
  - Linux/CI: `apt-get install postgresql-client-18` or use the `postgres:18`
    Docker image.
- Node.js (already required for this repo) — the scripts are thin wrappers
  around the native tools plus the `pg` package already in `dependencies`.
- **Never put a connection string in a script, commit, or shell history file.**
  All three scripts below read credentials exclusively from environment
  variables passed at invocation time.

## 3. Backup

```bash
BACKUP_SOURCE_URL="postgresql://<user>:<pass>@<host>:<port>/<db>" \
  npm run db:backup
```

- `BACKUP_SOURCE_URL` is **required** and is deliberately a separate variable
  from `DATABASE_URL` — the script never falls back to `.env`'s
  `DATABASE_URL`, so running a backup can't happen "by accident" against
  whatever a developer's shell happens to have exported, and conversely a
  backup of production is an explicit, visible action.
- Runs `pg_dump --format=custom --no-owner --no-privileges` (`scripts/db-backup.mjs`).
  Custom format because it's compressed and is what `pg_restore` needs for
  selective/parallel restore; `--no-owner`/`--no-privileges` because the
  restore target's roles will generally not match the source's.
- **Output location**: `backups/pocketmint_<db>_<ISO-timestamp>.dump` under
  the current working directory by default; override with
  `BACKUP_OUTPUT_DIR`. `backups/` is gitignored — dumps contain user
  financial data and must never be committed.
- **Encryption / access**: the `.dump` file is **not encrypted at rest** by
  the script. Treat it like any other copy of production data: store it
  somewhere access-controlled (private bucket with server-side encryption,
  encrypted disk), and if it leaves a trusted machine, encrypt it first
  (e.g. `age -e` or `gpg -e`). Do not leave backups on a shared/laptop
  filesystem beyond the immediate task.
- **Retention**: no automatic retention is implemented here — that's the
  provider-managed backups' job (§1). Manual dumps taken with this script are
  point-in-time snapshots for a specific task; delete them once the task
  (migration window, investigation, drill) is done rather than accumulating
  them.
- Prints **duration and file size** on completion — record these for the
  RPO/RTO discussion below.

## 4. Restore

```bash
RESTORE_TARGET_URL="postgresql://<user>:<pass>@<host>:<port>/<empty-db>" \
CONFIRM_RESTORE=yes \
  npm run db:restore -- backups/pocketmint_xxx.dump
```

- `RESTORE_TARGET_URL` is **required**, separate from `DATABASE_URL`, same
  reasoning as backup.
- `CONFIRM_RESTORE=yes` must be set explicitly — a second, deliberate
  affirmation beyond just having the URL in hand.
- **Production guard**: `scripts/db-restore.mjs` rejects the target URL if
  its host matches Supabase/RDS patterns or its database name is `postgres`
  (Supabase's default) — the same blocklist already used by
  `src/lib/assertTestDatabaseUrl.ts` for the integration-test DB. This makes
  it hard to point a restore at a managed production database by mistake;
  it is not a substitute for care in choosing the target.
- **Empty-target guard**: the script queries `information_schema.tables`
  first and refuses to run if the target already has tables, unless you pass
  `--force`. A restore should go into a fresh/empty database — restoring
  into a populated one is `pg_restore --clean`, which drops and recreates
  objects and is a data-loss operation on whatever was there.
- Runs `pg_restore --no-owner --no-privileges --clean --if-exists`.
- **Failure handling**: `pg_restore` exits `1` on non-fatal warnings (e.g.
  `--clean` trying to drop a role that doesn't exist on an empty DB) — the
  script only treats exit codes `>1` as fatal and surfaces the underlying
  `pg_restore` output either way (`stdio: 'inherit'`), so a real failure is
  visible, not swallowed. If a restore fails partway, the target database is
  left in a *partial* state — do not point the app at it; drop it and retry
  into a fresh database.

## 5. Verification

```bash
VERIFY_DATABASE_URL="postgresql://<user>:<pass>@<host>:<port>/<restored-db>" \
  npm run db:verify
```

`scripts/db-verify.mjs` checks, against the restored database:
- Row counts for `users`, `wallets`, `transactions`, `installments`,
  `categories`.
- Foreign-key integrity: orphan checks for `wallets.user_id`,
  `transactions.wallet_id`, `transactions.user_id`,
  `installments.wallet_id`, plus a count of FK constraints present in the
  schema (catches a restore that silently dropped constraints).
- Exits non-zero (`VERIFY FAILED`) if any orphaned row is found.

This covers schema + data integrity. The remaining acceptance bar — "can the
app actually read this" — is a real smoke test, not just row counts: start
the app against the restored database (`DATABASE_URL` pointed at it) and
call an authenticated read endpoint (e.g. `GET /api/v1/dashboard/summary`,
`GET /api/v1/wallets`) with a valid JWT. See §6 for the drill that did
exactly this.

## 6. RPO / RTO (simple)

Based on the measured drill in §7 (small dataset — scale these before
trusting them at production data volume):

- **RPO (Recovery Point Objective): ≤ 24 hours.** Driven by Supabase's daily
  managed backups (§1) as the baseline; take a manual backup (§3) before any
  risky migration or deploy to shrink this to "just before the change" for
  that specific window.
- **RTO (Recovery Time Objective): ~15 minutes** for a database this size —
  dominated by provisioning a target database and running
  `prisma migrate deploy` to bring schema up to date, not by `pg_restore`
  itself (which took well under a second on the drill dataset). Re-measure
  against a production-sized dump before relying on this number for an
  actual incident.

## 7. Test evidence (non-production drill, run 2026-07-18)

Ran end-to-end against a disposable local PostgreSQL 18 instance (not
Supabase, not any shared database) — matches production's engine/version.

1. **Source DB**: fresh disposable Postgres 18 on `localhost:55444`,
   `pocketmint_src`, schema provisioned via `npx prisma migrate deploy`
   (all 5 repo migrations applied cleanly), seeded with representative data:
   2 users, 3 wallets, 3 categories, 1 installment, 3 transactions.
2. **Backup**: `npm run db:backup` → succeeded.
   Duration: **0.1s**. Size: **~20 KB** (small seed dataset).
3. **Restore guard checks** (all confirmed working before the real restore):
   - Missing `RESTORE_TARGET_URL` → rejected.
   - `*.supabase.co` host → rejected ("looks like a production/managed database").
   - Database name `postgres` → rejected.
   - Missing `CONFIRM_RESTORE=yes` → rejected.
   - Restoring into a non-empty database without `--force` → rejected
     ("already has 6 table(s)").
4. **Restore**: into a fresh empty `pocketmint_restored` database on the same
   disposable instance → succeeded. Duration: **0.4s**.
5. **Verification** (`npm run db:verify`) — restored counts matched source
   exactly:
   ```
   Row counts: { users: 2, wallets: 3, transactions: 3, installments: 1, categories: 3 }
   FK checks: 0 orphaned rows (wallets→users, transactions→wallets,
              transactions→users, installments→wallets)
   Foreign key constraints present: 9
   VERIFY OK
   ```
6. **App start + read smoke test**: built (`npm run build`) and started
   (`node dist/server.js`) with `DATABASE_URL` pointed at
   `pocketmint_restored`. Confirmed:
   - `GET /health` → `200 {"status":"ok",...}`.
   - Minted a JWT (HS256, signed with a local test-only
     `SUPABASE_JWT_SECRET`, `sub` = a seeded user's id) and called:
     - `GET /api/v1/dashboard/summary` → `200 {"total_aset":3000000,"total_utang":0,"net_worth":3000000}`
       — correctly sums the seeded user's two wallet balances
       (500,000 + 2,500,000).
     - `GET /api/v1/wallets` → `200`, returned both of that user's wallets
       with correct balances.
   This confirms the app can start against a restored database and read
   real data through the normal authenticated request path, not just via
   direct SQL.
7. **Cleanup**: app process and disposable Postgres instance stopped, data
   directory deleted. No secrets or dump files were committed to git (backup
   output was written to a scratch/temp directory outside the repo,
   `backups/` is gitignored regardless).

No credentials were hardcoded anywhere; every script call above passed its
connection string via an environment variable at invocation time only.
