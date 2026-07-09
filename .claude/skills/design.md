---
name: Pro-Fintech Dark
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bccabb'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#869486'
  outline-variant: '#3d4a3e'
  surface-tint: '#4de082'
  primary: '#4ade80'
  on-primary: '#003919'
  primary-container: '#4ade80'
  on-primary-container: '#005e2d'
  inverse-primary: '#006d36'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#ffd9c1'
  on-tertiary: '#4f2500'
  tertiary-container: '#ffb47f'
  on-tertiary-container: '#794418'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6dfe9c'
  primary-fixed-dim: '#4de082'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005227'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb784'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#6c3a0f'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1280px
  gutter: 20px
---

## Source of Truth

`apps/frontend/app/globals.css` `@theme` is the compiled truth — those `--color-*`, `--font-*`, and `--radius-*` values are what Tailwind emits and what components render. This doc describes that; it does not override it. The YAML frontmatter above is the raw Material-token export from Stitch AI — where a frontmatter token conflicts with `globals.css`, `globals.css` wins. Load-bearing values:

| Role | globals.css var | Hex |
|---|---|---|
| Floor / background | `--color-background` | `#131313` |
| Card (Level 1) | `--color-card` | `#0e0e0e` |
| Modal / popover (Level 2) | `--color-popover` | `#111111` |
| Input field | `--color-input` | `#0a0a0a` |
| Border | `--color-border` | `#262626` |
| Divider (lists) | utility | `#1a1a1a` |
| Row hover | utility | `#141414` |
| Text (on-surface) | `--color-foreground` | `#e5e2e1` |
| Muted text | `--color-muted-foreground` | `#bccabb` |
| Muted surface | `--color-muted` | `#1c1b1b` |
| Accent surface | `--color-accent` | `#2a2a2a` |
| Primary (hero) | `--color-primary` / `--color-ring` | `#4ade80` |
| On-primary | `--color-primary-foreground` | `#003919` |
| Secondary | `--color-secondary` | `#bcc7de` |
| Error / loss | `--color-destructive` | `#ffb4ab` |

Fonts: `--font-heading` Hanken Grotesk · `--font-sans` Inter · `--font-mono` JetBrains Mono.
Radius: `sm` 0.125 · DEFAULT 0.25 (buttons/inputs) · `lg` 0.5 · `xl` 0.75 (cards) · `full`.

## Brand & Style
The design system is engineered for high-stakes financial environments, prioritizing clarity, precision, and a premium "pro" aesthetic. It utilizes a **High-Contrast Modern** style, leaning into the sophistication of deep blacks and the energy of vibrant mint accents. 

The brand personality is authoritative yet forward-thinking. It evokes a sense of security and technological edge through sharp execution and controlled use of color. The interface focuses on "data-density without clutter," using depth and contrast rather than excessive decoration to guide the user's eye.

## Colors
The palette is rooted in a **Deep Charcoal (#131313)** foundation — a near-black that maximizes contrast for dense financial data without pure-black clipping. #131313 is the shipped `--color-background`. 

- **Primary:** "Pocket Mint" (#4ade80) is reserved for growth, success, primary actions, and brand identification.
- **Surface Strategy:** An *inset* elevation model — cards sit slightly **darker** than the floor (#0e0e0e vs #131313) and are defined by a 1px #262626 border rather than by lightening. Modals/popovers use #111111.
- **Functional Colors:** Coral/Rose (#ffb4ab) is used sparingly for risk/loss; Mint (#4ade80) remains the hero for all positive interactions.

## Typography
The typography system balances the precision of developer-centric tools with the approachability of a modern fintech app.

- **Headlines:** Uses **Hanken Grotesk** for a sharp, contemporary look that feels professional and technical.
- **Body:** **Inter** provides maximum legibility for financial statements and dense data tables.
- **Data Labels:** **JetBrains Mono** is utilized for transaction IDs, numerical data, and timestamps to emphasize the "pro-fintech" technical nature of the platform.

## Layout & Spacing
The design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

A strict **4px baseline grid** governs all vertical rhythm. Large margins (24px+) are used on the edges of the screen to create a "contained" feel that mirrors premium terminal software. Data-dense areas (like portfolios or watchlists) should use the `sm` (8px) and `md` (16px) tokens to keep information compact but readable.

## Elevation & Depth
Depth is communicated through **borders + tonal layering**, not light-source shadows. The model is *inset*: surfaces recede (get darker) as they layer, and 1px borders define them.

1.  **Level 0 (Floor):** #131313 — main application background (`--color-background`).
2.  **Level 1 (Cards):** #0e0e0e with a 1px #262626 border (`--color-card` / `--color-border`).
3.  **Level 2 (Modals/Popovers):** #111111 with the same #262626 border (`--color-popover`).

Inputs sit at #0a0a0a (`--color-input`). List dividers use #1a1a1a; row hover uses #141414. Shadows appear only on Level 2+ as a soft deep-black glow to silhouette against lower layers — never a light-source shadow.

## Shapes
This design system uses a **Soft (0.25rem)** roundedness profile. This specific radius strikes a balance between the aggressive "sharpness" of institutional trading platforms and the friendliness of consumer fintech. 

- **Buttons & Inputs:** Use the base 4px (0.25rem) radius.
- **Cards & Containers:** Use the `rounded-xl` 12px (0.75rem) radius for a more structural appearance.
- **Status Pills:** Use a full pill-shape for high-contrast distinction from interactive buttons.

## Components

- **Buttons:** 
  - *Primary:* Solid Mint background with Black text for maximum impact. 
  - *Secondary:* Ghost style with a Mint border and Mint text.
  - *Tertiary:* All-white text on a transparent background for low-priority actions.
- **Input Fields:** Dark background (#0a0a0a) with a subtle border. On focus, the border transitions to Mint with a subtle outer glow.
- **Cards:** Used to group financial data. Background #0e0e0e (`--color-card`) with a 1px #262626 border; card radius `xl` (0.75rem).
- **Chips/Badges:** For status updates (e.g., "Market Open"). These use a low-opacity Mint background with high-opacity Mint text.
- **Lists:** Transaction lists use thin #1a1a1a dividers. Row hover uses a subtle #141414 highlight.
- **Data Visualization:** Line charts and bars should use the Primary Mint (#4ade80) for positive trends and Coral/Rose (#ffb4ab) for negative trends, ensuring they pop against the #131313 background.
