# Pocket Mint Backend — Agent Instructions

Express 5 + TypeScript + Prisma 7 (driver adapter) + Supabase Postgres.
JWT-only authentication. Deployed via Railway (staging = `dev`,
production = `main`; `master` is retired and unused).

Project workflow rules load automatically:

@.claude/skills/agent-rules.skill.md
@.claude/skills/git-workflow.skill.md

Read the matching domain skill before working in its area (paths relative to
repo root):

- `.claude/skills/git-workflow.skill.md` — branching, PR, and release process
- `.claude/skills/authentication-security.skill.md` — auth, middleware, users, CORS, rate limiting
- `.claude/skills/financial-logic.skill.md` — wallets, transactions, transfers, installments, dashboard, reconciliation
- `.claude/skills/prisma-database.skill.md` — Prisma schema, migrations, generated client, pooling, DB deployment
- `.claude/skills/backend-api.skill.md` — routes, controllers, DTOs, serializers, services
- `.claude/skills/deployment-operations.skill.md` — Railway, Supabase envs, CI/CD, migration rollout, secrets

Frontend-era skills were archived to `.claude/archive/frontend/` and are not
part of the load order.
