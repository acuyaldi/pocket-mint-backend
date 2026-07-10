---
name: Pocket Mint
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a3e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7b6d'
  outline-variant: '#bccabb'
  surface-tint: '#006d36'
  primary: '#006d36'
  on-primary: '#ffffff'
  primary-container: '#4ade80'
  on-primary-container: '#005e2d'
  inverse-primary: '#4de082'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#895024'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffb47f'
  on-tertiary-container: '#794418'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
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
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
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
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The brand personality is grounded in financial clarity and proactive growth. It targets the self-hosting enthusiast who values privacy and precision. The emotional response should be one of "controlled transparency"—the user feels in command of their data through a clean, systematic interface.

The design style is **Corporate / Modern** with a focus on data density and legibility. It utilizes a refined digital-first aesthetic that avoids unnecessary decoration, favoring functional whitespace and subtle depth to organize complex financial information. 
- **Growth-Centric:** Mint green is used purposefully to highlight positive trends.
- **Trust-Driven:** Deep slate provides a stable foundation, ensuring the UI feels robust and institutional.
- **Precision-Focused:** Every element aligns to a strict grid to reinforce the feeling of an organized ledger.

## Colors
This design system uses a logic-gated color palette where hue communicates financial status:
- **Primary (Mint Green):** Reserved for "Assets," "Income," and "Growth." It represents the "Mint" in the brand name.
- **Secondary (Deep Slate):** Used for primary navigation, headings, and high-contrast text to convey stability and security.
- **Accent (Amber):** Specific to "Pending" states, upcoming installments, or warnings that require attention but aren't critical failures.
- **Error (Coral Red):** Dedicated to "Debt," "Over-budget" alerts, and negative cash flow indicators.

The background uses a subtle off-white (`#f8fafc`) to reduce eye strain, while cards and containers use pure white to pop from the background.

## Typography
Inter is selected for its exceptional legibility and neutral, professional tone. 

**Numerical Data:**
All currency and balance displays must use `tabular-nums` (Tabular Figures). This ensures that decimal points and digits align vertically in lists and tables, allowing users to scan and compare values rapidly without visual jitter.

**Hierarchy:**
- **Headlines:** Use tighter letter spacing and Semi-Bold weights to create a strong anchor for page sections.
- **Labels:** Small, uppercase labels are used for metadata like "Transaction Date" or "Account Type" to differentiate from primary content.
- **Body:** Standardized at 16px for optimal readability in data-heavy contexts.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a max-width container of 1280px for desktop to maintain readability.

- **Grid:** A 12-column grid for desktop, 8-column for tablet, and 4-column for mobile.
- **Rhythm:** An 8px (base 4) spacing system governs all margins and paddings.
- **Padding:** High-level dashboard widgets should use `lg` (24px) internal padding to provide "breathing room" for financial data.
- **Mobile Adaptivity:** On mobile, widgets stack vertically and horizontal margins reduce to 16px. Transaction rows remain full-width to maximize the touch target and horizontal space for currency values.

## Elevation & Depth
Depth is created through **Tonal Layers** and **Ambient Shadows** to differentiate between the canvas and interactive elements.

- **Level 0 (Canvas):** The base background layer, using a very light slate tint.
- **Level 1 (Cards):** Primary containers for wallets and widgets. These use a soft, highly diffused shadow (Blur: 12px, Y: 4px, Opacity: 4%) to appear slightly lifted.
- **Level 2 (Modals/Dropdowns):** Higher elevation with a more pronounced shadow (Blur: 20px, Y: 8px, Opacity: 8%) and a subtle 1px border using the secondary color at 10% opacity.
- **Interactive States:** Buttons and cards use a slight scale-down (0.98x) on click rather than heavy shadow changes to maintain the "Modern Fintech" polish.

## Shapes
The design system utilizes **Rounded** shapes (8px / 0.5rem) to soften the professional tone, making the financial data feel approachable rather than intimidating.

- **Standard Elements:** Buttons, input fields, and small cards use the 8px base radius.
- **Large Containers:** Dashboard widgets and main wallet cards use `rounded-lg` (16px) to define major layout sections.
- **Chips/Status Tags:** Utilize `rounded-xl` (24px) or full pill-shape to distinguish them from interactive buttons.

## Components

### Wallet Cards
Wallet cards are the primary data containers. 
- **Asset Wallets:** Feature a 4px left-border accent of Primary Mint.
- **Debt Wallets:** Feature a 4px left-border accent of Coral Red.
- Cards must include a "Balance" in `display-lg` and a "Limit/Available" secondary line in `body-sm`.

### Transaction Rows
- Layout: [Icon/Category] [Merchant/Name (Bold)] [Date/Subtext] --- [Amount (Tabular)].
- Positive transactions (Income) use Primary Mint for the amount text.
- Negative transactions (Expenses) use the Secondary Slate.

### Installment Progress Bars
- High-contrast track (Slate at 10% opacity) with a solid Primary Mint fill.
- If an installment is "Pending" or "Upcoming," the fill color shifts to Accent Amber.
- Always include "X of Y months" label aligned to the right.

### Net Worth Summary Widgets
- A hero-style component at the top of the dashboard.
- Uses a large-scale line chart (sparkline) with a gradient fill.
- The "Net Worth" total is always the largest typographic element on the page.

### Buttons & Inputs
- **Primary Button:** Solid Secondary Slate background with white text.
- **Secondary Button:** White background with a 1px Slate border.
- **Inputs:** Clean, 1px bordered boxes that highlight in Primary Mint on focus. Error states use a Coral Red border and subtext.