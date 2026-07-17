# Prisma migration baseline reconstruction & reconciliation

How to provision a fresh Pocket Mint database, and how to reconcile the existing
staging/production databases with the reconstructed migration history.

No secret values or connection URLs appear in this document. Every `<...>` is a
placeholder. Commands that touch a shared database are marked
**⚠ MANUAL — run yourself after review**; nothing here is executed automatically.

Companion to [`deployment-runbook.md`](./deployment-runbook.md).

---

## 1. The blocker

`prisma migrate status` reported:

```
The last common migration is: null
The migrations have not yet been applied:
  20260711172700_remove_local_user_password
  20260711223000_add_transaction_to_wallet
The migrations from the database are not found locally in prisma/migrations:
  20260612031023_init
  20260613000000_rename_account_to_wallet
  20260613000000_rename_account_to_wallet
```

The two directories that originally created the schema —
`20260612031023_init` and `20260613000000_rename_account_to_wallet` — were never
committed to `prisma/migrations/`. The local history therefore begins with two
`ALTER TABLE` migrations that assume tables which no `CREATE TABLE` ever makes on
an empty database. Result: **a fresh database cannot be provisioned from the
repository**, and local vs remote history diverge (`last common migration: null`).

## 2. Root cause

Missing baseline. The repo's local migration chain lost its foundational
`CREATE TABLE`/`CREATE TYPE` migrations. The fix is the standard Prisma
**baselining** workflow: add one reconstructed baseline migration that reproduces
the schema state the remote already has, then reconcile — not re-run — it against
databases that are already at that state.

## 3. Remote `_prisma_migrations` metadata (read-only)

Inspected read-only. Names / timestamps / status only — no row data:

| # | migration_name | started | finished | rolled_back | steps | note |
|---|---|---|---|---|---|---|
| 0 | `20260612031023_init` | 06-12 03:10:23 | 06-12 03:10:24 | no | 1 | applied OK |
| 1 | `20260613000000_rename_account_to_wallet` | 06-12 18:26:24 | — (null) | **yes** | 0 | failed, then rolled back |
| 2 | `20260613000000_rename_account_to_wallet` | 06-12 18:27:05 | 06-12 18:27:05 | no | 1 | fixed & reapplied OK |

**Duplicate `_rename_account_to_wallet` explained.** Rows 1 and 2 have *different
checksums*, so the migration SQL was edited between attempts. Row 1 started, never
finished (`applied_steps_count = 0`), and was later marked rolled back. Row 2 is
the fixed retry that completed. This is a benign **failed → rolled-back → fixed →
reapplied** artifact, *not* a name collision and *not* an outstanding failure.

- The authoritative applied record is row 2.
- Row 1 carries `rolled_back_at`, so Prisma does **not** treat it as a *failed*
  migration — `migrate deploy` will not block on it.
- **Do not delete or edit these rows.** They are harmless history. Normalizing
  them buys nothing and risks the applied state.

## 4. Schema equivalence — proven against the live database

Two independent proofs, neither of which mutated any database:

1. **Live diff** (read-only introspection of the real remote schema):

   ```bash
   prisma migrate diff --from-config-datasource prisma.config.ts \
                       --to-schema prisma/schema.prisma --script
   ```

   Output was *exactly* — and only —:

   ```sql
   ALTER TABLE "transactions" ADD COLUMN "to_wallet_id" TEXT;
   ALTER TABLE "users" DROP COLUMN "password";
   CREATE INDEX "transactions_to_wallet_id_idx" ON "transactions"("to_wallet_id");
   ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_wallet_id_fkey" ...;
   ```

   That is precisely the sum of the two committed later migrations. **No other
   drift exists** (no enum, Decimal-precision, index, FK-action, or default
   difference). The remote's current schema therefore equals
   `schema.prisma` **with** `users.password` and **without**
   `transactions.to_wallet_id` — i.e. the reconstructed baseline.

2. **Offline diff** — the committed baseline SQL is byte-identical (modulo one
   trailing newline) to Prisma's own generated DDL for the pre-migration
   datamodel, confirming no hand-transcription error.

Conclusion: `baseline` + `remove_local_user_password` + `add_transaction_to_wallet`
== `prisma/schema.prisma`, and `baseline` alone == the current remote schema.

> **This proof predates the fourth migration** (`20260717000000_generalize_wallets_and_bills`,
> see §5a) and the remote/staging/production databases have **not** had it
> applied either (nothing beyond `baseline` has ever been deployed there — see
> §7). Re-running the live diff against a real target today will therefore show
> **three** deltas, not two: the original `password`/`to_wallet_id` pair plus the
> `WalletType` enum change, `wallets.cutoff_day`/`payment_due_day`, and
> `installments.kind`/`paid_terms`/`next_due_date`. Re-run the diff before acting
> on §7–§9 and expect the larger delta set.

## 5. The reconstructed baseline

```
prisma/migrations/20260710000000_baseline/migration.sql
```

- Timestamp `20260710000000` sorts **before** both later migrations.
- Creates every table, enum, index, and FK of the current schema **except** the
  two later deltas:
  - **includes** `users.password TEXT NOT NULL` (the next migration drops it),
  - **omits** `transactions.to_wallet_id`, its index, and its FK (the following
    migration adds them).
- Fresh-database only: pure `CREATE …`, no data, no secrets, no env-dependent SQL.

Final migration order in the repo:

| Order | Migration | Kind |
|---|---|---|
| 1 | `20260710000000_baseline` | additive (create all) |
| 2 | `20260711172700_remove_local_user_password` | **destructive** (`DROP COLUMN users.password`) |
| 3 | `20260711223000_add_transaction_to_wallet` | additive (nullable col + index + FK) |
| 4 | `20260717000000_generalize_wallets_and_bills` | additive + in-place enum/data migration (see §5a) |

### 5a. Fourth migration — added after the original baseline reconstruction

`20260717000000_generalize_wallets_and_bills` was authored after the baseline
reconstruction above and is **not** covered by the original equivalence
proofs in §4 (those only reasoned about the first three migrations). It:

- renames `WalletType` value `LOAN_PAYLATER` → `PAYLATER` and adds `LOAN`
  (`ALTER TYPE ... RENAME VALUE`, `ALTER TYPE ... ADD VALUE` — safe on a
  populated column; existing rows keep referencing the same enum label after
  rename);
- adds nullable `wallets.cutoff_day` / `wallets.payment_due_day` with bounds
  `CHECK` constraints;
- adds `installments.kind` (`BillKind`, default `INSTALLMENT`), `paid_terms`,
  `next_due_date`, backfilling both from the existing `current_term` /
  `start_date` before making `next_due_date NOT NULL`.

The backfill `UPDATE` is a no-op on an empty database (zero rows) and is
additive/non-destructive on a populated one — it only widens existing rows,
it does not drop or narrow anything. It was re-verified end-to-end together
with the other three migrations (§6a) since it was never part of the
original disposable-Postgres replay.

---

## 6. Fresh database provisioning (empty database)

Any brand-new/empty Postgres (local dev, disposable CI, a new environment):

```bash
# DATABASE_URL points at the EMPTY target.
prisma migrate deploy      # applies baseline → remove_password → add_to_wallet → generalize_wallets_and_bills
prisma generate
```

Runs all four migrations in order and reaches `schema.prisma`. `_prisma_migrations`
will list the four repo migrations (fresh DBs will not carry the legacy `_init`
/`_rename` names — that is expected and harmless).

> Validation status (original, 3-migration chain): the two equivalence proofs in
> §4 ran, plus `prisma validate`, `prisma generate`, `tsc`, `npm run build`, and
> the full `vitest` suite (305 tests) — all green. The live disposable replay
> covered `baseline` + `remove_local_user_password` + `add_transaction_to_wallet`
> only, applied from an empty throwaway PostgreSQL 18.4 instance. Structural
> spot-checks and application smoke tests (passwordless user sync + idempotency,
> asset/debt wallets, income/expense/transfer with persisted `to_wallet_id`,
> transfer update+delete, installment create + reversal, invalid-FK rejection,
> destination-wallet `SET NULL`, source-wallet `CASCADE`) all passed.
>
> **Re-verified for PM-STAB-004 on 2026-07-18, all four migrations** (the
> original three plus `generalize_wallets_and_bills`, which had never been
> replayed on a fresh database before): a new disposable PostgreSQL 18.4 instance
> (`embedded-postgres`, ephemeral, database `pocket_mint_migration_test`,
> credentials never committed, stopped and deleted afterward) received
> `prisma migrate deploy` from empty. All four migrations applied in order with
> no error. `prisma migrate status` reported *Database schema is up to date*
> both immediately after and on a second `migrate deploy` run (idempotent,
> "No pending migrations to apply"). `prisma migrate diff --from-config-datasource
> prisma.config.ts --to-schema prisma/schema.prisma --script` returned **"This is
> an empty migration"** — the migrated database is byte-for-relation identical to
> `prisma/schema.prisma`, including the `WalletType` split (`PAYLATER`/`LOAN`),
> `wallets.cutoff_day`/`payment_due_day`, and `installments.kind`/`paid_terms`/
> `next_due_date`. `prisma generate` succeeded. The full `vitest` suite ran with
> `TEST_DATABASE_URL` pointed at this instance: **381/381 tests passed, 0
> skipped** (this includes the four `prismaAdapter.integration.test.ts` cases
> that are normally `skipIf(!TEST_DATABASE_URL)` — see PM-STAB-010). The backend
> (`ts-node --transpile-only src/server.ts`) started against this database,
> passed its startup `SELECT 1` check, and `GET /health` returned `200`. **Never**
> point the block above at a shared database.

---

## 7. Existing database reconciliation (staging / production)

These databases **already contain the baseline tables** (proven in §4). They must
**never** have the baseline SQL executed against them — that would fail on
existing objects. Instead, mark the baseline as already-applied so Prisma records
it without running SQL, then deploy only the three newer migrations (including
`generalize_wallets_and_bills` — see §5a; nothing beyond `baseline` has been
applied to any shared database yet).

`migrate resolve --applied` changes **migration metadata only** — it inserts a
`_prisma_migrations` row and runs **no** DDL.

**⚠ MANUAL — run yourself after review, against the intended database, with a backup:**

```bash
# 1. Confirm you are pointed at the intended DB and it is at the pre-baseline
#    state (password present, to_wallet_id absent, WalletType still has
#    LOAN_PAYLATER, no cutoff_day/payment_due_day/kind/paid_terms/next_due_date).
#    Read-only:
prisma migrate status

# 2. Record the baseline as already applied (metadata only, no DDL):
prisma migrate resolve --applied 20260710000000_baseline

# 3. Apply ALL THREE newer migrations (remove_password, add_to_wallet, generalize_wallets_and_bills):
prisma migrate deploy
```

Only run step 2 when **all** of these hold:

- the target DB's schema is proven equal to the baseline (§4 diff is empty except
  the three later deltas — re-run it against *that* DB first, see the §4 note);
- you are connected to the intended database (double-check the target);
- a backup / PITR window exists;
- the migration records were reviewed (§3);
- the baseline directory name is final and will not be renamed after resolve.

**Legacy `_init` / `_rename_account_to_wallet` records:** leave them. After the
resolve, `_prisma_migrations` holds `_init`, `_rename` (×2), and `baseline`; the
local folder holds `baseline` + the three later migrations. `migrate deploy`
applies the three pending local migrations and **tolerates** the DB-only legacy
records (they are reported by `migrate status` but do not block `deploy`). Do not
create empty local dirs for `_init`/`_rename` and do not delete the DB rows.

---

## 8. Staging procedure

1. Merge the baseline commit; deploy the **code** first is not required for the
   additive migrations but see the ordering note in §10 for the destructive one.
2. Back up staging (or confirm PITR).
3. `prisma migrate status` (read-only) — expect `password` present,
   `to_wallet_id` absent, no *failed* migrations.
4. Re-run the §4 live diff against **staging** — expect the three deltas (not
   two — see the §4 note about the fourth migration).
5. `prisma migrate resolve --applied 20260710000000_baseline`.
6. `prisma migrate deploy` — applies `remove_local_user_password`,
   `add_transaction_to_wallet`, and `generalize_wallets_and_bills`.
7. `prisma migrate status` again — expect “Database schema is up to date”.
8. Smoke test: `/users/sync`, wallet create, income/expense/transfer create
   (destination persists via `to_wallet_id`), installment create; confirm
   `users.password` is gone and wallet type / billing fields from migration 4
   behave as expected.

## 9. Production procedure

Same as staging, gated:

1. **Ship code that no longer writes `users.password` first** (already true — the
   backend is Supabase-Auth only; verify no running instance INSERTs `password`).
2. Back up / confirm PITR.
3. `prisma migrate status` + §4 diff against **production** — expect the three
   deltas, no failed migrations.
4. `prisma migrate resolve --applied 20260710000000_baseline`.
5. `prisma migrate deploy` inside the deploy that ships compatible code.
6. `prisma migrate status` → up to date. Smoke test as in §8.

### Zero-downtime option (the destructive drop)

`remove_local_user_password` drops a `NOT NULL` column. Old instances that still
INSERT `password` break the moment it is gone. For strict zero-downtime, split it:

1. Release A: `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;` and
   deploy code that never writes `password`.
2. Drain old instances.
3. Release B: run the committed `DROP COLUMN "password"`.

`add_transaction_to_wallet` is backward-compatible (nullable, ignored by old
code) and needs no window — apply it before or with the new financial code.

### Maintenance-window option

Brief window, back up, run `resolve` + `deploy`, smoke test, reopen traffic.

## 10. Rollback limitations

- Prisma has **no down-migrations**. Rollback = restore from backup or hand-write
  a reverse migration.
- `remove_local_user_password` is **irreversible** by forward migration: the
  dropped column and its data are gone. Only the placeholder data existed, but the
  *column* cannot be restored except by adding a new migration
  (`ADD COLUMN "password" TEXT` — it would come back nullable, not the original
  `NOT NULL`, and empty).
- `add_transaction_to_wallet` is reversible in principle (drop the column/index/FK)
  but doing so drops any persisted transfer destinations.
- `generalize_wallets_and_bills` is **not cleanly reversible**: the `ALTER TYPE
  ... RENAME VALUE` step cannot be un-renamed by a simple reverse (Postgres has
  no `RENAME VALUE` back without touching every row that adopted the new label
  in the meantime), and the `paid_terms`/`next_due_date` backfill is a one-way
  data transformation. Treat it the same as the destructive migration for
  rollback purposes: restore from backup rather than hand-writing a reverse.
- `migrate resolve` is metadata-only; "rolling it back" means
  `prisma migrate resolve --rolled-back 20260710000000_baseline`, which only
  removes the applied marker — it changes no schema.
- Safest rollback for the destructive step is a database restore taken
  immediately before `deploy`.

## 11. What remains manual (nothing auto-executed)

Every shared-database command is left for a human to run after review:

- `prisma migrate resolve --applied 20260710000000_baseline` (staging, then prod)
- `prisma migrate deploy` (staging, then prod)
- the live `prisma migrate diff` re-check against each target

Completed since the original draft (no shared database touched):

- ~~a live `prisma migrate deploy` against a disposable Postgres to confirm fresh
  provisioning end-to-end~~ — **done** (see §6 validation status). Fresh
  provisioning replays cleanly end-to-end on an empty throwaway PostgreSQL, with an
  empty final schema diff and passing application smoke tests.
- ~~re-verify the fresh-database replay after the fourth migration
  (`generalize_wallets_and_bills`) was added~~ — **done 2026-07-18** (see §6,
  "Re-verified for PM-STAB-004"). All four migrations replay cleanly from empty,
  `migrate diff` is empty against the full current `schema.prisma`, the full test
  suite passes with 0 skips, and the backend starts and serves `/health` against
  the freshly-provisioned database.

The reconstructed baseline itself, `prisma validate`/`generate`, typecheck,
build, and the test suite were completed in-repo with no database mutation.

**Still open (unchanged by the 2026-07-18 re-verification):** the actual
`migrate resolve --applied` + `migrate deploy` against the real staging and
production databases (§7–§9) remain manual, human-run steps against a shared
database — nothing in this task executed them, and they require a backup
window and explicit review each time regardless of how many times the fresh
disposable-database path has been validated.
