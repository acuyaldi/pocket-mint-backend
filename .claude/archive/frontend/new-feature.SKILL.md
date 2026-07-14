---
name: new-feature
description: Scaffold a new frontend feature folder under apps/frontend/app/(app)/<name>/ following Pocket Mint's component-structure conventions. Use when the user asks to add a new page/feature/section to the frontend, e.g. "/new-feature budgets".
disable-model-invocation: true
---

Scaffold a new feature at `apps/frontend/app/(app)/<name>/` (the target route-group structure — see root CLAUDE.md's folder-structure note; do not scaffold under `app/feature/`).

Given `<name>` (kebab-case, e.g. `budgets`):

1. Create `apps/frontend/app/(app)/<name>/page.tsx` — layout + data fetching only, max ~150 lines per `component-structure.md`. No business logic or heavy JSX inline; import from `components/` and `hooks/` below.
2. Create `apps/frontend/app/(app)/<name>/components/` — feature-specific components, one component per file, PascalCase filenames matching the component name (e.g. `<Name>Summary.tsx`, `<Name>List.tsx`).
3. Create `apps/frontend/app/(app)/<name>/hooks/` — feature-specific hooks, camelCase with `use` prefix (e.g. `use<Name>Data.ts`), using `@tanstack/react-query`'s `useQuery`/`useMutation`. Never `useEffect` for data fetching.
4. Wire up any shared UI from `components/ui/` or `components/layout/` rather than duplicating — check those folders before creating new primitives.

Follow the existing rules already loaded automatically for this subtree (`apps/frontend/AGENTS.md` → `apps/frontend/skills/*.md`):
- Use design tokens from `skills/design.md`, never Tailwind's default slate/gray/zinc/indigo/emerald/rose.
- Format all money with `formatCurrency` from `@/lib/utils` — never write a new formatter.
- Icons from `lucide-react` only.
- Explicit TypeScript interfaces for all props and return types; no `any`.

After scaffolding, ask the user what data/fields the feature needs before writing real logic — don't invent an API contract.
