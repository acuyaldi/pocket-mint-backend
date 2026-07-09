# Bottom Nav Dock Morph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile bottom navigation bar with a floating dock morph navigation that preserves the current routes and account menu behavior.

**Architecture:** Introduce a reusable `DockMorph` UI component that owns the dock presentation and active-item animation, then refactor `bottom-nav.tsx` into a thin adapter that maps Pocket Mint navigation items into that component. Keep account dropdown behavior outside the dock’s internal state model so the existing shared menu content remains unchanged.

**Tech Stack:** Next.js App Router, React 19 client components, Tailwind CSS 4 token utilities, framer-motion, lucide-react, existing shadcn dropdown primitives

## Global Constraints

- Scope is mobile `bottom-nav` only; desktop sidebar remains unchanged.
- Do not add the floating `Add Transaction` action in this change.
- Preserve the existing route set and account menu behavior.
- Preserve safe-area handling for mobile devices.
- Use Pocket Mint token classes and avoid generic copied glassmorphism styling.
- Keep the dock mobile-only and hidden at `md` and above.
- Keep all interactions keyboard reachable with visible focus states.

---

### Task 1: Build the reusable dock component

**Files:**
- Create: `apps/frontend/components/ui/dock-morph.tsx`
- Test: `apps/frontend/components/ui/dock-morph.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`, `motion` and `AnimatePresence` from `framer-motion`
- Produces: `DockMorph`, `DockMorphItem`, and `DockMorphProps`

- [ ] **Step 1: Write the failing test**

Since this repo does not have a frontend test runner configured, use a compile-and-lint based failing check by first importing a component that does not exist from `bottom-nav.tsx`.

```tsx
import { DockMorph } from "@/components/ui/dock-morph";
```

Expected follow-up behavior: ESLint should fail with an unresolved import until the component is created.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx eslint "components/layout/bottom-nav.tsx"`

Expected: FAIL with an import resolution or unused import error referencing `DockMorph`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/frontend/components/ui/dock-morph.tsx` with the following structure:

```tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DockMorphItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  href?: string;
  onClick?: () => void;
  render?: (content: React.ReactNode) => React.ReactNode;
}

export interface DockMorphProps {
  items: DockMorphItem[];
  className?: string;
  contentClassName?: string;
}

export function DockMorph({ items, className, contentClassName }: DockMorphProps) {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn("pointer-events-auto", className)}
    >
      <div
        className={cn(
          "relative flex items-end gap-1 rounded-[26px] border border-white/75 bg-white/76 px-2 py-2 shadow-[0_18px_44px_rgba(11,28,48,0.16)] backdrop-blur-xl",
          contentClassName,
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = Boolean(item.isActive);
          const chrome = (
            <div
              className="relative flex min-w-[56px] flex-col items-center justify-center gap-1 px-2 py-2"
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey((current) => (current === item.key ? null : current))}
            >
              <AnimatePresence initial={false}>
                {active ? (
                  <motion.span
                    layoutId="dock-active-pill"
                    className="absolute inset-0 rounded-[20px] bg-primary/12 ring-1 ring-primary/15"
                    transition={{ type: "spring", stiffness: 360, damping: 28 }}
                  />
                ) : null}
              </AnimatePresence>
              <motion.span
                animate={
                  prefersReducedMotion
                    ? undefined
                    : hoveredKey === item.key
                      ? { y: -2, scale: 1.06 }
                      : { y: 0, scale: 1 }
                }
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className={cn(
                  "relative z-10 flex size-10 items-center justify-center rounded-full",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-[18px]" />
              </motion.span>
              <span
                className={cn(
                  "relative z-10 text-[10px] font-medium leading-none",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </div>
          );

          return (
            <div key={item.key} className="relative">
              {item.render ? item.render(chrome) : chrome}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx eslint "components/ui/dock-morph.tsx"`

Expected: PASS with no issues.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/components/ui/dock-morph.tsx
git commit -m "feat: add dock morph navigation component"
```

### Task 2: Refactor bottom nav to use the dock

**Files:**
- Modify: `apps/frontend/components/layout/bottom-nav.tsx`
- Test: `apps/frontend/components/layout/bottom-nav.tsx`

**Interfaces:**
- Consumes: `DockMorph` and `DockMorphItem` from `@/components/ui/dock-morph`, `AccountMenuItems`, `usePathname`, `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuTrigger`
- Produces: updated `BottomNav` mobile navigation integration

- [ ] **Step 1: Write the failing test**

Replace the current full-width `<nav>` structure in `bottom-nav.tsx` with an import of `DockMorph` but leave the old inline bar markup in place temporarily so ESLint catches dead code and unresolved usage transitions.

```tsx
import { DockMorph, type DockMorphItem } from "@/components/ui/dock-morph";
```

Expected follow-up behavior: the file should fail lint until the old structure is replaced with valid dock item mapping.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx eslint "components/layout/bottom-nav.tsx"`

Expected: FAIL with unused variables, dead imports, or JSX issues while the file is in transition.

- [ ] **Step 3: Write minimal implementation**

Replace the component body in `apps/frontend/components/layout/bottom-nav.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarClock,
  Target,
  User,
} from "lucide-react";
import { AccountMenuItems } from "./account-menu";
import { DockMorph, type DockMorphItem } from "@/components/ui/dock-morph";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Installments", href: "/cicilan", icon: CalendarClock },
];

export function BottomNav() {
  const pathname = usePathname();

  const items = useMemo<DockMorphItem[]>(() => {
    const routeItems = NAV_ITEMS.map((item) => ({
      key: item.href,
      label: item.label,
      icon: item.icon,
      isActive: pathname === item.href || pathname.startsWith(item.href + "/"),
      render: (content: React.ReactNode) => (
        <Link
          href={item.href}
          aria-current={pathname === item.href || pathname.startsWith(item.href + "/") ? "page" : undefined}
          className="block rounded-[20px] focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
        >
          {content}
        </Link>
      ),
    }));

    routeItems.push({
      key: "account",
      label: "Account",
      icon: User,
      render: (content: React.ReactNode) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="block rounded-[20px] focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
          >
            {content}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={14}>
            <AccountMenuItems />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });

    return routeItems;
  }, [pathname]);

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center md:hidden"
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <DockMorph
        items={items}
        className="mx-auto"
        contentClassName="max-w-[calc(100vw-1.5rem)]"
      />
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx eslint "components/layout/bottom-nav.tsx"`

Expected: PASS with no issues.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/components/layout/bottom-nav.tsx apps/frontend/components/ui/dock-morph.tsx
git commit -m "feat: switch mobile bottom nav to dock morph"
```

### Task 3: Polish motion, spacing, and accessibility

**Files:**
- Modify: `apps/frontend/components/ui/dock-morph.tsx`
- Modify: `apps/frontend/components/layout/bottom-nav.tsx`
- Test: `apps/frontend/components/ui/dock-morph.tsx`
- Test: `apps/frontend/components/layout/bottom-nav.tsx`

**Interfaces:**
- Consumes: `DockMorph` structure from Task 1 and `BottomNav` adapter from Task 2
- Produces: final motion tuning, safer layout bounds, and accessible dock behavior

- [ ] **Step 1: Write the failing test**

Add the reduced-motion and active-state polish changes in a temporary inconsistent way first, for example by referencing `useReducedMotion()` logic in `bottom-nav.tsx` without importing or wiring it.

```tsx
const prefersReducedMotion = useReducedMotion();
```

Expected follow-up behavior: ESLint should fail until the final polish is applied consistently in the dock component instead of the adapter.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx eslint "components/ui/dock-morph.tsx" "components/layout/bottom-nav.tsx"`

Expected: FAIL with undefined identifier or unused value errors.

- [ ] **Step 3: Write minimal implementation**

Update `apps/frontend/components/ui/dock-morph.tsx` to refine the item chrome and motion:

```tsx
const showHoverLift = !prefersReducedMotion && hoveredKey === item.key && !active;

<motion.span
  animate={
    prefersReducedMotion
      ? undefined
      : showHoverLift
        ? { y: -2, scale: 1.06 }
        : active
          ? { y: -1, scale: 1.02 }
          : { y: 0, scale: 1 }
  }
  transition={{ type: "spring", stiffness: 320, damping: 22 }}
  className={cn(
    "relative z-10 flex size-10 items-center justify-center rounded-full transition-colors",
    active ? "text-primary" : "text-muted-foreground",
  )}
>
```

Also refine the dock container class:

```tsx
"relative flex items-end gap-1 rounded-[26px] border border-white/75 bg-white/76 px-2 py-2 shadow-[0_18px_44px_rgba(11,28,48,0.16)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/72"
```

And keep `bottom-nav.tsx` focused on layout only:

```tsx
contentClassName="w-fit max-w-[calc(100vw-1.5rem)]"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx eslint "components/ui/dock-morph.tsx" "components/layout/bottom-nav.tsx"`

Expected: PASS with no issues.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/components/ui/dock-morph.tsx apps/frontend/components/layout/bottom-nav.tsx
git commit -m "feat: polish dock morph motion and accessibility"
```

### Task 4: Final verification

**Files:**
- Verify: `apps/frontend/components/ui/dock-morph.tsx`
- Verify: `apps/frontend/components/layout/bottom-nav.tsx`
- Verify: `apps/frontend/components/layout/account-menu.tsx`

**Interfaces:**
- Consumes: completed dock morph implementation from Tasks 1-3
- Produces: verification evidence for lint and behavior claims

- [ ] **Step 1: Run focused lint checks**

Run: `npx eslint "components/ui/dock-morph.tsx" "components/layout/bottom-nav.tsx" "components/layout/account-menu.tsx"`

Expected: PASS with no issues.

- [ ] **Step 2: Run broader frontend lint check**

Run: `npm run lint`

Expected: If the repo-level lint script still fails because `next lint` is incompatible with the current Next.js 16 setup, capture that exact failure and do not attribute it to the dock change.

- [ ] **Step 3: Manual behavior checklist**

Check on a mobile viewport:

```text
- Dock is visible only below md
- Dock floats above the bottom edge
- Current route item is visually active
- Tapping route items navigates correctly
- Account item opens dropdown above the dock
- Focus ring is visible on keyboard navigation
- Bottom safe-area spacing remains intact
- Motion feels brief and restrained
```

- [ ] **Step 4: Commit verification-ready state**

```bash
git add apps/frontend/components/ui/dock-morph.tsx apps/frontend/components/layout/bottom-nav.tsx docs/superpowers/plans/2026-07-09-bottom-nav-dock-morph.md
git commit -m "chore: finalize dock morph bottom nav"
```
