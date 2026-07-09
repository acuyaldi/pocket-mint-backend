# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

`apps/frontend/AGENTS.md` imports the frontend convention docs from `apps/frontend/skills/`: `design.md` (design tokens), `ui-system.skill.md` (layout/component rules), `financial-logic.skill.md` (wallet/net-worth/installment business rules — applies to backend work too). `.Codex/skills/` holds invocable skills (`dev`, `new-feature`). The old `apps/backend/.agents/skills/` docs and `apps/backend/AGENTS.md` were deleted in the reorg — recover from git history if ever needed, don't reinvent them.

Root `.clinerules` has the same project context, read by Cline (not Codex) — useful background/history if the AGENTS.md chains above are incomplete.

### ⚠️ CRITICAL INSTRUCTION FOR Codex:
Before executing ANY prompt, you **MUST** read and adhere to the behaviors defined in the skill files above. Additionally, follow these strict execution rules:
1. **Strict Context Focus:** Work on ONE task at a time. Do not modify, refactor, or clean up any code/files outside the direct context of the prompt.
2. **Cicilan Component Anomaly:** Inside `apps/frontend/app/(app)/cicilan/`, local components MUST be imported using explicit `.tsx` extensions (e.g., `import HeroCard from "./HeroCard.tsx"`). Never strip away this extension.
3. **No Global Grep:** Do not run wide-scope global searches or scan `node_modules`, `.next`, or `dist` directories to preserve token usage.

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

## Allowed Frontend Dependencies
Hanya gunakan library yang sudah terinstall di `apps/frontend/package.json`:
- Next.js 16.2 / React 19.2
- Primitif & UI: @base-ui/react, shadcn, lucide-react
- Animasi & Styling: framer-motion, tw-animate-css, tailwind-merge
- Data Fetching: @tanstack/react-query, axios, @supabase/supabase-js
Jangan install package baru kecuali diperintahkan secara eksplisit.

# Pocket Mint Monorepo Rules

This is the root configuration. Depending on which app you are working on, you MUST check the specific rules inside their directories:

- For Frontend work, always read and follow: `apps/frontend/AGENTS.md` and `apps/frontend/AGENTS.md`
- For Backend work, follow the backend instructions.

## Design Context

Strategic design context lives in root `PRODUCT.md` — register: **product** (app UI; design serves the task). Read it before any UI/UX work. Core principles: numbers are the interface (mono figures, figure-first hierarchy); debt told straight; density without clutter; earned familiarity (one component vocabulary); fast transaction logging. Accessibility target: WCAG AA. Visual tokens stay in `apps/frontend/skills/design.md` (source of truth: `app/globals.css` `@theme`).

## AUTOMATIC DOCUMENTATION MAINTENANCE RULE

Setiap kali Agent melakukan modifikasi, penambahan, atau penghapusan pada file di dalam direktori `apps/frontend/app/` atau mengubah fungsionalitas komponen utama di dalamnya, Agent WAJIB memperbarui dokumentasi status komponen di file `docs/audit.md` pada langkah penutup tugas sebelum menyatakan selesai. Jangan biarkan file audit ini out-of-date.
