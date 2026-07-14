# Archived frontend-era agent skills

These files came from the old frontend/monorepo repository and are **not part of
the backend skill load order**. They are kept for historical reference only
(design tokens, Stitch palette, old session prompts). Do not `@`-reference them
from `AGENTS.md` and do not restore them to `.claude/skills/`.

The mirror copies under `.agents/` and `.codex/` belong to other agent tools and
are intentionally left untouched.

| File | Why archived |
| --- | --- |
| `ui-system.skill.md` | Tailwind/Next.js UI rules — no frontend code in this repo |
| `design.md` | Pro-Fintech Dark design tokens — frontend design reference |
| `MASTER_PROMPT.md` | One-off July session task list, all tasks completed; its `createdAt`-based P&L rule contradicts the current `date`/REPORTING_TIMEZONE reporting semantics |
| `dev.SKILL.md` | Assumed monorepo paths (`apps/frontend`, `apps/backend`) that do not exist here |
| `new-feature.SKILL.md` | Scaffolds Next.js frontend features — frontend-only |
| `check-tailwind-colors.js` | PostToolUse hook matching only `apps/frontend/**/*.tsx` — dead in this repo; removed from `.claude/settings.json` |
