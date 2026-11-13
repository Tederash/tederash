# Tederash Adaptive Accessibility Framework

An adaptive accessibility framework for React and TypeScript. Instead of a toolbar or a collection of isolated settings, applications wrapped in `AccessibilityProvider` understand a user's accessibility preferences and adapt components, interaction patterns, feedback, and assistance at runtime — without rewriting application code.

## Packages

| Package | Purpose |
|---|---|
| `@tederash/core` | Framework-independent accessibility runtime, profiles, adaptation engine, events, persistence, speech services, localization |
| `@tederash/react` | `AccessibilityProvider`, context, and hooks (`useAccessibility`, `useLocale`, `useSpeechSynthesis`, …) |
| `@tederash/components` | Adaptive accessible components built on Radix UI primitives |
| `@tederash/assistance` | Contextual form assistance (heuristic provider + pluggable `AssistanceProvider` abstraction) |
| `apps/playground` | Next.js demo: registration flow, live profile switching, runtime inspector, axe-core audit drawer |

## Quick Start

```bash
pnpm install
pnpm test        # 282 tests across the workspace
pnpm build       # build all packages
pnpm dev         # run the playground at http://localhost:3000
```

Wrap your application:

```tsx
import { AccessibilityProvider } from "@tederash/react";
import { LOW_VISION_PRESET } from "@tederash/core";

function App() {
  return (
    <AccessibilityProvider defaultProfile={LOW_VISION_PRESET}>
      <Application />
    </AccessibilityProvider>
  );
}
```

Supported components adapt automatically to the active profile.

## Documentation

| Document | Contents |
|---|---|
| [docs/quick-start.md](docs/quick-start.md) | Installation, provider setup, first adaptation |
| [docs/profiles.md](docs/profiles.md) | Profile schema, presets, validation, precedence rules |
| [docs/runtime.md](docs/runtime.md) | Core runtime API (framework-independent) |
| [docs/hooks.md](docs/hooks.md) | React hooks API reference |
| [docs/components.md](docs/components.md) | Adaptive component API reference |
| [docs/decisions/](docs/decisions/) | Architecture Decision Records (ADRs) |

## Commands

| Command | Description |
|---|---------|
| `pnpm test` | Run the full workspace test suite (Vitest) |
| `pnpm build` | Build all packages (TypeScript) |
| `pnpm typecheck` | Typecheck all workspace projects |
| `pnpm dev` | Start the playground dev server |

## Architecture

Six layers, each independently replaceable (see [AGENTS.md](AGENTS.md) for the full specification):

1. **Developer API** — `@tederash/react` provider + hooks
2. **Adaptive Component Library** — `@tederash/components`
3. **Accessibility Runtime** — `@tederash/core` (profile state, persistence, announcements)
4. **Interaction Engine** — keyboard/AT foundation + Web Speech services
5. **Assistance Engine** — `@tederash/assistance` (optional, provider-agnostic)
6. **Developer Experience** — playground, runtime inspector, axe-core audits

Key design decisions and their rationale live in the [ADRs](docs/decisions/).

## Engineering standards

- Strict TypeScript, no `any`
- WCAG 2.2 AA as a design and testing target (automated axe-core checks are a floor, not proof of conformance)
- Semantic HTML first; Radix primitives instead of custom accessible behavior
- User preferences stay local (localStorage); no accounts, no telemetry
- AI/assistance is optional and provider-agnostic — never a core dependency
