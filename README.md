<div align="center">

# Tederash Adaptive Accessibility Framework

**Runtime-adaptive accessibility for modern web applications and React.**  
*Do not build isolated interfaces or awkward third-party contrast toolbars — let your application understand individual accessibility needs and dynamically reshape its components, interactions, typography, and assistance.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Radix UI](https://img.shields.io/badge/Primitives-Radix%20UI-161618?style=flat-square&logo=radix-ui)](https://www.radix-ui.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Chrome Extension](https://img.shields.io/badge/Extension-Manifest%20V3-yellow?style=flat-square&logo=googlechrome)](https://developer.chrome.com/docs/extensions/)
[![WCAG 2.2](https://img.shields.io/badge/Target-WCAG%202.2%20AA-success?style=flat-square)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![npm @tederash/core](https://img.shields.io/npm/v/@tederash/core?style=flat-square&logo=npm&label=%40tederash%2Fcore)](https://www.npmjs.com/package/@tederash/core)
[![npm @tederash/react](https://img.shields.io/npm/v/@tederash/react?style=flat-square&logo=npm&label=%40tederash%2Freact)](https://www.npmjs.com/package/@tederash/react)
[![npm @tederash/components](https://img.shields.io/npm/v/@tederash/components?style=flat-square&logo=npm&label=%40tederash%2Fcomponents)](https://www.npmjs.com/package/@tederash/components)
[![npm @tederash/assistance](https://img.shields.io/npm/v/@tederash/assistance?style=flat-square&logo=npm&label=%40tederash%2Fassistance)](https://www.npmjs.com/package/@tederash/assistance)

[Quick Start](#quick-start) • [Packages](#packages) • [Profiles & Precedence](#accessibility-profiles--precedence) • [Adaptive Components](#adaptive-components) • [Browser Extension](#browser-extension--sidepanel-assistant) • [Documentation](docs/)

---

</div>

## Core Philosophy

Traditional web accessibility is too often treated as a compliance checklist, a hidden settings drawer, or a decorative toolbar that injects crude CSS overrides.

**Tederash shifts accessibility from static retrofits to a centralized, reactive runtime:**

1. **Person-Centered, Not Disability-Labeled**: Profiles describe concrete preferences (e.g., font scale 1.35x, ≥48px touch targets, high contrast, simplified plain language, voice readout), rather than assigning diagnostic medical labels.
2. **Zero-Code Application Adaptation**: Wrapping your application in `<AccessibilityProvider>` lets standard Tederash components reactively adapt their target dimensions, border contrasts, line-heights, focus rings, and instructional complexity without rewriting application code.
3. **Four-Tier Deterministic Precedence**: Conflicting styles and preferences resolve strictly through a predictable hierarchy:
   $$\text{Component Override} \succ \text{Active Profile} \succ \text{Application Defaults} \succ \text{Framework Defaults}$$
4. **Multimodal & Global Context**: Native Web Speech integration (Text-to-Speech + Voice Recognition), live screen-reader regions, and first-class Amharic localization with Ge'ez script typography adjustments.
5. **Private & Local-First**: No mandatory user accounts, no external tracking, and no remote telemetry. Stored preferences stay in the user's browser via encrypted or local storage.

---

## Packages

The monorepo uses `pnpm` workspaces to decouple the runtime, component primitives, React bindings, and tooling:

| Package | Version | Description |
|---|---|---|
| [`@tederash/core`](https://www.npmjs.com/package/@tederash/core) ([source](packages/core)) | [![npm](https://img.shields.io/npm/v/@tederash/core?style=flat-square&logo=npm)](https://www.npmjs.com/package/@tederash/core) | **Framework-independent accessibility runtime**. Manages profiles, runs the deterministic adaptation engine, computes CSS variables, handles storage persistence, and provides capability-aware Web Speech abstractions. |
| [`@tederash/react`](https://www.npmjs.com/package/@tederash/react) ([source](packages/react)) | [![npm](https://img.shields.io/npm/v/@tederash/react?style=flat-square&logo=npm)](https://www.npmjs.com/package/@tederash/react) | **React bindings & SDK**. Exposes `<AccessibilityProvider>`, `<AccessibilityOverride>`, context values, and hooks (`useAccessibility`, `useAccessibilityPreference`, `useAdaptations`, `useAnnounce`, `useLocale`, `useSpeechRecognition`, `useSpeechSynthesis`). |
| [`@tederash/components`](https://www.npmjs.com/package/@tederash/components) ([source](packages/components)) | [![npm](https://img.shields.io/npm/v/@tederash/components?style=flat-square&logo=npm)](https://www.npmjs.com/package/@tederash/components) | **Adaptive accessible component library** built on Radix UI primitives. Reshapes interactive dimensions, typography, error states, and assistance affordances at runtime. |
| [`@tederash/assistance`](https://www.npmjs.com/package/@tederash/assistance) ([source](packages/assistance)) | [![npm](https://img.shields.io/npm/v/@tederash/assistance?style=flat-square&logo=npm)](https://www.npmjs.com/package/@tederash/assistance) | **Intelligent form assistance engine**. Provides deterministic heuristic guidance and provider-agnostic abstractions for contextual field instructions and plain-language validation errors. |
| [`extension`](extension) | `private` | **Chrome Extension (Manifest V3)**. Brings adaptive accessibility and an intelligent sidepanel assistant to any web application, communicating via an in-page deterministic bridge protocol. |
| [`apps/docs`](apps/docs) | `private` | **Nextra-powered documentation site & live playground**. Features interactive profile switching, component previews, a multi-step job application demo, and automated axe-core audit inspectors. |

---

## Quick Start

### 1. Installation

Install the React SDK and Component Library in your project:

```bash
pnpm add @tederash/core @tederash/react @tederash/components
# or
npm install @tederash/core @tederash/react @tederash/components
```

### 2. Configure Tailwind CSS

Ensure your `tailwind.config.ts` includes the Tederash component paths and CSS variable mappings:

```ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tederash/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
      },
    },
  },
} satisfies Config;
```

### 3. Wrap Your Application

Add the `AccessibilityProvider` at the root of your React application tree:

```tsx
import React from "react";
import { AccessibilityProvider } from "@tederash/react";
import { TederashLiveRegion } from "@tederash/components";

export function App({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider
      storageKey="my-app:a11y-profile"
      applyStylesToRoot={true}
    >
      {/* Global accessible announcements for screen readers and visible toasts */}
      <TederashLiveRegion showVisualBanner={false} />
      {children}
    </AccessibilityProvider>
  );
}
```

### 4. Build Adaptive Interfaces

Use Tederash components just like regular UI primitives — they automatically consume the active profile and adapt their presentation and behavior:

```tsx
import React, { useState } from "react";
import {
  AccessibleForm,
  AccessibleInput,
  AccessibleSelect,
  AccessibleCheckbox,
  AccessibleButton,
} from "@tederash/components";

export function RegistrationForm() {
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);

  return (
    <AccessibleForm onSubmit={(e) => { e.preventDefault(); console.log("Submitted"); }}>
      <AccessibleInput
        id="user-email"
        type="email"
        label="Email Address"
        description="We will send your account activation link here."
        simplifiedDescription="Where we can email you."
        placeholder="alex@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        speechInput={true}   /* Voice dictation when speech is enabled */
        speechOutput={true}  /* Read-aloud button when TTS is enabled */
        required
      />

      <AccessibleCheckbox
        id="accept-terms"
        label="I agree to the Terms of Service"
        checked={terms}
        onCheckedChange={(val) => setTerms(Boolean(val))}
        required
      />

      <AccessibleButton type="submit" variant="primary">
        Create Account
      </AccessibleButton>
    </AccessibleForm>
  );
}
```

---

## Accessibility Profiles & Precedence

A **Profile** represents an individual user's combined accessibility requirements:

```ts
export interface TederashProfile {
  id: string;
  name: string;
  description?: string;

  visual?: {
    fontScale?: number;               // 0.8 to 2.5 (e.g., 1.35 = 135%)
    highContrast?: boolean;            // Prominent borders & contrast tokens
    colorScheme?: "light" | "dark" | "system";
    reduceVisualClutter?: boolean;     // Strips decorative imagery
    underlineLinks?: boolean;          // Explicit link affordances
  };

  motor?: {
    targetSize?: "normal" | "large" | "extra-large"; // ≥44px or ≥48px touch targets
    keyboardNavigation?: boolean;      // Enhanced focus rings & skip links
    reducePrecisionRequired?: boolean; // Relaxed pointer hitboxes
  };

  cognitive?: {
    simplifiedLanguage?: boolean;      // Replaces jargon with plain language
    showInstructions?: boolean;        // Persistent contextual helper hints
    reduceDistractions?: boolean;      // Silences ambient animations
  };

  speech?: {
    speechOutput?: boolean;            // Text-to-speech read aloud enabled
    speechInput?: boolean;             // Voice dictation inputs enabled
    language?: string;                 // e.g. "en-US" or "am-ET"
    speechRate?: number;               // 0.5 to 2.0
  };
}
```

### Built-in Presets

Tederash exports presets ready for immediate use:
- `STANDARD_PRESET` — Clean, modern default interface.
- `LOW_VISION_PRESET` — 135% font scale, high-contrast borders, explicit link underlines.
- `MOTOR_ASSIST_PRESET` — Extra-large (≥48px) touch targets, persistent keyboard focus indicators.
- `COGNITIVE_ASSIST_PRESET` — Plain-language instruction guides, distraction reduction.
- `VOICE_ASSIST_PRESET` — Enabled voice dictation, spoken read-aloud buttons, screen-reader announcements.

### Scoped Subtree Overrides

When a specific section of your application needs customized behavior (e.g., a high-density analytics drawer or an audio player), wrap it in `<AccessibilityOverride>` without affecting the global runtime:

```tsx
import { AccessibilityOverride } from "@tederash/react";

<AccessibilityOverride patch={{ visual: { fontScale: 1.0 }, motor: { targetSize: "normal" } }}>
  <CompactDataGrid />
</AccessibilityOverride>
```

---

## Adaptive Components

Every component in `@tederash/components` is built on top of Radix UI accessible primitives and forwards native refs.

| Component | Key Adaptations |
|---|---|
| `<AccessibleButton>` | Adaptive sizing (`min-h-[44px]` / `min-h-[48px]`), high-contrast active outlines, destructive confirmation gates, speech feedback. |
| `<AccessibleInput>` | Label associations (`for`/`id`), character counters, inline plain-language helpers, integrated voice dictation mic and read-aloud speaker. |
| `<AccessibleTextarea>` | Multi-line auto-expansion, accessible character counters, simplified instructions, speech dictation support. |
| `<AccessibleSelect>` | Full keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`), accessible popup menu, screen reader option announcements. |
| `<AccessibleCheckbox>` | Enlarged clickable hitbox (≥44px), high-contrast check indicator, accessible label linkage. |
| `<AccessibleDialog>` | Focus trapping, `Escape` key dismissal, ARIA modal naming, smooth transitions respecting `prefers-reduced-motion`. |
| `<AccessibleForm>` | Form-level validation announcement, error summary focusing, prevention of accidental double-submission. |
| `<AccessibleNavigation>` | ARIA landmarks, mobile drawer adaptation, keyboard disclosure navigation, skip-to-content affordances. |
| `<TederashLiveRegion>` | Centralized assertive and polite ARIA live regions with visual toast banner capabilities. |

---

## Localization & Ethiopian Context

Tederash treats localization as a core architectural pillar rather than an afterthought:

- **English & Amharic Support**: Full built-in localization catalogs for system messages, form field validation errors, character counters, and accessibility instructions.
- **Ge'ez Script Typography**: Automatic typographical line-height and font-family adjustments when Amharic (`am-ET`) is active to avoid clipped diacritics.
- **Language-Aware Speech Services**: Graceful Web Speech voice selection with fallback detection for Amharic text-to-speech.

```tsx
import { useLocale } from "@tederash/react";

function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <button onClick={() => setLocale(locale === "en" ? "am" : "en")}>
      {t("profile.language")}: {locale.toUpperCase()}
    </button>
  );
}
```

---

## Browser Extension & Sidepanel Assistant

The repository includes a companion Chrome Extension (Manifest V3) located in `extension/`:

- **Universal Web Adaptation**: Injects the Tederash adaptation engine into any website, allowing users to apply their personal visual, motor, and reading preferences anywhere on the web.
- **Deterministic Bridge Protocol**: When browsing applications built with `@tederash/components`, the extension content script identifies the runtime and establishes an in-page CustomEvent bridge — allowing external tools and assistants to inspect the semantic component tree without fragile DOM scraping.
- **Intelligent Accessibility Sidepanel**: Features a live multimodal assistant that explains complex forms, reads content aloud, and inspects validation requirements.

```bash
# Build the Chrome extension bundle
pnpm run build:ext
# Load the generated extension/out directory as an unpacked extension in chrome://extensions
```

---

## Developer Tooling & Verification

The framework includes a multi-tier test suite covering unit contracts, cross-feature matrix combinations, and end-to-end user workflows:

```bash
# Install workspace dependencies
pnpm install

# Run the complete Vitest test suite across all packages
pnpm test

# Typecheck all packages and applications (strict TypeScript)
pnpm typecheck

# Build all package artifacts
pnpm build

# Start the interactive documentation and playground locally
pnpm dev
```
