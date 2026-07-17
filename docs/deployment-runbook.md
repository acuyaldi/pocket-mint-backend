# Backend deployment runbook — JWT-only auth (Sprint 3I)

Operational runbook for deploying the JWT-only backend (`pocket-mint-be`) to
staging and production. Companion to [`frontend-jwt-migration.md`](./frontend-jwt-migration.md).

**Golden rule:** the frontend must send `Authorization: Bearer <access_token>`
and be deployed **first**. Deploying this JWT-only backend before the frontend
is Bearer-capable returns a uniform `401` to every user request.

No secret values appear in this document. Fill placeholders (`<...>`) from the
secret manager at deploy time.

---

## 1. Environment variable inventory

Parsed exclusively in [`src/config/index.ts`](../src/config/index.ts). Nothing
else reads `process.env`.

| Variable | Prod | Sensitive | Default | Notes / action |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | required | no | `development` | Set `production` in prod/staging so stack traces never reach clients and config validation is fatal. |
| `PORT` | optional | no | `5001` | Bind port; platform may inject its own. |
| `DATABASE_URL` | required | **yes** | — | Postgres/Supabase connection. Use the **rotated** password. |
| `DIRECT_URL` | optional | **yes** | — | Only if using a pooled `DATABASE_URL`; Prisma migrations use the direct connection. |
| `SUPABASE_URL` | Mode B | no | — | Enables JWKS verification + auto-derives issuer. Public value. |
| `SUPABASE_JWT_SECRET` | Mode A | **yes** | — | HS256 shared secret. One of Mode A / Mode B is **required** (fatal in prod if neither set). |
| `SUPABASE_JWT_AUD` | optional | no | `authenticated` | Always verified. |
| `SUPABASE_JWT_ISSUER` | recommended | no | derived from `SUPABASE_URL` | Verified only when set/derivable. Pin it explicitly in Mode A (see §2). |
| `CORS_ALLOWED_ORIGINS` | required | no | dev localhost only | Comma-separated exact origins. Empty in prod is **fatal**. No wildcard. |
| `RATE_LIMIT_ENABLED` | optional | no | `true` | |
| `RATE_LIMIT_WINDOW_MS` | optional | no | `900000` (15 min) | |
| `RATE_LIMIT_MAX` | optional | no | `300` | Per-IP general limit / window. |
| `RATE_LIMIT_MUTATION_MAX` | optional | no | `60` | Per-user write limit / window. |
| `TRUST_PROXY` | platform-specific | no | `false` | Set to the **number** of proxy hops (see §4). Never `true`. |
| `REPORTING_TIMEZONE` | optional | no | `Asia/Jakarta` | IANA tz for reporting calendar days. |

**Removed / obsolete — must NOT appear in any deployment secret or config:**
`API_KEY`, `AUTH_REQUIRE_JWT`, and the `x-api-key` / `x-user-id` / `x-user-email`
header path. These are fully retired; presence in a deploy secret is a leftover
to delete.

Startup fails loudly (throws in `validateConfig()`) in production when: no JWT
source is configured, or `CORS_ALLOWED_ORIGINS` is empty.

---

## 2. JWT verification mode

The verifier ([`src/utils/supabaseJwt.ts`](../src/utils/supabaseJwt.ts)) always
checks signature, expiry, and audience; issuer is checked only when set/derived.
The verified `sub` becomes the trusted identity (`req.auth.userId`). No token or
raw claim is ever logged.

**Priority:** if both are set, **JWKS (Mode B) wins** — `SUPABASE_JWT_SECRET` is
ignored. Do not set both unless intentional; a stale secret would be silently
masked.

- **Mode A — HS256 shared secret** (`SUPABASE_JWT_SECRET`): Dashboard → Project
  Settings → API → JWT Secret. Symmetric — the backend holds a secret capable of
  **forging** tokens, so leak impact is severe. Issuer is **not** auto-derived,
  so also set `SUPABASE_JWT_ISSUER` explicitly to pin the project.
- **Mode B — JWKS / asymmetric** (`SUPABASE_URL`): backend fetches public keys
  from `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`; holds no signing secret.
  Issuer is auto-derived as `<SUPABASE_URL>/auth/v1`.

**Recommendation: Mode B (JWKS)** when the Supabase project has asymmetric JWT
signing keys enabled — no forgeable secret on the backend, and issuer pinning is
automatic. Requires outbound network to Supabase for key fetch (jose caches).
Fall back to **Mode A** only if the project still uses legacy HS256 signing keys;
then set `SUPABASE_JWT_ISSUER` explicitly.

**Project isolation:** use the **staging** Supabase project's values for staging
and the **production** project's for prod. Never mix. Signature verification is
what isolates projects (audience `authenticated` is shared across all Supabase
projects); issuer pinning is defense-in-depth.

---

## 3. CORS

Policy in [`src/middleware/cors.ts`](../src/middleware/cors.ts):

- Exact-origin allowlist from `CORS_ALLOWED_ORIGINS`; no wildcard; empty in prod
  is fatal.
- Allowed request headers: **`Authorization`, `Content-Type` only**. Legacy
  `x-api-key` / `x-user-id` / `x-user-email` are rejected (not advertised).
- `credentials: false` — API uses Bearer header auth, not cookies (matches
  actual usage).
- Requests with no `Origin` (curl, health checks, server-to-server) are allowed
  by design; browser requests from unknown origins get no CORS headers (browser
  blocks) rather than a 500.

Preflight smoke test (placeholders only):

```bash
# Allowed origin + allowed headers → 204 with Access-Control-Allow-* echoing origin
curl -i -X OPTIONS "<BACKEND_URL>/api/v1/wallets" \
  -H "Origin: <FRONTEND_ORIGIN>" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type"

# Unknown origin → 204 but NO Access-Control-Allow-Origin header (browser blocks)
curl -i -X OPTIONS "<BACKEND_URL>/api/v1/wallets" \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type"

# Legacy header requested → not listed in Access-Control-Allow-Headers
curl -i -X OPTIONS "<BACKEND_URL>/api/v1/wallets" \
  -H "Origin: <FRONTEND_ORIGIN>" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: x-user-id"
```

---

## 4. Trust proxy & rate limiting

Topology is **not determinable from the repo** (no Dockerfile / CI / platform
manifest). Setting `TRUST_PROXY` correctly is a **manual per-platform decision**:

- `req.ip` (the general limiter's key) is derived from `X-Forwarded-For` only
  according to the trusted hop count.
- Set `TRUST_PROXY` to the number of proxy hops the platform actually puts in
  front of the app: `1` behind a single load balancer / reverse proxy (Render,
  Railway, Fly, Nginx). Never `true` — that trusts an arbitrary `X-Forwarded-For`
  chain and lets a client spoof its rate-limit key.
- If unsure, start with `0` (trust none; keys by socket IP) and raise only after
  confirming the hop count.

Rate-limit architecture ([`src/middleware/rateLimit.ts`](../src/middleware/rateLimit.ts),
[`src/app.ts`](../src/app.ts)):

- **General limiter** — mounted globally on `/api` **before** auth; keys by IP
  (`ip:<subnet>`); protects the auth path. Skips `OPTIONS`.
- **Mutation limiter** — mounted per-route **after** `requireUser` /
  `requireVerifiedJwt`; keys by verified user (`user:<id>`, IP fallback); throttles
  writes only. Never reads `x-user-id`, body, or query for the key.

In-memory store = **per instance**. Limits are not shared across horizontally
scaled processes (documented; Redis is out of scope for this rollout).

---

## 5. Pending Prisma migrations

Two local migrations, neither applied to the configured database (confirmed via
read-only `prisma migrate status`):

### `20260711172700_remove_local_user_password` — DESTRUCTIVE
```sql
ALTER TABLE "users" DROP COLUMN "password";
```
- Column held placeholder text only (auth is Supabase-owned) — no real credential
  lost. It is currently `NOT NULL`, so **old code that still INSERTs `password`
  breaks once it is gone**. Apply as part of / after the same deploy that ships
  the new code. Rollback = re-add the column (`ADD COLUMN "password" TEXT`); data
  is not recoverable but was placeholder-only.
- For strict zero-downtime, split: `ALTER COLUMN "password" DROP NOT NULL` →
  deploy new code → `DROP COLUMN` in a follow-up release. This backend already
  omits the column, so the simple single-deploy path is acceptable.

### `20260711223000_add_transaction_to_wallet` — ADDITIVE / SAFE
```sql
ALTER TABLE "transactions" ADD COLUMN "to_wallet_id" TEXT;  -- + index + FK ON DELETE SET NULL
```
- Nullable, no default, no data change. Old code ignores it → **safe to apply
  before** new code. New code requires it (transfers are self-describing).
  Rollback = drop the column/index/FK (loses transfer-destination links created
  after apply).

### ⚠️ Migration-history drift — provisioning blocker for a FRESH database

`prisma migrate status` reports **"last common migration: null"**. The database
has baseline migrations applied (`..._init`, `..._rename_account_to_wallet` —
the latter appears twice in the remote history) that are **absent from
`prisma/migrations/` locally**. Consequences:

- **Existing database** (the one in `DATABASE_URL`, or a snapshot/branch of it):
  `prisma migrate deploy` applies the two pending migrations correctly — deploy
  matches by name against `_prisma_migrations` and ignores DB-only entries. ✅
- **Fresh/empty database** (a brand-new staging Supabase project): `migrate
  deploy` would run only the two diff migrations against an empty schema →
  `DROP COLUMN password` on a non-existent `users` table **fails**. ❌

**Therefore, provision staging from a copy/snapshot/branch of the existing
database, not from an empty project** — unless the missing baseline migrations
are first reconstructed into `prisma/migrations/` (a separate, deliberate task;
not done here to avoid creating migrations). Do not attempt `migrate reset` on
any shared database.

---

## 6. Migration deployment order

Both environments — never auto-apply to a remote DB; run each step deliberately:

1. **Back up / snapshot** the target database.
2. Apply **additive** `add_transaction_to_wallet` (safe before code).
3. Deploy the JWT-only backend (no longer writes `users.password`).
4. Apply **destructive** `remove_local_user_password` (with, or immediately
   after, the code deploy — see zero-downtime split in §5).
5. `prisma migrate status` / `prisma validate` — confirm clean.
6. `/users/sync` smoke test (bootstrap path).
7. Transaction create / update / delete smoke tests (transfer symmetry).
8. Read-only reconciliation (`src/scripts/reconcile.ts --audit`) — confirm no new
   drift from the test operations.

Apply command (run against the intended env only):
```bash
DATABASE_URL="<direct-connection>" npx prisma migrate deploy
```

---

## 7. Staging rollout

1. Confirm staging **frontend** sends `Authorization: Bearer <token>` and is
   deployed.
2. Configure the staging env (§1) — rotated `DATABASE_URL`, staging Supabase JWT
   source (§2), staging CORS origin, `NODE_ENV=production`, `TRUST_PROXY` for the
   platform.
3. Snapshot the staging database.
4. Apply migrations in the §6 order.
5. Deploy the JWT-only backend; confirm it **starts** (no `validateConfig` throw)
   and `/health` returns `200`.
6. Run the smoke-test matrix (§9).
7. Monitor logs — only safe reason codes (`missing_bearer`, `invalid_token`,
   `unknown_user`); never a token or claim.

Do not deploy the JWT-only backend before staging frontend Bearer support is live.

---

## 8. Production rollout

Preconditions: frontend Bearer deploy already live; credential rotation complete
(§10); prod env configured.

1. Snapshot the production database.
2. Apply migrations (§6 order).
3. Deploy JWT-only backend; verify startup + `/health`.
4. Controlled smoke test with a **non-production** test account (§9).
5. Remove the obsolete `API_KEY` deployment secret (and any legacy header config).
6. Monitor `401`, `429`, `5xx`, DB errors, CORS rejections.

**Rollback (JWT config issue): fix the environment configuration and redeploy the
same JWT-only build.** Do **not** reintroduce legacy auth as a rollback. Only if
a schema/data problem appears, roll the database back to the pre-deploy snapshot
and redeploy the matching prior build.

---

## 9. Smoke-test matrix

Use non-production accounts and safe test data. No real tokens in logs/fixtures.

**Auth:** valid staging JWT → `200`; no token / malformed / expired / wrong-aud /
wrong-iss / wrong-signature → uniform `401`; retired headers alone → `401`;
body/query `userId` cannot authenticate.

**User sync:** first `POST /users/sync` creates the local row (`201`); repeat is
idempotent (`200`); body `supabaseId` cannot override the verified `sub`.

**Wallet:** list, create, metadata update, balance-overwrite rejection
(`BALANCE_UPDATE_NOT_ALLOWED`), sparkline, safe delete.

**Transaction:** create income / expense / transfer, update, delete; transfer
symmetry preserved on both wallets.

**Installment:** create via transaction flow, list, delete/reversal where
supported.

**Dashboard:** summary loads; wallet totals match.

**Security:** CORS preflight with `Authorization` succeeds; unknown origin
rejected; mutation limiter keys by verified user; logs contain no token; errors
expose no internals.

**Data integrity:** read-only reconciliation runs; no unexpected new drift.

---

## 10. Credential rotation

Never repeat credential values anywhere.

| Credential | Class | Action |
| --- | --- | --- |
| Supabase **DB password** | **Rotation required** — was in git-tracked `.env`, still in history | Rotate in Supabase → update `DATABASE_URL`/`DIRECT_URL` everywhere (local, staging, prod, CI). Coordinate so no instance holds the old URL. |
| Retired shared **API key** (`kunci_...`) | Retired — backend no longer accepts it | Remove from all deploy secrets; remove the hardcoded value from frontend source; purge from history (§11). No live system uses it. |
| **Supabase JWT secret** (Mode A) | Rotate only if exposure suspected | Not in the tracked `.env` per audit. Rotating it **invalidates all active user sessions** — schedule accordingly. |
| **Service-role key** | N/A here | Not used by this backend. Confirm it was never committed elsewhere; never ship it to this service. |
| **Supabase anon key** | Public config | Not a secret; do not confuse with the service-role key. |

Rotate credentials **before** any history purge (§11).

---

## 11. Git-history purge plan — PENDING EXPLICIT APPROVAL (do not execute)

History still contains secrets: `.env` / `.env.local` were tracked before commit
`a900b69` untracked them (secrets remain in prior commits); audit docs previously
held literal credentials; the frontend hardcoded key is documented from the audit.
`.env` and `.env.local` are now untracked and git-ignored, but **history is not
rewritten**.

Coordinated plan (execute only on approval):

1. **Rotate all credentials first** (§10) — purge does not un-leak an
   already-exposed secret.
2. Back up the repository (mirror clone) before rewriting.
3. Notify all collaborators; freeze pushes.
4. Rewrite with `git filter-repo` (preferred over `filter-branch`), e.g. removing
   the tracked env paths and any doc paths that held literals, across **all
   branches and tags**.
5. Force-push **only with explicit approval**.
6. All collaborators re-clone or hard-reset to the rewritten history.
7. Re-scan full history (e.g. `gitleaks`/`trufflehog`) to confirm no secret
   remains.

---

## Appendix — verification commands

```bash
npx tsc --noEmit          # types
npm run build             # tsc → dist (committed; keep in sync)
npx vitest run            # full suite
npx prisma validate       # schema
npx prisma migrate status # read-only; shows pending + drift (needs DATABASE_URL)
git diff --check          # whitespace/conflict markers
git status
```

Last verified on branch `dev`: tsc clean · build clean (no dist drift) ·
**305/305 tests pass** · schema valid · no legacy-auth or secret in runtime/dist.
