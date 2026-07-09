# Product

## Register

product

## Users

Primary: the developer himself — daily personal finance tracking. Broader: Indonesian consumers juggling e-wallets (GoPay, OVO), bank accounts, credit cards, and paylater/cicilan debt (Kredivo, Akulaku).

Context: quick money check-ins on mobile and desktop — after a purchase, at bill time, at month end. The job to be done: know net worth, spendable money, debt exposure, and installment progress at a glance; log a transaction in seconds.

## Product Purpose

Pocket Mint is an IDR-native expense and finance tracker with first-class installment ("cicilan") and debt support. Unlike generic expense trackers, it models debt wallets honestly (negative balances, credit limits, utilization), locks installment totals at creation, and computes net worth from live asset balances only.

Success looks like: numbers the user trusts without double-checking, transaction logging fast enough to happen in the moment, and debt kept legible — ratio, paylater rates, and installment progress always one glance away.

## Brand Personality

Authoritative yet forward-thinking. Three words: **precise, composed, pro**. Evokes security and technological edge — the calm of premium terminal software, not the cheer of a consumer app. Emotional goal: the user feels in control of their money, including the uncomfortable parts (debt).

## Anti-references

- **Generic shadcn admin** — the default slate/zinc SaaS dashboard template look. Pocket Mint has its own committed dark system (Pro-Fintech Dark); falling back to stock component styling is regression.
- **Playful consumer bank apps** — bright pastel, mascot-y GoPay/Jenius energy. No confetti, no gamified debt.
- (From the design system doc): Bloomberg-grade clutter — data-density is a goal, visual noise is not.

## Design Principles

1. **Numbers are the interface.** The financial figure is the hero of every screen; layout, type, and color exist to make it readable at a glance. All figures in mono.
2. **Debt told straight.** Negative states are shown honestly and calmly — coral for loss, real utilization percentages, no sugarcoating and no shame.
3. **Density without clutter.** Hierarchy comes from tonal layering, borders, and type scale — never from decoration. Every element earns its place.
4. **Earned familiarity.** Standard affordances, one consistent component vocabulary across screens. The tool disappears into the task.
5. **Fast logging wins.** Entering a transaction is the core loop; friction there costs more than anywhere else.

## Accessibility & Inclusion

WCAG AA target: ≥4.5:1 body-text contrast on the dark surfaces, visible focus states (mint ring), full keyboard operability, and `prefers-reduced-motion` alternatives for all animation. Color is never the only signal for gain/loss — pair with +/− prefixes.
