# Database Integration Testing (PM-STAB-010A)

The Prisma integration suite (`test/prismaAdapter.integration.test.ts`) runs
real queries through the production adapter stack (`pg.Pool → PrismaPg →
PrismaClient`) against a **disposable** PostgreSQL database. It never runs
against Supabase or any shared/production database.

## How it's gated

- The suite is `describe.skipIf(!TEST_DATABASE_URL)` — with no
  `TEST_DATABASE_URL` set, it's skipped and the rest of `npx vitest run` is a
  pure unit run that never opens a database connection.
- If `TEST_DATABASE_URL` **is** set, `assertTestDatabaseUrl`
  (`src/lib/assertTestDatabaseUrl.ts`) checks it synchronously at test
  collection time — before any connection opens — and throws if the host looks
  like Supabase/RDS or the database name is `postgres` (Supabase's default).
  A misconfigured env fails the whole file immediately; it never silently
  skips or silently runs against the wrong database.

## Running locally

```bash
npm run test:integration
```

This boots a throwaway `embedded-postgres` instance (no Docker/local Postgres
install required), runs `prisma migrate deploy` against it, runs the
integration file, then stops and deletes the instance — every run starts from
an empty database. Port defaults to `55432`; override with
`EMBEDDED_PG_PORT` if that's taken.

If you already run your own disposable Postgres (e.g. via Docker), set
`TEST_DATABASE_URL` yourself and the same script reuses it instead of booting
`embedded-postgres`:

```bash
docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:18
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pocketmint_test" npm run test:integration
```

`npm test` (the full unit suite) never needs `TEST_DATABASE_URL` — leave it
unset for everyday development.

## Running in CI

`.github/workflows/ci.yml` starts a `postgres:18` service container scoped to
the job, sets `TEST_DATABASE_URL` to point at it, runs `prisma migrate deploy`
against it, then `npx vitest run` (which now exercises the integration suite
too, since `TEST_DATABASE_URL` is set). The container is destroyed with the
job — nothing persists between runs.

## Rules

- **Never** `prisma db push` — migrations only (`prisma migrate deploy`),
  so the test database is provisioned the same way production is.
- **Never** point `TEST_DATABASE_URL` at `.env`'s `DATABASE_URL` (Supabase).
- Each test creates its own isolated user (unique email) and deletes it
  (cascading to its wallets/transactions/installments/categories) in
  `afterEach` — tests don't depend on run order or leak data into later
  tests or suites.
- The suite closes its Prisma connection pool in a top-level `afterAll`.
