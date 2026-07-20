# Pocket Mint — Backend

Express + TypeScript API for Pocket Mint, a personal finance tracker. Uses Prisma ORM against PostgreSQL (Supabase), authenticates via verified Supabase JWTs, and deploys to Railway.

## Stack

- **Runtime**: Node 22.x, Express 5, TypeScript
- **Database**: PostgreSQL (Supabase), Prisma 7 (`client` engine, `pg` driver adapter)
- **Auth**: Supabase JWT verification only — no shared API keys, no `x-user-id` headers
- **Hosting**: Railway (Git-integration auto-deploy on push)

## Project structure

```text
src/
├── app.ts, server.ts    Express app wiring and entrypoint
├── config/               Env var reading (single source of truth: config/index.ts)
├── controllers/          HTTP request handlers per domain
├── domain/                Pure business logic (billing cycles, installments, reporting)
├── middleware/            Auth, CORS, rate limiting, error handling
├── models/                 Query/persistence helpers
├── routes/                 Express routers, mounted under /api/v1
├── services/                Domain services (one per feature area, + *.types.ts / *.errors.ts)
└── utils/                    Shared helpers (JWT verification, financial math)
```

Architecture notes for individual services live under [`docs/`](docs/) (e.g. `architecture-wallet-service.md`, `architecture-transaction-service.md`).

## Local setup

```bash
npm install
cp .env.example .env   # fill in real values, see below
npm run dev             # ts-node-dev, binds $PORT (default 5001)
```

## Environment variables

See [`.env.example`](.env.example) for the full annotated list. Required in production:

- `DATABASE_URL` — Postgres connection string
- Exactly one of `SUPABASE_JWT_SECRET` (HS256 shared secret) or `SUPABASE_URL` (JWKS)
- `CORS_ALLOWED_ORIGINS` — comma-separated exact origins, no wildcard
- `NODE_ENV=production`

Everything else (rate limiting, connection pool sizing, reporting timezone) has a safe default — see the file comments.

## Testing

```bash
npm test               # vitest run — unit + service tests
npm run test:integration  # requires TEST_DATABASE_URL, a disposable Postgres DB
```

See [`docs/database-testing.md`](docs/database-testing.md) for setting up the integration test database.

## Build & deploy

```bash
npm run build   # prisma generate && tsc && copy generated client into dist/
npm start        # node dist/server.js
```

Deployment is to Railway via Git-integration auto-deploy. Full deployment, rollback, and migration procedures are documented in [`docs/deployment-runbook.md`](docs/deployment-runbook.md).

### Migration policy

**`prisma migrate deploy` is never run automatically against a real database.** CI only applies migrations to an ephemeral, disposable Postgres container for testing. Railway does not run migrations as part of deploy. Applying migrations to staging/production is a manual, deliberate step — see [`docs/deployment-runbook.md`](docs/deployment-runbook.md) for the exact procedure.

## Backup & restore

See [`docs/backup-restore-runbook.md`](docs/backup-restore-runbook.md) and the `db:backup` / `db:restore` / `db:verify` npm scripts.
