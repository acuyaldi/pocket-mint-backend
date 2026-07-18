---
name: deployment-operations
description: Use when working on Railway or Supabase environments, Vercel coordination, GitHub Actions CI, migration rollout to shared databases, secrets, or scaling decisions.
---

# Deployment & Operations

## Environments (never mix)

| | Staging | Production |
| --- | --- | --- |
| Branch | `dev` | `main` |
| App | Railway staging service | Railway production service |
| DB/Auth | Supabase Dev project | Supabase Production project |
| Frontend | Vercel Preview | Vercel Production |

`master` is a retired legacy branch — it is not an environment and must not be
deployed from.

## Railway

- Staging service auto-deploys from `dev`; production from `main` (Railway
  Git integration is the CD; GitHub Actions is CI only).
- Health check path: `/health` (returns `{ status: 'ok', ... }`).
- Build/start use the repository scripts: `npm run build` / `npm start`.
  `PORT` is injected by Railway and must be honored (config already does).
- **Do not put `prisma migrate deploy` into app startup.** Migration rollout is
  a controlled manual step; this stays forbidden until the user explicitly
  lifts it in writing (see `prisma-database.skill.md` and
  `docs/prisma-migration-reconciliation.md`).
- Deployment happens only via merge to `dev`/`main` (Railway Git
  integration) — there is no sanctioned manual `railway up`-style deploy path.
- One replica for this small personal project unless metrics prove otherwise.
  Rate limits are per-instance (in-memory) — scaling out changes behavior.

## Supabase

- Dev and Production projects stay isolated; signature verification (per-project
  JWT keys) is what isolates them — never point staging at the prod project.
- **Credentials that appeared in Git history must be confirmed rotated before
  any deploy** — a standing blocker until verified (see the staging-blocker
  notes and `docs/deployment-runbook.md` §10).
- `db.<ref>.supabase.co` resolves **IPv6-only**; IPv4-only platform egress
  (Railway default) needs Supavisor URLs: transaction pooler (`:6543`) for
  `DATABASE_URL`, session mode (`:5432`) for `DIRECT_URL`/migrations.
- Never use the Production DB for staging.

## Vercel Coordination

- FE Preview `NEXT_PUBLIC_API_URL` → Railway staging origin + `/api/v1`.
- Railway staging `CORS_ALLOWED_ORIGINS` must contain the **exact** FE Preview
  origin (no wildcard).
- Supabase auth redirect URLs must include the preview callback/reset routes.

## CI/CD

- GitHub Actions (`.github/workflows/ci.yml`) runs on PR/push to `dev`:
  `npm ci` → `prisma generate` → `tsc --noEmit` → `prisma validate` →
  `vitest run` → `npm run build` → generated-client packaging check →
  `git diff --exit-code` (committed `dist/` must match the build).
- Never bypass failing CI (no force-merge, no skipping steps locally to "match").
- PRs target `dev`. A release PR `dev → main` requires an explicit release
  instruction from the user.
- The workflow's branch filters are `dev`/`main` (fixed under PM-STAB-004;
  the obsolete `master` filter was removed) — pushes/PRs to `main` now
  trigger CI, so a release PR into `main` is gated the same as `dev`.

## Migrations Against Shared Databases

- Read-only first: `prisma migrate status` / `migrate diff`.
- Backup / confirm PITR before anything destructive.
- Never run remote migrations from an unidentified environment — prove which DB
  you are pointed at first.
- Record commands in docs/runbooks with `<placeholders>`, never secret values.
- Full procedure: `docs/deployment-runbook.md` §5–§9.

## Cost-Conscious Defaults (<~10 users)

- One Railway replica; conservative `DB_POOL_MAX` (default 10).
- Monitor metrics before scaling anything.
- No Redis, Kubernetes, queues, or other infrastructure without evidence.

## Common Mistakes

- Adding a `railway.json`/startup hook that auto-migrates — rollout is manual
  and ordered while the baseline is being reconciled.
- Deploying backend before the frontend sends `Authorization: Bearer` —
  every request 401s (golden rule in the runbook).
- Putting a real connection string in a runbook/commit to "document" it.
