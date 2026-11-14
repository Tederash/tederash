# ADR-003: Extension UI Styling, Design Tokens, and Shadow DOM Isolation

## Status
Accepted

## Context
Extension UI pages must meet WCAG 2.2 AA (`rem`-based typography, high-contrast & dark themes, ≥ 44×44 px targets, 3 px visible focus rings, `prefers-reduced-motion`). Meanwhile, the on-page assistant runs inside a closed/isolated Shadow DOM root where host page styles must not leak in and extension styles must not leak out.

## Decision
1. Use Tailwind CSS v3 + CSS custom properties in `src/styles/tokens.css` (light, dark, and high-contrast themes) for Next.js extension pages.
2. Use `@radix-ui/*` primitives (`Dialog`, `Switch`, `Tabs`, `Slider`, `RadioGroup`, `Popover`) wrapped in `src/components/ui/` to guarantee focus trapping, keyboard navigation, and ARIA semantics.
3. For the content-script Shadow DOM UI, compile an isolated stylesheet string at build time (or inline scoped CSS tokens) and attach it inside the Shadow Root alongside `all: initial`.

## Consequences
- Consistent accessible design language across popup, options dashboard, onboarding, side panel, and on-page UI.
- Zero CSS pollution of host web pages.
