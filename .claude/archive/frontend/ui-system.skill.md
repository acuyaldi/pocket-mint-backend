# UI System — Pocket Mint
> Read this before touching ANY component, page, or style file.

## Stack
- Next.js App Router (TypeScript)
- Tailwind CSS — custom tokens only, NEVER default color utilities
- Component library: shadcn primitives in `components/ui/` (button, input, dialog, card, separator) + custom feature components

## Design Tokens
Full palette lives in `skills/design.md` (source of truth: `app/globals.css` `@theme`). Quick reference — these are the ONLY valid color values:

| Token | Value | Usage |
|---|---|---|
| background | `#131313` | Main background (floor) |
| card | `#0e0e0e` | Card & sidebar surfaces (inset: darker than floor) |
| input | `#0a0a0a` | Input fields |
| border | `#262626` | Card borders |
| divider | `#1a1a1a` | List dividers |
| muted surface | `#1c1b1b` | Pills, muted chips |
| primary mint | `#4ade80` | Primary CTA, positive values, active states |
| destructive | `#ffb4ab` | Negative values, errors, debt indicators |
| accent orange | `#ffb347` | Paylater/installment indicators |
| foreground | `#e5e2e1` | Headings, main content |
| muted text | `#bccabb` | Labels, secondary info |
| dim text | `#3d4a3e` | Tertiary labels, placeholders |

Use semantic Tailwind classes where mapped (`bg-card`, `border-border`, `text-primary`, `text-muted-foreground`); otherwise arbitrary values or inline style with palette hex is fine — that is the established pattern in modals. NEVER Tailwind default palettes (`slate/gray/zinc/indigo/emerald/rose` — a hook rejects them).

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
- Width: `w-44` (176px)
- Background: `--bg-secondary`
- Active nav item: `border-l-2 border-[#4ade80] text-[#4ade80]` — NOT background fill
- Logo: large, bold, prominent (`text-xl font-bold font-headline`)
- User profile at bottom with avatar

## Card Component Rules
Internal layout order (top → bottom):
1. Icon + wallet type label (top row)
2. Wallet name
3. Amount (font-mono, large)
4. Progress bar or metadata (if applicable)

Cards must be "breathable" — no cramped padding, no information overload per card.

## Financial Display Rules
- Positive values: `text-[#4ade80]` with `+` prefix
- Negative/debt values: `text-[#ffb4ab]`
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
- [ ] Active sidebar uses border-left, not fill
- [ ] Financial figures use font-mono
- [ ] Right sidebar panel exists on dashboard
- [ ] No Tailwind default color classes (no `text-green-400`, use `text-[#4ade80]`)

## Anti-patterns — NEVER do these
- `text-green-400`, `bg-gray-900`, `border-gray-700` — use token values
- Inline style `color: #4ade80` — use Tailwind arbitrary or CSS variable
- Background fill for active sidebar nav items
- Sans-serif font for balance/amount display
- Skipping the right sidebar on dashboard layout
