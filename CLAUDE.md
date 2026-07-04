# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pocket Mint — a monorepo expense/finance tracker with installment ("cicilan") support.

- `apps/frontend` — Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn, package name `expense-tracker-fullstack`
- `apps/backend` — Express 4 + Prisma 6 + Zod, package name `pocket-mint-backend`
- Database — Supabase-hosted PostgreSQL, accessed via Prisma (backend) and `@supabase/ssr` (frontend auth only)

There is no root workspace/build tool (no turborepo/nx/pnpm-workspaces) — each app is run independently from its own directory.

## Commands

Frontend (`cd apps/frontend`):
- `npm run dev` — runs on **port 4000**, not 3000
- `npm run build` / `npm start` (also port 4000)
- `npm run lint`

Backend (`cd apps/backend`):
- `npm run dev` — `ts-node-dev`, auto-respawn
- `npm run build` (`tsc`) / `npm start`
- `npm run lint`
- `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` / `db:seed`

No test scripts exist in either app despite the root README mentioning Jest/Supertest — that README is stale, along with `apps/frontend/README.md` (default create-next-app boilerplate). Don't trust either for setup/port/path info.

## Where the real rules live

`apps/frontend/AGENTS.md` and `apps/backend/AGENTS.md` import per-subtree convention docs (design tokens, financial precision, Prisma usage, API design, component structure) via `apps/frontend/skills/*.md` and `apps/backend/.agents/skills/*/SKILL.md` respectively. Those referenced files are currently being reorganized/deleted from the working tree — if an import target is missing, don't invent its contents; ask what replaced it (likely a `.claude/skills/` equivalent).

Root `.clinerules` has the same project context, read by Cline (not Claude Code) — useful background/history if the AGENTS.md chains above are incomplete.

Highlights worth knowing regardless of where the docs end up:
- Design system is "Pro-Fintech Dark" — hardcoded hex tokens, **not** Tailwind's default slate/gray/zinc/indigo/emerald/rose palettes.
- All monetary values are `Prisma.Decimal` end-to-end; never `number`/`float`/`parseInt` for money. Convert with `parseFloat(val.toString())` only at the output boundary.
- Prisma client is generated to a non-default path: `apps/backend/src/generated/prisma` (import from there, not `@prisma/client`).

## Folder structure (frontend)

`apps/frontend/app/(app)/{dashboard,wallets,transactions,cicilan}/` is the current route-group structure (migrated from the old `app/feature/{...}` layout). New pages go here. URLs are clean (`/dashboard`, `/wallets`, etc.) with no redirect layer needed — `next.config.ts` no longer redirects `/dashboard` → `/feature/dashboard`.

## Backend layout inconsistency

`apps/backend/src/` has both `middleware/` (e.g. `apiKeyAuth.ts`) and `middlewares/` (e.g. `error.middleware.ts`) — this split is pre-existing, not a typo to silently "fix" by moving files.

## Git conventions

Conventional-commit-style prefixes: `feat:`, `fix:`, `chore:`.
