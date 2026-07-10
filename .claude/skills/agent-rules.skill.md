# Agent Rules — Pocket Mint
> Load this first. These rules override default behavior.

## Skill Load Order
Before any task, read in this order:
1. `agent-rules.skill.md` ← this file
2. `ui-system.skill.md` ← for any frontend/component work
3. `financial-logic.skill.md` ← for any wallet/transaction/installment work

## Behavior Rules

### Focus
- Work on ONE task at a time. Finish it, confirm it works, then move on.
- If a task requires backend AND frontend, do backend first. Never touch frontend before the endpoint exists.
- Do not refactor unrelated code while fixing a bug.

### Before Writing Code
- Check if the file/function already exists. Never duplicate.
- If a Prisma model change is needed, write migration first, run it, then write the route.
- If an endpoint already exists, fix it — don't create a new one.

### File Safety
- NEVER touch `globals.css`, `layout.tsx`, or any root layout file unless the task explicitly requires it.
- NEVER change Prisma schema without running `npx prisma migrate dev` immediately after.
- NEVER hardcode data that should come from the API.

### API Conventions
- All endpoints return `{ data, error }` shape
- Auth is always required — check middleware before adding new routes
- Net worth is always computed, never stored

### Frontend Conventions
- Use design tokens from `ui-system.skill.md` — never Tailwind defaults
- Financial figures always use `font-mono` (JetBrains Mono)
- Positive = `text-[#4ade80]`, Negative = `text-[#ffb4ab]`
- Loading state required for every data-fetching component

### Git & Pull Request Conventions (Staging vs Production)
- **Branch Roles:** Branch `master` adalah Production (Live App) dan branch `dev` adalah Staging (Development/Testing).
- **Feature Branching:** Setiap kali mulai mengerjakan task baru, Agent **WAJIB** membuat branch baru dari base `dev` (misal: `feature/nama-fitur` atau `fix/nama-bug`). JANGAN PERNAH commit atau push langsung ke branch `dev` atau `master`.
- **Target Pull Request:** Saat membuat Pull Request (PR), pastikan source branch-nya adalah branch fitur baru tersebut, dan **TARGET BRANCH-nya HARUS `dev` (Staging)**.
- **Pengecualian:** JANGAN PERNAH menargetkan PR ke branch `master` kecuali ada perintah tertulis eksplisit dari pengguna untuk kebutuhan rilis hotfix produksi.

### Documentation Maintenance
- **Automated Audit Update:** Setiap kali Agent melakukan modifikasi, penambahan, atau penghapusan file halaman baru di dalam direktori `apps/frontend/app/` atau mengubah struktur komponen utama, Agent **WAJIB** langsung memperbarui berkas peta fitur di `docs/audit.md`.
- File `docs/audit.md` harus mencakup: pemetaan halaman (route), daftar komponen utama yang digunakan, dan hubungan antar layout parent-child. Jangan biarkan file ini out-of-date.

### Completion Criteria
A task is DONE only when:
- [ ] No TypeScript errors
- [ ] `npm run build` passes
- [ ] API returns correct shape (test with curl or check response in code)
- [ ] UI renders without console errors
- [ ] Berhasil memperbarui dokumen status fitur di `docs/audit.md` jika ada perubahan halaman/komponen
- [ ] No regressions to existing features

## Common Mistakes to Avoid
- **SALAH ALUR GIT:** Membuat Pull Request langsung menuju branch `master` (Alur yang benar: Bikin branch dari `dev`, push, lalu buat PR dengan target merge ke `dev`).
- Melakukan commit atau push langsung (*direct push*) ke branch `dev` atau `master`.
- Lupa mengupdate berkas `docs/audit.md` setelah selesai melakukan tweak/refactor komponen halaman frontend.
- Starting frontend before backend is ready
- Forgetting to recalculate net worth after wallet mutation
- Using hardcoded mock data instead of live API
- Skipping loading/error states in UI components
- Touching global styles for a component-level fix