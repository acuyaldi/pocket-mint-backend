# Backend deployment runbook — JWT-only auth (Sprint 3I)

Operational runbook for deploying the JWT-only backend (`pocket-mint-be`) to
staging and production. Companion to [`frontend-jwt-migration.md`](./frontend-jwt-migration.md).

**Golden rule:** the frontend must send `Authorization: Bearer <access_token>`
and be deployed **first**. Deploying this JWT-only backend before the frontend
is Bearer-capable returns a uniform `401` to every user request.

No secret values appear in this document. Fill placeholders (`<...>`) from the
secret manager at deploy time.

---

## 0. Quick reference (build, start, health, Node version)

| | |
| --- | --- |
| **Node version** | `22.x` (pinned in `package.json` `engines`; matches `.github/workflows/ci.yml`) |
| **Build command** | `npm run build` (= `prisma generate && tsc && node src/scripts/copy-prisma-client.cjs`) |
| **Start command** | `npm start` (= `node dist/server.js`) |
| **Health endpoint** | `GET /health` → `{ status: 'ok', ... }` (`200`) |
| **Required environment variables** | See §1 below — `NODE_ENV`, `DATABASE_URL`, one of `SUPABASE_JWT_SECRET`/`SUPABASE_URL`, `CORS_ALLOWED_ORIGINS` are mandatory in production; `PORT` is platform-injected |

Deployment is Railway Git integration (auto-deploy on push): staging service
tracks `dev`, production service tracks `main`. There is no separate deploy
script to invoke — merging to the branch is the deploy trigger. See
`.claude/skills/deployment-operations.skill.md` for environment/platform
detail.

---

## 1. Environment variable inventory

Parsed exclusively in [`src/config/index.ts`](../src/config/index.ts). Nothing
else reads `process.env`.

| Variable | Prod | Sensitive | Default | Notes / action |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | required | no | `development` | Set `production` in prod/staging so stack traces never reach clients and config validation is fatal. |
| `PORT` | optional | no | `5001` | Bind port; platform may inject its own. |
| `DATABASE_URL` | required | **yes** | — | Postgres/Supabase connection. See §10 for credential-rotation status. |
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

Four local migrations, none applied to the configured database (confirmed via
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

### `20260717000000_generalize_wallets_and_bills` — MIXED (additive + in-place enum/data change)
```sql
ALTER TYPE "WalletType" RENAME VALUE 'LOAN_PAYLATER' TO 'PAYLATER';
ALTER TYPE "WalletType" ADD VALUE 'LOAN';
ALTER TABLE "wallets" ADD COLUMN "cutoff_day" INTEGER, ADD COLUMN "payment_due_day" INTEGER;  -- + bounds checks
ALTER TABLE "installments" ADD COLUMN "kind" ..., ADD COLUMN "paid_terms" ..., ADD COLUMN "next_due_date" ...;
-- backfills paid_terms/next_due_date from current_term/start_date, then sets next_due_date NOT NULL
```
- Enum rename + new value and the new nullable wallet columns are backward
  compatible with old code (it never reads them). The `installments` backfill
  is additive/widening only — it does not drop or narrow any existing column.
  Safe to apply before the new code. Rollback is **not** a simple reverse (see
  `docs/prisma-migration-reconciliation.md` §10) — restore from backup if this
  one needs to be undone.

### `20260718000000_drop_unused_transfer_model` — SAFE / NON-DESTRUCTIVE (dead table)

```sql
ALTER TABLE IF EXISTS "transfers" DROP CONSTRAINT ...;  -- x3 FKs
DROP TABLE IF EXISTS "transfers";
```

- The `Transfer` model had zero application readers or writers (all transfers
  use `Transaction` rows with `type='TRANSFER'` and `toWalletId`; see PD-007 and
  `.claude/skills/financial-logic.skill.md` §16). Old and new code both ignore
  this table — safe to apply any time, no ordering constraint relative to the
  code deploy. Rollback = re-add the table via a new migration (Prisma has no
  down-migrations); no data loss risk since nothing ever wrote to it.

### ⚠️ Migration-history drift — provisioning blocker for a FRESH database (RESOLVED, re-verified 2026-07-18)

`prisma migrate status` used to report **"last common migration: null"**
because the database's original baseline migrations (`..._init`,
`..._rename_account_to_wallet` — the latter appears twice in the remote
history) were **absent from `prisma/migrations/` locally**. This was fixed by
reconstructing `prisma/migrations/20260710000000_baseline/` (see
`docs/prisma-migration-reconciliation.md` §2–§5) so that a fresh database can
be provisioned from the migration repository alone (PM-STAB-004).

Current state, on a disposable PostgreSQL 18 instance:

- **Fresh/empty database**: `prisma migrate deploy` applies all five
  migrations (`baseline` → `remove_local_user_password` →
  `add_transaction_to_wallet` → `generalize_wallets_and_bills` →
  `drop_unused_transfer_model`) in order and reaches a schema **identical** to
  `prisma/schema.prisma` (empty `migrate diff`, `migrate status` reports
  "Database schema is up to date"). No manual SQL, no `db push`, no dependency
  on any other database. All five migrations have been replayed end-to-end
  this way, independently, more than once — see
  `docs/prisma-migration-reconciliation.md` §6 and the cross-repo evidence in
  `pocket-mint-fe/docs/releases/mvp-stable-rc-validation.md` §7, §17.5, and
  §18 (dated 2026-07-18). ✅
- **Existing database** (the one in `DATABASE_URL`, a snapshot/branch of it, or
  staging/production): still has only the legacy `_init`/`_rename` history
  applied — none of the five repo migrations have been deployed there yet.
  Provisioning it is a `migrate resolve --applied 20260710000000_baseline`
  (metadata only) followed by `migrate deploy` for the four newer migrations —
  see `docs/prisma-migration-reconciliation.md` §7–§9. This step is still
  **manual and not yet executed against any real staging/production database**;
  it requires a backup window and is not something to run against `.env`'s
  database "to test".

Do not attempt `migrate reset` on any shared database.

---

## 6. Migration deployment order

Both environments — never auto-apply to a remote DB; run each step deliberately:

1. **Back up / snapshot** the target database.
2. Apply the **additive/safe** migrations — `add_transaction_to_wallet`,
   `generalize_wallets_and_bills`, and `drop_unused_transfer_model` (all safe
   before code).
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

**Timeline (PM-STAB-003):** the `.env` exposure commit is dated 2026-07-10;
this runbook's rotation guidance was first documented 2026-07-13 — a gap of
**three days**, not months. Do not restate this gap as longer than it was.

**Update 19 Jul 2026 — forensic re-verification (PM-STAB-003):** The original
entries below (row 1) were written from an initial incident-response
assumption that `.env` / `.env.local` had leaked a live Supabase DB password.
A full-history forensic pass across every commit, branch, and blob in both
`pocket-mint-be` and `pocket-mint-fe` (`git log --all -p` scan for
`DATABASE_URL`, `DIRECT_URL`, `service_role`, and both Supabase project refs)
found **no** DATABASE_URL, DIRECT_URL, database password, or Supabase
service-role key was ever committed in either repository. The only real
content of the historically tracked `.env` / `.env.local` blobs (commits
`d2daa7d`, `a900b69`) was public client config:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` — all belonging to the
**Development** Supabase project (`clambteumrweoektkejl`). The
**Production** project (`wvrdnmiuyeecqatlwbpp`) never appears anywhere in
git history of either repository. The row below is retained (not deleted)
for history, with its status corrected.

| Credential | Class | Action |
| --- | --- | --- |
| Supabase **DB password** | ~~Rotation required — was in git-tracked `.env`, still in history~~ **Corrected 19 Jul 2026: never committed.** Forensic scan found no `DATABASE_URL`/`DIRECT_URL` value, real or placeholder-with-real-data, in any tracked blob. No rotation required based on current evidence. | None required. Re-open if new evidence of a committed DB credential surfaces. |
| Retired shared **API key** (`kunci_...`) | Confirmed hardcoded in `pocket-mint-fe` git history — retired, backend no longer accepts it | Remove from all deploy secrets; remove the hardcoded value from frontend source; purge from history (§11). No live system uses it. |
| **Supabase JWT secret** (Mode A) | Not in tracked history (confirmed by forensic scan) | No rotation required based on current evidence. Rotating it **invalidates all active user sessions** — only do so if new exposure evidence appears. |
| **Service-role key** | Not used by this backend; not found in either repo's history | Never ship it to this service. |
| **Supabase anon key** | Public config (Development project only) | Not a secret; do not confuse with the service-role key. Historically visible in git history — see Residual Risk below. |

No rotation of the Production Supabase project's credentials is recommended
based on current evidence, since that project never appeared in git history.

### 10.1 Database-password rotation checklist — evidence required

**PM-STAB-003 stays Open until every field below is filled with real,
dated, operator-attributed evidence.** An unfilled or partially filled
checklist means the rotation has not been verified — never mark this
issue Resolved from this checklist alone; production verification (§8,
Phase B of the remediation plan) must also pass. Never write a real
credential value into this file — record variable *names*, dates,
operators, and pass/fail outcomes only.

| Evidence field | Recorded value |
| --- | --- |
| Rotation date | *(pending)* |
| Operator | *(pending)* |
| Affected variable names | *(pending — e.g. `DATABASE_URL`, `DIRECT_URL`)* |
| Railway variables updated | *(pending — staging / production, per-service)* |
| Local production tooling updated | *(pending — e.g. `db-backup.mjs`/`db-restore.mjs`/`db-verify.mjs` configs, any local `.env` used for ops)* |
| Old password invalidation verified | *(pending — confirm the previous password no longer authenticates)* |
| Production connectivity verified | *(pending — health endpoint + Prisma connect check)* |
| Smoke-test result | *(pending — see §9 smoke-test matrix outcome)* |

Do not backfill this table with assumed or partial completion. Leave a
field `(pending)` until the corresponding action has actually occurred and
been confirmed.

---

## 11. Git-history purge plan — PENDING EXPLICIT APPROVAL (do not execute)

History still contains the Development project's public client config
(`NEXT_PUBLIC_*`) and the retired frontend-hardcoded API key: `.env` /
`.env.local` were tracked before commit `a900b69` untracked them (that
public config remains visible in prior commits); the frontend hardcoded key
is documented from the audit. No privileged credential (DB password,
service-role key, JWT secret) was found in history — see §10.
`.env` and `.env.local` are now untracked and git-ignored, but **history is
not rewritten**.

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

## 12. Backend release tagging

`pocket-mint-be` has no tags yet (`git tag -l` is empty at time of writing).
When a release is cut, tag the same way the frontend does — see
`pocket-mint-fe/docs/releases/README.md` §7 for the full rationale — with the
backend-specific points below.

- **When:** after the production rollout (§8) is deployed and verified
  (`/health` green, smoke-test matrix in §9 passed), on the commit that was
  merged to `main` for that release. Do not tag before production is confirmed
  healthy.
- **Naming:** `vMAJOR.MINOR.PATCH` (SemVer, `v` prefix), same scheme as the
  frontend's `README.md` §2 — major stays `0` until Public Stable.
- **Annotated tag required:** `git tag -a vX.Y.Z -m "Pocket Mint BE vX.Y.Z"`,
  never a lightweight tag — an annotated tag carries author/date/message
  metadata needed for the GitHub Release (§13).
- **Relationship to frontend tags:** backend and frontend tags are
  **independent** — each repo versions and tags on its own schedule. Give them
  the same version number only when a release happens to ship both sides
  together; never force them to stay in sync artificially (mirrors
  `pocket-mint-fe/docs/releases/README.md` §7's "Tag FE dan BE independen"
  rule).

---

## 13. GitHub Release procedure

See `pocket-mint-fe/docs/releases/README.md` §11 for the full procedure
(applies identically to this repo — only the repository and tag differ).
Summary for `pocket-mint-be`:

- Created in **this repository** (`pocket-mint-be`), from the annotated tag in
  §12, via the GitHub UI ("Draft a new release") or `gh release create`.
- **Published**, not left as a draft, once §12's tagging preconditions
  (production verified) are met — a draft is only a working step while writing
  the release body.
- Title: `Pocket Mint BE vX.Y.Z`.
- Body: summarize the notable backend changes since the last BE tag (schema
  migrations applied, API/behavior changes, security fixes) in plain language.
  This backend has no `src/lib/changelog.ts` equivalent yet (see
  `pocket-mint-fe/docs/releases/README.md` §6) — until one exists, write the
  release body directly from the merged PRs/commits for that release.

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
