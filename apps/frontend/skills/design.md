---
name: Midnight Executive
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c5c6cd'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8f9097'
  outline-variant: '#45474c'
  surface-tint: '#bcc7de'
  primary: '#bcc7de'
  on-primary: '#263143'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#545f73'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#b9c8de'
  on-tertiary: '#233143'
  tertiary-container: '#1b2a3b'
  on-tertiary-container: '#8291a6'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#d4e4fa'
  tertiary-fixed-dim: '#b9c8de'
  on-tertiary-fixed: '#0d1c2d'
  on-tertiary-fixed-variant: '#39485a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
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
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
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
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

This design system is engineered for a high-stakes fintech environment where trust and precision are paramount. The aesthetic is rooted in **Modern Corporate** minimalism with a distinct **Dark Mode** first approach. It leverages deep indigo and navy foundations to evoke the stability of traditional banking, while utilizing electric accents to signal technological speed and innovation.

The UI should feel expansive and calm, using generous negative space to reduce cognitive load during complex financial tasks. Visual interest is generated through subtle tonal shifts and sharp typography rather than decorative elements. The goal is an interface that feels like a premium, private wealth management tool—quiet, efficient, and authoritative.

## Colors

The palette is anchored by "Midnight Navy," a deep, desaturated blue that serves as the primary canvas. 

- **Primary Canvas:** Use `#0F172A` for global backgrounds and `#1E293B` for primary surfaces and containers.
- **Action Accent:** `#38BDF8` (Electric Cyan) is reserved strictly for primary calls-to-action, active states, and critical data points.
- **Data & Typography:** Use a scale of cool greys derived from the navy base. Primary text should be high-contrast white (`#F8FAFC`), while secondary metadata uses `#94A3B8`.
- **Semantic Colors:** Success states should use a forest green (`#10B981`), and error states a crisp crimson (`#EF4444`), both adjusted for high legibility against dark backgrounds.

## Typography

The system utilizes a dual-font approach to balance character with utility. **Hanken Grotesk** is used for headlines and currency displays to provide a clean, contemporary edge with its sharp terminals. **Inter** is used for all functional body text and UI labels due to its exceptional legibility at small sizes and high x-height.

Numeric data (account balances, stock prices) should prioritize tabular lining figures to ensure vertical alignment in lists. Large displays should use slight negative letter-spacing to maintain a "tight" professional appearance.

## Layout & Spacing

The layout operates on a strict **8px grid system**. 

- **Desktop:** A 12-column fluid grid with 64px side margins. Content should be grouped in cards that span 3, 4, or 6 columns.
- **Mobile:** A 4-column grid with 16px side margins.
- **Spacing Logic:** Use `md` (16px) for internal component padding and `lg` (24px) for spacing between distinct sections or cards. 

Information density should be kept moderate. Avoid "cramming" data; use the `xl` (40px) vertical spacing to separate high-level summary modules from granular transaction lists.

## Elevation & Depth

Depth in this dark-themed system is communicated through **Tonal Layering** rather than traditional shadows. Shadows are difficult to perceive on near-black backgrounds, so we elevate elements by lightening their fill color.

- **Level 0 (Background):** `#0F172A` - The lowest floor.
- **Level 1 (Cards/Surface):** `#1E293B` - Standard containers for content.
- **Level 2 (Dropdowns/Modals):** `#334155` - Floating elements that require immediate attention.

To define boundaries without adding visual noise, use a **Low-Contrast Outline**. Apply a 1px border of `#334155` to all Level 1 cards. For active or focused states, transition the border color to the Primary Accent (`#38BDF8`) with a subtle outer glow (0px 0px 8px).

## Shapes

The shape language is disciplined and geometric, utilizing a **Soft (0.25rem)** base. This subtle rounding removes the harshness of a purely "brutalist" sharp corner while maintaining a serious, institutional feel.

- **Buttons & Inputs:** Use the base 4px (0.25rem) radius.
- **Content Cards:** Use `rounded-lg` (8px / 0.5rem) to differentiate large structural containers from smaller components.
- **Status Pills:** Use a full "Pill" radius for status indicators (e.g., "Completed," "Pending") to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons use a solid `#38BDF8` fill with dark navy text. Secondary buttons use an outlined style with the accent color. Ghost buttons for low-priority actions use the tertiary text color.
- **Input Fields:** Backgrounds should be a shade darker than the card they sit on. Use a 1px border (`#334155`). On focus, the border shifts to the primary accent.
- **Cards:** Use Level 1 surfacing (`#1E293B`) with an 8px corner radius. No shadow; use a subtle 1px border for definition.
- **Chips/Badges:** Small, high-radius elements used for categories. Use a low-opacity version of the accent color (e.g., `#38BDF8` at 15% opacity) as the background to keep them subtle.
- **Lists:** Transaction lists should use "Inter" for all text. The amount should be bolded. Use thin dividers (`#334155`) with 16px of vertical padding between items.
- **Data Visualizations:** Charts and graphs must use the accent blue as the primary data line. Use a gradient area fill below lines that fades from the accent color to transparent.