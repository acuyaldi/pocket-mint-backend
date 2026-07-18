---
name: prisma-database
description: Use when touching Prisma schema, migrations, the generated client, connection pooling, DATABASE_URL/DIRECT_URL, or database provisioning/deployment.
---

# Prisma & Database — Prisma 7 Adapter Architecture

## Runtime

Prisma 7 `client` engine needs a driver adapter. The composition is:

```
pg.Pool → PrismaPg → PrismaClient({ adapter })
```

- Use the existing singleton `src/lib/prisma.ts` (built by
  `createPrismaResources` in `src/lib/prismaFactory.ts`). **Never instantiate
  another PrismaClient** in application code.
- Development caches client + pool on `globalThis` (hot-reload safe) — preserve
  that.
- Pool sizing is **process-local**: total server-side connections =
  `DB_POOL_MAX (default 10) × instance count`. Keep the product under the
  provider limit.
- Details: `docs/prisma-runtime-connection.md`.

## URLs

- `DATABASE_URL` = application runtime URL (Supavisor transaction pooler ok)
- `DIRECT_URL` = migration/direct or session-mode URL (Prisma migrate)
- **Never print either**, not even partially, not in errors or docs.

## Generated Client Packaging

- Generator output: `src/generated/prisma` (custom path — see `schema.prisma`).
- `npm run build` = `prisma generate && tsc && node src/scripts/copy-prisma-client.cjs`,
  which copies the client into `dist/generated/prisma`. `dist/` is committed.
- Verify packaging after build changes:

```bash
test -f dist/generated/prisma/client.js
node -e "require('./dist/generated/prisma/client')"
```

## Schema Changes

Before any change: check whether the model/field already exists, read the
existing migrations, and create the migration before (or with) the application
code that needs it.

**Never run `prisma migrate dev` (or any migration command) against the URL in
`.env` — that URL may be Supabase, and no user instruction ("it's already set
up") changes this.** The only sanctioned target for creating or replaying
migrations is a disposable local PostgreSQL. This machine has no Docker/local
PG; use `npm install -D --no-save embedded-postgres`, boot a throwaway
instance, then stop it and `npm prune` afterwards.

- **Author** a new migration by pointing `DATABASE_URL` (and `DIRECT_URL` if
  used) at the disposable instance and running `prisma migrate dev --name <change>` there.
- **Replay** the committed chain with `prisma migrate deploy` against the
  disposable instance to verify it from scratch.

Never run against an unconfirmed database:

- `prisma migrate reset`
- `prisma db push`
- `prisma migrate deploy`
- `prisma migrate resolve`

Confirm the target first (`prisma migrate status`, read-only).

## Baseline (reconstructed chain — `docs/prisma-migration-reconciliation.md`)

```
20260710000000_baseline                      (creates full schema, incl. users.password)
20260711172700_remove_local_user_password    (destructive: DROP COLUMN password)
20260711223000_add_transaction_to_wallet     (additive: to_wallet_id + index + FK)
20260717000000_generalize_wallets_and_bills  (WalletType PAYLATER/LOAN split, wallet billing fields, installment kind/paid_terms/next_due_date)
```

- **Existing legacy-schema DB** (staging/prod): inspect `migrate status` +
  `migrate diff` first; proceed only if drift exactly matches the three expected
  deltas. Then `migrate resolve --applied 20260710000000_baseline`
  (metadata-only, no DDL) and `migrate deploy` for the three newer migrations.
  Leave the legacy `_init`/`_rename` rows alone; **never hand-edit
  `_prisma_migrations`**.
- **Empty DB**: `prisma migrate deploy` applies the full chain (all four
  migrations). Do **not** run `migrate resolve` there. Re-verified end-to-end on
  a disposable PostgreSQL 18 instance 2026-07-18 (PM-STAB-004): empty `migrate
  diff` against `schema.prisma`, full test suite green with 0 skips, backend
  starts and serves `/health`.

## Verification

- Disposable-PostgreSQL replay of the full chain; final
  `migrate diff` (DB → schema) must be empty
- `npx prisma validate` && `npx prisma generate`
- `npx vitest run` && `npm run build` (+ packaging check above)

## Common Mistakes

- `new PrismaClient()` in a service/test instead of importing the singleton
  (fails anyway: the client engine requires an adapter).
- Running `migrate dev` "quickly" against `.env` — that URL points at Supabase.
- Running the baseline SQL on staging/prod (objects already exist) — baseline is
  reconciled with `resolve --applied`, never executed there.
- Renaming the baseline directory after it has been resolved anywhere.
