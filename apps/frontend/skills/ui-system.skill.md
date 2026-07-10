# UI System — Pocket Mint
> Read this before touching ANY component, page, or style file.

## Stack
- Next.js App Router (TypeScript)
- Tailwind CSS — custom tokens only, NEVER default color utilities
- Component library: shadcn primitives in `components/ui/` (button, input, dialog, card, separator) + custom feature components

## Design Tokens
Theme is **light** ("Corporate / Modern", off-white canvas + mint growth accent). Full palette lives in `skills/design.md` (source of truth: `app/globals.css` `@theme`). Quick reference — these are the ONLY valid color values:

| Token | globals.css var | Value | Usage |
|---|---|---|---|
| background | `--color-background` | `#f8f9ff` | Page canvas (light) |
| card | `--color-card` | `#ffffff` | Card & panel surfaces |
| popover | `--color-popover` | `#ffffff` | Modals, dropdowns |
| input | `--color-input` | `#eff4ff` | Input fields |
| border | `--color-border` | `#bccabb` | Card / divider borders |
| muted | `--color-muted` | `#e5eeff` | Pills, muted chips, row hover |
| muted-foreground | `--color-muted-foreground` | `#3d4a3e` | Labels, secondary text, placeholders |
| primary | `--color-primary` | `#006d36` | Primary CTA, positive values, active states |
| primary-foreground | `--color-primary-foreground` | `#ffffff` | Text/icon on primary fills |
| secondary | `--color-secondary` | `#545f73` | Transfers, neutral emphasis |
| accent | `--color-accent` | `#d3e4fe` | Hover surfaces, secondary buttons |
| accent-foreground | `--color-accent-foreground` | `#0b1c30` | Text on accent |
| destructive | `--color-destructive` | `#ba1a1a` | Negative values, errors, debt |
| warning | `--color-warning` | `#895024` | Paylater / installment / mid-utilization |
| foreground | `--color-foreground` | `#0b1c30` | Headings, main content |
| ring | `--color-ring` | `#006d36` | Focus rings |

**Prefer semantic Tailwind classes** (`bg-card`, `border-border`, `text-primary`, `text-muted-foreground`, `bg-warning`) — the `@theme` block generates a utility for every token above. When a value must be inline (dynamic/computed styles), use `var(--color-*)`, not a raw hex — raw hex silently breaks if the theme shifts. NEVER Tailwind default palettes (`slate/gray/zinc/indigo/emerald/rose` — a hook rejects them).

## Typography
- `font-headline` → Hanken Grotesk — section titles, page headings
- `font-body` → Inter — body text, labels, descriptions
- `font-mono` → JetBrains Mono — ALL financial figures (balances, amounts, percentages)

**Never use system fonts for financial figures. Always font-mono.**

## Spacing & Scale
- Card padding: `p-5` minimum, `p-6` preferred
- Card border radius: `rounded-xl`
- Input border radius: `rounded-lg`
- Section gap: `gap-4` or `gap-6`
- Dashboard grid: `grid-cols-[1fr_320px]` (main content + right sidebar)

## Sidebar Rules
- Desktop rail (`components/ui/sidebar.tsx`): 60px collapsed → 300px expanded. Hover expands an absolute overlay panel (never reflows page); pin toggle persists the expanded state. Mobile uses `bottom-nav.tsx`.
- Active nav item: `text-primary font-semibold` + `aria-current="page"` — NOT a background fill. (The `border-l` active style in older mocks is superseded.)
- Every rail interactive gets a mint `focus-visible:outline-2 focus-visible:outline-primary` ring.
- Logo: `PocketMintLogo`, text shown only when expanded.

## Card Component Rules
Internal layout order (top → bottom):
1. Icon + wallet type label (top row)
2. Wallet name
3. Amount (font-mono, large)
4. Progress bar or metadata (if applicable)

Cards must be "breathable" — no cramped padding, no information overload per card.

## Financial Display Rules
- Positive values: `text-primary` with `+` prefix
- Negative/debt values: `text-destructive`
- Net worth figure: minimum `text-4xl font-mono font-bold`
- Currency prefix (Rp) in smaller weight than the number itself

## Dashboard Layout
```
[Sidebar 176px] | [Main content area] | [Right sidebar 320px]
                   Net Worth card (full width)
                   Wallet cards grid (2 col)
                   Recent Transactions
                                          Monthly P&L
                                          Debt Ratio
```

## Stitch Alignment Checklist
Before marking any UI task done, verify:
- [ ] Font sizes match Stitch reference (net worth dominant, hierarchy clear)
- [ ] Card padding is spacious (not cramped)
- [ ] Active sidebar uses `text-primary`, not fill
- [ ] Financial figures use font-mono
- [ ] Right sidebar panel exists on dashboard
- [ ] No Tailwind default color classes (no `text-green-400`, use `text-primary`)

## Anti-patterns — NEVER do these
- `text-green-400`, `bg-gray-900`, `border-gray-700` — use token classes
- Inline raw hex (`color: "#006d36"`) — use `var(--color-primary)` or a Tailwind token class
- Background fill for active sidebar nav items
- Sans-serif font for balance/amount display
- Skipping the right sidebar on dashboard layout
