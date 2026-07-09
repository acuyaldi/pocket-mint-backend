# Bottom Nav Dock Morph Design

## Goal

Replace the current mobile `bottom-nav` with a dock-morph style navigation while keeping desktop sidebar behavior unchanged.

This change is intentionally scoped to mobile navigation only. The floating `Add Transaction` action is not part of this change; the dock should be structured so that action can be added later without a large refactor.

## Scope

In scope:
- Replace `apps/frontend/components/layout/bottom-nav.tsx` visual treatment and interaction model
- Introduce a reusable dock-style UI component under `apps/frontend/components/ui/`
- Preserve the existing route set and account menu behavior
- Preserve safe-area handling for mobile devices
- Add polished but restrained motion for load, active state, and hover/tap

Out of scope:
- Desktop sidebar redesign
- Floating add-transaction CTA changes
- Route changes or navigation IA changes
- Backend or state-management changes

## Existing Behavior

The current bottom nav is a full-width fixed bar on mobile with:
- five route links
- one account dropdown trigger
- active state based on `usePathname()`
- safe-area padding via `env(safe-area-inset-bottom)`

The current behavior is functionally correct, but the visual treatment is flatter and heavier than desired for the new mobile direction.

## Proposed Solution

### 1. Introduce a reusable dock component

Create a reusable `DockMorph` component in `apps/frontend/components/ui/dock-morph.tsx`.

Responsibilities:
- render dock items in a floating rounded container
- support active state rendering
- support icon + label items
- support optional custom trigger nodes for items like account dropdown
- support bottom positioning for current use case
- expose styling hooks via props/className without hardcoding app routes

This component should be adapted to Pocket Mint tokens instead of using generic glassmorphism defaults from the reference snippet.

### 2. Replace the mobile bottom nav with the dock

`apps/frontend/components/layout/bottom-nav.tsx` will become a thin integration layer that:
- maps existing route items into dock items
- computes the active route from `usePathname()`
- renders the existing account dropdown as the last dock item
- preserves mobile-only visibility
- preserves bottom safe-area spacing

The desktop sidebar remains unchanged.

### 3. Keep Account behavior intact

`AccountMenuItems` remains the shared menu content for desktop and mobile.

The account item in the dock will:
- visually match dock items
- open the same dropdown menu as the current bottom nav
- keep keyboard/focus accessibility

### 4. Defer Add Transaction cleanly

No add-transaction item will be introduced in this change.

The dock item model should remain flexible enough to support a future:
- separate FAB outside the dock, or
- central highlighted dock action

That means the dock API should avoid assumptions that every item is a simple `Link`.

## Visual Design

### Container

The dock should:
- float above the bottom edge instead of stretching full-width
- sit centered horizontally on mobile
- use rounded pill-like geometry
- use subtle blur and soft border treatment aligned with Pocket Mint tokens
- feel lighter than the current bar, not louder

Recommended treatment:
- `bg-white/70` to `bg-white/78`
- `backdrop-blur-xl`
- soft border using white and/or token border alpha
- shadow tuned to the existing dashboard card system, not a generic neon glow

### Items

Each dock item should:
- keep icon-first hierarchy
- optionally show small labels without making the dock too tall
- use mint emphasis for active state
- avoid noisy default hover fills

Active state should feel “seated” inside the dock via a morphing highlight bubble or plate.

### Motion

Motion should be polished and brief:
- dock enter: slight upward move + fade
- active bubble: spring movement between active items
- hover/tap: tiny scale-up and glow lift
- account trigger: same interaction cadence as route items

Reduced-motion users should receive minimal or near-static transitions.

## Interaction Design

### Route items

- Tap navigates immediately
- Active item uses `aria-current="page"`
- Active item remains visually distinct even without color perception alone

### Account item

- Tap opens dropdown
- Dropdown opens above the dock
- Focus ring remains visible and accessible

### Responsiveness

- Dock is mobile-only, hidden at `md` and above
- Width should adapt to item count without touching the screen edges
- Safe-area bottom inset must still be honored

## Technical Design

### Files

Primary files expected:
- `apps/frontend/components/ui/dock-morph.tsx`
- `apps/frontend/components/layout/bottom-nav.tsx`

Possible dependency file updates only if needed:
- `apps/frontend/components/ui/tooltip.tsx`

No dependency installation should be needed because the repo already contains:
- `framer-motion`
- `lucide-react`
- `class-variance-authority`

If the tooltip primitive used by the reference component is not already present in the app, add only the local shadcn-compatible tooltip component file rather than broad unrelated changes.

### Component API

`DockMorph` should accept a list of items shaped for this app, for example:

- `key`
- `label`
- `icon`
- `href` or click handler
- `isActive`
- optional custom render/trigger behavior

This keeps the component reusable without coupling it tightly to `next/link` or account dropdown internals.

### State

Local state inside the dock should only manage presentation concerns such as:
- hovered item index/key
- motion state if needed

Navigation state remains derived from pathname in `bottom-nav.tsx`.

## Accessibility

- All interactive items must remain keyboard reachable
- Active route keeps `aria-current`
- Focus-visible ring uses app token ring color
- Labels/tooltips must not be the only way to understand an icon
- Reduced-motion support should be respected

## Risks and Mitigations

### Risk: Dock becomes too decorative

Mitigation:
- keep contrast high
- keep motion duration short
- avoid overly transparent or over-glossy surfaces

### Risk: Account dropdown becomes awkward inside the dock

Mitigation:
- treat account as a first-class dock item visually
- keep dropdown trigger semantics unchanged

### Risk: Future add-transaction action forces refactor

Mitigation:
- design dock items to support custom nodes and non-link actions from the start

## Verification Plan

- Lint the touched files
- Verify the dock renders only on mobile
- Verify route active state for each item
- Verify account dropdown still opens and works
- Verify safe-area bottom spacing on mobile layout
- Verify reduced-motion fallback does not feel broken

## Success Criteria

The change is successful when:
- mobile bottom navigation is visually replaced by a dock morph treatment
- desktop sidebar is unchanged
- all current mobile nav destinations still work
- account dropdown still works
- the result matches Pocket Mint’s visual system rather than generic copied styling
- the code is ready for a future add-transaction action without structural rewrite
