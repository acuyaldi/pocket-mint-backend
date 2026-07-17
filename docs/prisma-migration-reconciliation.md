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

---

## 6. Fresh database provisioning (empty database)

Any brand-new/empty Postgres (local dev, disposable CI, a new environment):

```bash
# DATABASE_URL points at the EMPTY target.
prisma migrate deploy      # applies baseline → remove_password → add_to_wallet
prisma generate
```

Runs all three migrations in order and reaches `schema.prisma`. `_prisma_migrations`
will list the three repo migrations (fresh DBs will not carry the legacy `_init`
/`_rename` names — that is expected and harmless).

> Validation status in this workspace: the two equivalence proofs in §4 ran, plus
> `prisma validate`, `prisma generate`, `tsc`, `npm run build`, and the full
> `vitest` suite (305 tests) — all green.
>
> **The live disposable replay is now complete.** All three migrations were applied
> in order from an empty throwaway PostgreSQL 18.4 (ephemeral local instance,
> database `pocket_mint_migration_test`, credentials never committed). Results:
> `_prisma_migrations` recorded all three as finished with none rolled back;
> `prisma migrate status` reported *Database schema is up to date*; and
> `prisma migrate diff` (migrated DB → `schema.prisma`) returned **No difference
> detected**. Structural spot-checks passed: `users.password` absent,
> `transactions.to_wallet_id` present with `transactions_to_wallet_id_idx` and an
> `ON DELETE SET NULL` FK, Decimal `(15,2)`/`(5,2)` precision intact, all five
> enums and every `@@index` present. Application-level smoke tests passed too
> (passwordless user sync + idempotency, asset/debt wallets, income/expense/transfer
> with persisted `to_wallet_id`, transfer update+delete, installment create +
> reversal, invalid-FK rejection, destination-wallet `SET NULL`, source-wallet
> `CASCADE`). The disposable database was stopped and removed afterward. **Never**
> point the block above at a shared database.

---

## 7. Existing database reconciliation (staging / production)

These databases **already contain the baseline tables** (proven in §4). They must
**never** have the baseline SQL executed against them — that would fail on
existing objects. Instead, mark the baseline as already-applied so Prisma records
it without running SQL, then deploy only the two newer migrations.

`migrate resolve --applied` changes **migration metadata only** — it inserts a
`_prisma_migrations` row and runs **no** DDL.

**⚠ MANUAL — run yourself after review, against the intended database, with a backup:**

```bash
# 1. Confirm you are pointed at the intended DB and it is at the pre-baseline
#    state (password present, to_wallet_id absent). Read-only:
prisma migrate status

# 2. Record the baseline as already applied (metadata only, no DDL):
prisma migrate resolve --applied 20260710000000_baseline

# 3. Apply ONLY the two newer migrations:
prisma migrate deploy
```

Only run step 2 when **all** of these hold:

- the target DB's schema is proven equal to the baseline (§4 diff is empty except
  the two later deltas — re-run it against *that* DB first);
- you are connected to the intended database (double-check the target);
- a backup / PITR window exists;
- the migration records were reviewed (§3);
- the baseline directory name is final and will not be renamed after resolve.

**Legacy `_init` / `_rename_account_to_wallet` records:** leave them. After the
resolve, `_prisma_migrations` holds `_init`, `_rename` (×2), and `baseline`; the
local folder holds `baseline` + the two later migrations. `migrate deploy`
applies the two pending local migrations and **tolerates** the DB-only legacy
records (they are reported by `migrate status` but do not block `deploy`). Do not
create empty local dirs for `_init`/`_rename` and do not delete the DB rows.

---

## 8. Staging procedure

1. Merge the baseline commit; deploy the **code** first is not required for the
   additive migration but see the ordering note in §10 for the destructive one.
2. Back up staging (or confirm PITR).
3. `prisma migrate status` (read-only) — expect `password` present,
   `to_wallet_id` absent, no *failed* migrations.
4. Re-run the §4 live diff against **staging** — expect only the two deltas.
5. `prisma migrate resolve --applied 20260710000000_baseline`.
6. `prisma migrate deploy` — applies `remove_local_user_password` and
   `add_transaction_to_wallet`.
7. `prisma migrate status` again — expect “Database schema is up to date”.
8. Smoke test: `/users/sync`, wallet create, income/expense/transfer create
   (destination persists via `to_wallet_id`), installment create; confirm
   `users.password` is gone.

## 9. Production procedure

Same as staging, gated:

1. **Ship code that no longer writes `users.password` first** (already true — the
   backend is Supabase-Auth only; verify no running instance INSERTs `password`).
2. Back up / confirm PITR.
3. `prisma migrate status` + §4 diff against **production** — expect only the two
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

The reconstructed baseline itself, `prisma validate`/`generate`, typecheck,
build, and the test suite were completed in-repo with no database mutation.
