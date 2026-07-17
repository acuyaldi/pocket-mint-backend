# Prisma runtime connection & pooling (pg driver adapter)

Prisma 7's generated client uses the `client` engine, which **requires a driver
adapter** to reach PostgreSQL. Constructing `new PrismaClient({ log })` with no
adapter throws:

```
PrismaClientValidationError: Using engine type "client" requires either
"adapter" or "accelerateUrl" to be provided to PrismaClient constructor.
```

The backend wires the official PostgreSQL adapter (`@prisma/adapter-pg` + `pg`).
Accelerate is **not** used (no proxy dependency; direct pooled TCP to Postgres).

## Composition

```
pg.Pool  →  PrismaPg(adapter)  →  PrismaClient({ adapter })
```

- [`src/lib/prismaFactory.ts`](../src/lib/prismaFactory.ts) — `createPrismaResources(url, poolTuning, log)`
  builds and **owns** the pool; returns `{ prisma, pool, close }`. `close()` is
  idempotent (disconnect Prisma, then `pool.end()`), so shutdown never double-runs.
- [`src/lib/prisma.ts`](../src/lib/prisma.ts) — the shared singleton. One pool +
  one client per process. In development both are cached on `globalThis` so
  hot-reload does not leak a fresh pool per reload; production never touches the global.
- [`src/server.ts`](../src/server.ts) — runs `SELECT 1` at boot (fail-fast on an
  unreachable DB) and closes the pool on `SIGINT`/`SIGTERM`.

The connection string is **never logged**: it is read once in config and passed
straight to the pool; the structured logger redacts any `databaseurl` /
`connectionstring` key, and error messages carry only a safe summary.

## Environment variables

| Name                       | Required | Purpose                                             |
| -------------------------- | -------- | --------------------------------------------------- |
| `DATABASE_URL`             | yes      | Runtime connection string (the app's sole source).  |
| `DIRECT_URL`               | migrations | Direct (non-pooler) URL for `prisma migrate`.     |
| `DB_POOL_MAX`              | no (10)  | Max connections in **this process's** pool.         |
| `DB_IDLE_TIMEOUT_MS`       | no (10000) | Idle connection lifetime before the pool closes it. |
| `DB_CONNECTION_TIMEOUT_MS` | no (10000) | Max wait to acquire a connection before failing.    |
| `TEST_DATABASE_URL`        | test only | Disposable DB for the adapter integration test.     |

Values live only in the secret manager / `.env`; none appear in source or logs.

## Which URL to use

- **Application runtime** — prefer a **pooler-compatible** URL in
  constrained/serverless topologies (e.g. Supabase transaction pooler on `:6543`).
  The `pg` pool holds long-lived TCP connections, so a session-mode pooler or a
  direct URL also works for a small, long-running instance count.
- **Prisma migrations** — use a **direct** (non-pooler) URL (`DIRECT_URL`).
  `prisma migrate status | diff | resolve | deploy` are incompatible with
  transaction-mode poolers (PgBouncer). Run migrations out-of-band; the app does
  **not** migrate on startup.

## Connection budget

Total server-side connections are **process-local and additive**:

```
total connections ≈ DB_POOL_MAX × running application instances
```

Keep that product safely under the database provider's connection limit. Scaling
horizontally multiplies the total — raise instance count and `DB_POOL_MAX`
together only within the provider ceiling. Defaults are conservative (`max=10`).

## Verification (disposable PostgreSQL)

The adapter path is proven end-to-end against a throwaway PostgreSQL: apply the
committed migration chain, set `TEST_DATABASE_URL`, then run
[`test/prismaAdapter.integration.test.ts`](../test/prismaAdapter.integration.test.ts)
(connect, `SELECT 1`, create/read user + wallet, TRANSFER with `toWalletId`,
clean pool close). It is **skipped** when `TEST_DATABASE_URL` is unset, so the
unit suite never needs — or opens — a real connection. Never point it at Supabase.
