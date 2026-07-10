# Frontend Audit — Pages & Components

> **Scope:** `apps/frontend/app/` (Next.js 16 App Router).
> **Generated:** 2026-07-09 · **Purpose:** living map of every route, the components it renders, and the parent→child layout wrapping — readable by humans and by AI in future sessions.
>
> ⚠️ Keep this file current. See the *Automatic Documentation Maintenance* rule in the root `AGENTS.md`.

---

## 1. Architecture note (no MFE)

Pocket Mint frontend is a **single Next.js App-Router application**, not a micro-frontend (MFE) composition. There is no module federation, no remote/host split, and no separate deployable UI shells. What looks like "cross-module" wiring is **feature-sliced code sharing** inside one app:

- **Route groups** — `app/(app)/` is a layout group (parentheses = no URL segment). Public routes (`/`, `/login`, `/register`) live directly under `app/` and get **only** the root layout.
- **Feature slices** — business logic lives in `src/features/{transactions,wallets,installments}/hooks/*` and is consumed by pages via React Query hooks.
- **Shared components** — `components/` (root-level `WalletCard`, `Logo`, `ui/*`, `layout/*`).
- The only genuinely **cross-feature** page is the **Dashboard**, which aggregates all three feature slices and re-uses the Transactions feature's `AddTransactionModal`. Flagged per page below.

---

## 2. Pages Mapping

| # | Route | Page file | Layout group | Rendering |
|---|-------|-----------|--------------|-----------|
| 1 | `/` | [app/page.tsx](../apps/frontend/app/page.tsx) | *(root only)* | Server Component |
| 2 | `/login` | [app/login/page.tsx](../apps/frontend/app/login/page.tsx) | *(root only)* | Client (`"use client"`) |
| 3 | `/register` | [app/register/page.tsx](../apps/frontend/app/register/page.tsx) | *(root only)* | Client |
| 4 | `/dashboard` | [app/(app)/dashboard/page.tsx](<../apps/frontend/app/(app)/dashboard/page.tsx>) | `(app)` | Client |
| 5 | `/wallets` | [app/(app)/wallets/page.tsx](<../apps/frontend/app/(app)/wallets/page.tsx>) | `(app)` | Client |
| 6 | `/transactions` | [app/(app)/transactions/page.tsx](<../apps/frontend/app/(app)/transactions/page.tsx>) | `(app)` | Client |
| 7 | `/cicilan` | [app/(app)/cicilan/page.tsx](<../apps/frontend/app/(app)/cicilan/page.tsx>) | `(app)` | Client |
| 8 | `/profile` | [app/(app)/profile/page.tsx](<../apps/frontend/app/(app)/profile/page.tsx>) | `(app)` | Client |
| — | `/auth/callback` | [app/auth/callback/route.ts](../apps/frontend/app/auth/callback/route.ts) | *(root only)* | Route Handler (GET) — Supabase OAuth code exchange + backend user sync, then redirect to `/dashboard` |
| 9 | `/auth/reset-password` | [app/auth/reset-password/page.tsx](../apps/frontend/app/auth/reset-password/page.tsx) | *(root only)* | Client (`"use client"`) — password-recovery landing page (set new password) |

**Layout files**

| File | Wraps | Renders |
|------|-------|---------|
| [app/layout.tsx](../apps/frontend/app/layout.tsx) | **every** route | `<html>`/`<body>`, Google fonts (Hanken Grotesk / Inter / JetBrains Mono), `QueryProvider` (React Query) |
| [app/(app)/layout.tsx](<../apps/frontend/app/(app)/layout.tsx>) | routes 4–8 | `AppSidebar` + `<main>` scroll container + `BottomNav` |

**Middleware & auth wiring**

| File | Role |
|------|------|
| [proxy.ts](../apps/frontend/proxy.ts) | Root request middleware (**Next.js 16 renamed `middleware` → `proxy`**) — calls `updateSession` on every request (matcher excludes static assets). Enforces route protection: unauthenticated → blocked from `/dashboard`; authenticated → bounced off `/login` & `/register`. `/auth/callback` passes through. |
| [lib/supabase/middleware.ts](../apps/frontend/lib/supabase/middleware.ts) | `updateSession` — refreshes the Supabase session cookie and holds the redirect rules. |
| [app/actions/auth.ts](../apps/frontend/app/actions/auth.ts) | Server actions: `login`, `signup` (+ backend sync), `signInWithGoogle` (OAuth initiate), `logout`, `getUser`. `login`/`signup` read an optional `captchaToken` from `FormData` and forward it as `options.captchaToken` for hCaptcha anti-bot verification (non-breaking: omitted when absent). |
| [lib/auth/sync-user.ts](../apps/frontend/lib/auth/sync-user.ts) | `syncUserToBackend` + `resolveUserName` — shared user-sync helper used by both `signup()` and the OAuth callback. |
| [app/auth/reset-password/page.tsx](../apps/frontend/app/auth/reset-password/page.tsx) | Password-recovery landing page. **Client-side** flow (no server action): the login page calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: …/auth/reset-password })`; this page exchanges the recovery code (browser client, PKCE + `detectSessionInUrl`) and calls `supabase.auth.updateUser({ password })`, then `signOut()` → `/login?message=…`. |

---

## 3. Component Audit per Page

### Shared layout chrome (routes 4–8 only)

| Component | File | Renders / notes |
|-----------|------|-----------------|
| `AppSidebar` | [components/layout/app-sidebar.tsx](../apps/frontend/components/layout/app-sidebar.tsx) | Desktop rail. Uses `Sidebar` primitives (`components/ui/sidebar.tsx`), `PocketMintLogo`, 4× `SidebarLink` nav (Dashboard/Wallets/Transactions/Installments), an **Add Transaction** button that dispatches the `fab-add-transaction` window event, and an `AccountMenuItems` dropdown. The account entry label is **dynamic**: it reads the Supabase session client-side (`createClient().auth.getUser()`) and shows `user_metadata.full_name` → `user_metadata.name` → `email`, falling back to the static `"Account"` while loading or when signed out. |
| `BottomNav` | [components/layout/bottom-nav.tsx](../apps/frontend/components/layout/bottom-nav.tsx) | Mobile only (`md:hidden`). Same 4 nav items mirrored via `DockMorph` (`components/ui/dock-morph.tsx`) + `AccountMenuItems`. |
| `AccountMenuItems` | [components/layout/account-menu.tsx](../apps/frontend/components/layout/account-menu.tsx) | Shared dropdown body used by both sidebar and bottom nav. |

---

### 1. Landing — `/` · `app/page.tsx`
| Element | Source | Note |
|---|---|---|
| `PocketMintLogo` | `components/Logo` | shared |
| `Button` (Sign In / Get Started) | `components/ui/button` | shared, both link to `/login` |
| Header / Hero / "System Signals" panel | inline | local markup |
| Capability cards + Roadmap aside | inline (`capabilityCards`, `productSignals` const) | local |
| Icons | `lucide-react` | `ArrowRight, CalendarClock, ShieldCheck, Wallet, Webhook` |

**Cross-feature:** none. Static marketing page, no data hooks.

---

### 2. Login — `/login` · `app/login/page.tsx`  (Sign In / Sign Up toggle)
| Element | Source |
|---|---|
| `login`, `signup`, `signInWithGoogle` server actions | `app/actions/auth` |
| `PocketMintLogo` | `components/Logo` |
| `Button`, `Input`, `Card*` (`Card/CardContent/CardDescription/CardHeader/CardTitle`) | `components/ui/*` |
| `GoogleIcon` (inline SVG) + **functional** Google button (`<form action={signInWithGoogle}>`) | local |
| `HCaptcha` anti-bot widget (`sitekey` = `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`) | `@hcaptcha/react-hcaptcha` |
| `accessHighlights` panel, password show/hide toggle | local state |
| `useSearchParams` (reads `?error=` from OAuth callback) | `next/navigation` — component wrapped in `<Suspense>` |

**Mode toggle:** `authMode: "signin" | "signup" | "forgot"` local state. Sign Up adds **Name**, **Confirm password** fields + client validation (valid email, password ≥ 8 chars, passwords match) before calling `signup`. Toggle link swaps modes ("Don't have an account? Sign Up" ⇄ "Already have an account? Sign In"). Loading spinner + inline error (`displayError`: submit error → Google init error → OAuth `?error=`) on all modes. Also reads `?message=` to show a success banner (bounced back from the reset-password page).
**Forgot password:** a **"Forgot password?"** link sits in the password-field label row and is shown **only in `signin` mode** (never in signup, and never next to the Google button). It switches the card to `forgot` mode — an email-only form that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: …/auth/reset-password, captchaToken })` client-side and confirms with *"Check your email inbox for the password reset link."* The Google button + sign-up toggle are hidden in this mode; a "Back to sign in" link returns.
**hCaptcha anti-bot layer:** all three credential flows — **Sign In**, **Sign Up**, and **Forgot Password** — are protected by a native Supabase Auth captcha. An `<HCaptcha>` widget (`@hcaptcha/react-hcaptcha`, `sitekey` = `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`) renders inside the form; its verified token is held in local `captchaToken` state via `onVerify` (cleared on `onExpire`/`onError`). The **submit button stays disabled until a token exists** (`disabled={busy || !captchaToken}`). On submit the token is forwarded to Supabase: appended to `FormData` → the `login`/`signup` server actions pass it as `options.captchaToken`; the client-side `resetPasswordForEmail` receives it in its options. Any failed submit (or mode switch) calls `captchaRef.current.resetCaptcha()` and clears the token so a fresh challenge is required. **Google OAuth is intentionally exempt** — its separate `<form action={signInWithGoogle}>` is unaffected and never gated by the token (third-party OAuth is secured by Google's own infra). Requires `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` in the frontend env (placeholder shipped in `apps/frontend/.env` / `.env.local`) plus captcha enabled in the Supabase dashboard.
**Cross-feature:** none (auth actions + Supabase browser client only).

---

### 3. Register — `/register` · `app/register/page.tsx`
| Element | Source |
|---|---|
| `signup` server action | `app/actions/auth` |
| `Button`, `Input` | `components/ui/*` |
| Split-screen branding + live password-strength checklist | local |

**Cross-feature:** none. ⚠️ **Design debt:** this page uses hardcoded dark-slate hex (`#0F172A`, `#38BDF8`, `#10B981`…) instead of the project design tokens — divergent from every other route.

---

### 4. Dashboard — `/dashboard` · `app/(app)/dashboard/page.tsx`  ⭐ cross-feature hub
| Element | Source | Note |
|---|---|---|
| `WalletCard` | `components/WalletCard` | shared, "Wallets Overview" grid (max 4) |
| `AddTransactionModal` | `app/(app)/transactions/components/AddTransactionModal` | **cross-feature import** from the Transactions slice |
| `Button` | `components/ui/button` | Add New Transaction |
| Net Worth hero, Monthly P&L, Active Installments widgets | inline sections | live data |
| `formatCurrency` | `lib/utils` | |
| Icons | `lucide-react` | `TrendingUp, ArrowDownLeft, ArrowUpRight, Plus` |

**Data hooks (3 feature slices):** `useTransactions`, `useCreateTransaction`, `useMonthlySummary` (transactions) · `useWallets` (wallets) · `useInstallments` (installments).
**Events:** listens for `fab-add-transaction` (fired by sidebar / bottom-nav FAB) to open the add modal.

---

### 5. Wallets — `/wallets` · `app/(app)/wallets/page.tsx`
| Element | Source | Note |
|---|---|---|
| `WalletSummaryCard` | `./components/WalletSummaryCard` | net-worth summary card |
| `CreateWalletModal` | `./components/CreateWalletModal` | |
| `EditWalletModal` | `./components/EditWalletModal` | |
| `WalletCard` | `components/WalletCard` | **shared** (variant `"full"`), grid |
| `ConnectAccountCard` | inline local | dashed "add" tile |
| Total Debt Ratio card, filter pills (All/Assets/Debts), sort-by-balance | inline | |
| `Button` | `components/ui/button` | |
| `motion` | `framer-motion` | stagger/fade animations |

**Data hooks:** `useWallets`, `useCreateWallet` (wallets slice).
**Cross-feature:** re-uses shared `WalletCard` only.
> Local sibling components also present: [FullWidthSparkline.tsx](<../apps/frontend/app/(app)/wallets/components/FullWidthSparkline.tsx>) (not imported by the page as of this audit).

---

### 6. Transactions — `/transactions` · `app/(app)/transactions/page.tsx`
| Element | Source |
|---|---|
| `TransactionStats` | `./components/TransactionStats` |
| `TransactionBreakdownChart` | `./components/TransactionBreakdownChart` (Income vs Expense donut) |
| `TransactionFilters` | `./components/TransactionFilters` |
| `TransactionTable` | `./components/TransactionTable` |
| `TransactionDetailPanel` | `./components/TransactionDetailPanel` |
| `EditTransactionModal` | `./components/EditTransactionModal` |
| `DeleteTransactionModal` | `./components/DeleteTransactionModal` |
| `AddTransactionModal` | `./components/AddTransactionModal` |
| `PAGE_SIZE`, `DateRangeFilter` | `./components/constants` |
| `motion` | `framer-motion` |

**Data hooks:** `useTransactions`, `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` (transactions) · `useWallets` (wallets, for filter/labels).
**Auth guard:** Supabase `createClient()` → redirect to `/login` if no user.
**Cross-feature:** consumes `useWallets`; its `AddTransactionModal` is the component the **Dashboard** borrows.

---

### 7. Installments (Cicilan) — `/cicilan` · `app/(app)/cicilan/page.tsx`
| Element | Source | Note |
|---|---|---|
| `HeroCard` | `./components/HeroCard.tsx` | ⚠️ **explicit `.tsx` extension required** in this folder |
| `InstallmentList` | `./components/InstallmentList.tsx` | |
| `RightSidebar` | `./components/RightSidebar.tsx` | |
| `motion` | `framer-motion` | |
| `LoaderCircle` | `lucide-react` | loading state |

**Local component library** (in `cicilan/components/`, imported with `.tsx`): `HeroCard`, `InstallmentList`, `RightSidebar`, plus `InstallmentCard`, `JatuhTempoCard`, `OutstandingLiabilityCard`, `StatCard`, `ActiveInstallmentsWidget`, `Sparkline`.
**Data hooks:** `useInstallments` (installments slice).
**Cross-feature:** none.
> **Folder anomaly:** components inside `cicilan/` MUST be imported with explicit `.tsx` extensions — do not strip them (documented in root `AGENTS.md` / `CLAUDE.md`).

---

### 8. Profile — `/profile` · `app/(app)/profile/page.tsx`
| Element | Source |
|---|---|
| `Button`, `Input`, `Card/CardContent/CardHeader/CardTitle` | `components/ui/*` |
| Auth session | `createClient().auth.getUser()` client-side; redirects to `/login` when signed out. Reads `app_metadata.provider` to branch the UI. |
| Account Identity card | Readonly `Input` fields (Email + Name/Username) shown for **every** login method, sourced from `email` / `user_metadata.full_name`\|`name`. |
| Change-password form + strength meter | local state (no backend wiring yet — simulated `setTimeout`). **Rendered only for `provider === "email"`** (manual register). |
| Google Auth notice | **`provider === "google"`** hides the change-password form and shows a high-contrast `warning`-token notice: *"Password cannot be changed because you are logged in using Google Auth."* |
| Icons | `lucide-react` (`CheckCircle2, Info, KeyRound, Loader2, ShieldCheck, UserRound`) |

**Conditional login logic:** `provider = user.app_metadata.provider` splits the page — Google users get readonly identity + notice (no password form), email users get readonly identity + the working change-password form.

**Cross-feature:** none.

---

### 9. Reset Password — `/auth/reset-password` · `app/auth/reset-password/page.tsx`
| Element | Source |
|---|---|
| Supabase browser client | `createClient()` from `lib/supabase/client` — recovery-code exchange (`onAuthStateChange` / `getSession`) + `updateUser({ password })` |
| `Button`, `Input`, `Card/CardContent/CardDescription/CardHeader/CardTitle` | `components/ui/*` |
| `PocketMintLogo` | `components/Logo` |
| Icons | `lucide-react` (`ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck`) |

**Recovery flow:** landing page for the reset email link (email-only **Email/Password** users; Google users never see the forgot-password entry point). On mount the browser client exchanges the recovery code in the URL for a short-lived session (`sessionReady`). The form (New Password + Confirm New Password) validates ≥ 8 chars + match, calls `updateUser({ password })`, then `signOut()` and redirects to `/login?message=…`. Submit is disabled until a valid recovery session is detected; an expired/invalid link shows a `warning`-token notice.
**Cross-feature:** none.

---

## 4. Structure tree (parent → child layout)

```
proxy.ts        ──  updateSession on every request (auth refresh + route guard · Next 16 middleware)
│
app/layout.tsx  ──  <html><body> · fonts · QueryProvider (React Query)
│
├── /               → app/page.tsx              (Landing · server)
├── /login          → app/login/page.tsx        (Sign In / Sign Up / Forgot-password toggle + Google OAuth)
├── /register       → app/register/page.tsx
├── /auth/callback  → app/auth/callback/route.ts (OAuth code exchange · route handler)
├── /auth/reset-password → app/auth/reset-password/page.tsx (recovery landing · set new password · client)
│
└── app/(app)/layout.tsx   ──  AppSidebar + <main> + BottomNav
    │                            (desktop rail · mobile DockMorph)
    ├── /dashboard     → dashboard/page.tsx    ⭐ aggregates all 3 feature slices
    ├── /wallets       → wallets/page.tsx        + WalletSummaryCard, Create/EditWalletModal
    ├── /transactions  → transactions/page.tsx   + Stats, BreakdownChart, Filters, Table,
    │                                               DetailPanel, Add/Edit/Delete modals
    ├── /cicilan       → cicilan/page.tsx         + HeroCard, InstallmentList, RightSidebar (*.tsx)
    └── /profile       → profile/page.tsx         + identity card + conditional change-password form (email) / Google Auth notice (google)
```

**Shared building blocks** (used across pages): `components/WalletCard.tsx`, `components/Logo.tsx` (`PocketMintLogo`), `components/ui/{button,input,card,dialog,dropdown-menu,sidebar,tooltip,separator,dock-morph}.tsx`, `components/layout/{app-sidebar,bottom-nav,account-menu}.tsx`, `components/WalletSparkline.tsx`.

**Feature slices** (data layer, outside `app/`): `src/features/{transactions,wallets,installments}/hooks/*`.
