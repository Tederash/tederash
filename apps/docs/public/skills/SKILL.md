---
name: tederash
description: Comprehensive guide and development skill for building accessible, runtime-adaptive web applications using the Tederash Adaptive Accessibility Framework (@tederash/core, @tederash/react, @tederash/components, @tederash/assistance). Use whenever building, styling, auditing, or refactoring UI components, forms, providers, dialogs, buttons, navigation, speech, or live announcements with Tederash, or when integrating an application with the Tederash browser assistant extension bridge.
---

# Tederash Adaptive Accessibility Framework Skill

Tederash is an open-source, runtime-adaptive accessibility framework and component SDK for React and TypeScript. 

Accessibility in Tederash is **not a floating overlay, third-party toolbar, or collection of isolated CSS hacks**. Applications wrapped in Tederash understand a user's individual accessibility needs and adapt interactive sizing, typography, contrast, assistive announcements, and cognitive guidance dynamically at runtime without modifying application business logic.

---

## 1. Package Architecture

| Package | Purpose & Key Exports |
|---|---|
| **`@tederash/core`** | Framework-independent runtime, profile resolution, adaptation rules, deterministic events, and live announcement bus.<br/>Exports: `createAccessibilityRuntime`, `PRESET_PROFILES`, `resolveAdaptations`, `createLiveAnnouncer`, `AccessibilityProfile`. |
| **`@tederash/react`** | React integration layer: root provider, state subscribers, and hooks for profiles, speech, and live announcements.<br/>Exports: `TederashProvider` (alias `AccessibilityProvider`), `useTederash`, `useAccessibility`, `useLiveAnnouncer`, `useSpeechRecognition`, `useSpeechSynthesis`. |
| **`@tederash/components`** | Accessible, adaptive React primitives that consume runtime preferences and automatically scale touch targets, contrast, and focus rings.<br/>Exports: `TederashButton`, `TederashInput`, `TederashTextarea`, `TederashCheckbox`, `TederashSelect`, `TederashDialog`, `TederashForm`, `TederashNavigation`, `TederashLiveRegion`. |
| **`@tederash/assistance`** | Contextual form assistance engine that explains form fields, clarifies validation errors in plain language, and guides multi-step forms.<br/>Exports: `FormAssistant`, `useFormAssistance`, field explanation helpers. |

---

## 2. Core Product Principles

1. **Runtime Adaptation Over Static Overlays**: Components dynamically adjust their target size (44px -> 48px -> 56px), font scale, contrast, and cognitive hints based on the active profile.
2. **Preference Combination, Not Medical Labels**: Profiles describe functional preferences (e.g. `visual.fontScale`, `motor.targetSize`, `cognitive.simplifiedLanguage`), never disability diagnoses.
3. **Semantic Primitives First**: Always use semantic HTML and established accessibility standards (WAI-ARIA 1.2). Never create unlabelled custom `div` buttons or custom unkeyboardable controls.
4. **Deterministic & Offline-First**: Core accessibility, keyboard navigation, high contrast, and form explanations work offline without requiring external AI services, user accounts, or cloud dependencies.
5. **Deterministic Extension Bridge**: When `TederashProvider` mounts, it stamps `data-tederash-root="true"` and establishes an in-page `CustomEvent` bridge so the companion Tederash browser extension side panel can interact with the page deterministically without fragile DOM scraping.

---

## 3. Quick-Start Integration

### 3.1 Root Setup (`App.tsx` or `layout.tsx`)

Wrap your application in `TederashProvider` and mount `TederashLiveRegion` to handle screen reader and visual announcements:

```tsx
import * as React from "react";
import { TederashProvider } from "@tederash/react";
import { TederashLiveRegion } from "@tederash/components";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <TederashProvider
      storageKey="my-app:a11y-profile"
      defaultProfile="standard"
    >
      {/* Renders polite and assertive announcements for assistive tech */}
      <TederashLiveRegion showVisualBanner={false} />
      {children}
    </TederashProvider>
  );
}
```

> **Note on Styling:** Tederash automatically reflects runtime variables (e.g., `--a11y-font-scale`, `--a11y-target-size`, `--a11y-contrast`) onto `document.documentElement`. Ensure your global CSS handles font scaling:
> ```css
> html {
>   font-size: calc(100% * var(--a11y-font-scale, 1));
> }
> ```

---

## 4. Component Usage & Patterns

### 4.1 Buttons (`TederashButton`)
Adapts interactive target height (44px normal, 48px large, 56px extra-large), focus indicators, and contrast automatically.

```tsx
import { TederashButton } from "@tederash/components";

<TederashButton
  variant="primary" // "primary" | "secondary" | "destructive" | "ghost" | "outline"
  onClick={handleSave}
>
  Save Application
</TederashButton>
```

### 4.2 Form Inputs (`TederashInput` & `TederashTextarea`)
Includes accessible labels, contextual helper text, cognitive simplified descriptions, and accessible error association (`aria-describedby`, `aria-invalid`).

```tsx
import { TederashInput } from "@tederash/components";

<TederashInput
  id="work-email"
  label="Work Email"
  type="email"
  required
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  description="We use this to send your interview confirmation."
  simplifiedDescription="Type the email address where we can contact you."
  error={emailError}
/>
```

> **Cognitive Adaptation**: When a user activates a profile with `cognitive.simplifiedLanguage: true`, `simplifiedDescription` automatically replaces `description` on screen.

### 4.3 Dropdown Selects (`TederashSelect`)
Accessible combobox implementation matching WAI-ARIA 1.2 specifications with keyboard navigation, typeahead, and adaptive sizing:

```tsx
import { TederashSelect } from "@tederash/components";

<TederashSelect
  id="country"
  label="Country of Residence"
  value={country}
  onChange={setCountry}
  options={[
    { value: "et", label: "Ethiopia" },
    { value: "us", label: "United States" },
    { value: "ca", label: "Canada" },
  ]}
  description="Select the country where you currently pay taxes."
/>
```

### 4.4 Modal Dialogs (`TederashDialog`)
Implements accessible focus trapping, escape key dismissal, `aria-modal="true"`, and automatic return of focus to the triggering element upon close:

```tsx
import { TederashDialog, TederashButton } from "@tederash/components";

<TederashDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Submission"
  description="Please review your details before submitting."
>
  <div className="space-y-4">
    <p>Are you sure you want to finalize your submission?</p>
    <div className="flex justify-end gap-3">
      <TederashButton variant="ghost" onClick={() => setIsOpen(false)}>
        Cancel
      </TederashButton>
      <TederashButton variant="primary" onClick={confirmSubmit}>
        Confirm
      </TederashButton>
    </div>
  </div>
</TederashDialog>
```

---

## 5. Hooks and Runtime API

### 5.1 Profile Switching & State (`useTederash`)
Access the active profile, resolved adaptations, and profile update functions:

```tsx
import { useTederash, PRESET_PROFILES } from "@tederash/react";

export function ProfileSelector() {
  const { profile, setProfile, updatePreferences, announce } = useTederash();

  return (
    <select
      value={profile.id}
      onChange={(e) => {
        const selected = PRESET_PROFILES.find((p) => p.id === e.target.value);
        if (selected) {
          setProfile(selected);
          announce({
            message: `Switched accessibility profile to ${selected.name}`,
            priority: "polite",
          });
        }
      }}
    >
      {PRESET_PROFILES.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
```

### 5.2 Preset Profiles

Tederash provides built-in functional presets via `PRESET_PROFILES`:
- `standard`: Default baseline preferences.
- `low-vision`: Large text (`fontScale: 1.25`), high contrast, prominent focus rings.
- `high-contrast`: Maximum contrast styling, forced borders, link underlines.
- `motor-impaired`: Extra-large touch targets (`targetSize: "extra-large"` -> 56px), reduced precision required.
- `cognitive`: Simplified language enabled, guided interactions, reduced visual clutter.
- `screen-reader`: Verbose instructions, high-priority announcements.
- `simplified`: Distraction-free presentation and simplified form instructions.

### 5.3 Live Announcements (`announce`)
Communicate dynamic updates to screen readers and live regions:

```tsx
const { announce } = useTederash();

announce({
  message: "Your application was submitted successfully.",
  priority: "polite", // "polite" | "assertive"
  category: "success", // "info" | "success" | "warning" | "error"
});
```

---

## 6. Extension Bridge Protocol

Tederash applications automatically communicate with the **Tederash Browser Assistant Extension** through an in-page custom event bridge:

```
┌─────────────────────────────────┐               ┌────────────────────────────────┐
│   Tederash Browser Extension    │               │  Tederash Application (React)  │
│  (Side Panel / Assistant Agent) │               │       @tederash/react          │
└────────────────┬────────────────┘               └────────────────┬───────────────┘
                 │                                                 │
                 │ 1. Inspects DOM (data-tederash-root="true")     │
                 │────────────────────────────────────────────────>│
                 │                                                 │
                 │ 2. Dispatches CustomEvent ("tederash:request")  │
                 │    { type: "tederash:get_profile" }             │
                 │────────────────────────────────────────────────>│
                 │                                                 │
                 │ 3. Provider responds ("tederash:response")      │
                 │    { profile, adaptations, schemaVersion }      │
                 │<────────────────────────────────────────────────│
                 │                                                 │
                 │ 4. Assistant fills field / changes profile      │
                 │    { type: "tederash:fill_field", id, value }   │
                 │────────────────────────────────────────────────>│
```

### Element Identification
To make inputs and buttons immediately addressable by the extension assistant, always provide an `id` or `data-tederash-id`:
```tsx
<TederashInput
  id="applicant-phone"
  label="Phone Number"
  data-tederash-id="applicant-phone"
  ...
/>
```

---

## 7. Critical Development Rules

1. **Never use raw unstyled `div`s for buttons or controls**: Always use `<TederashButton>` or native `<button>`.
2. **Never hardcode fixed pixel touch targets**: Interactive controls must have minimum sizes matching the active adaptation profile (`min-h-[44px]` for standard, `min-h-[48px]` for large, `min-h-[56px]` for extra-large).
3. **Never convey information through color alone**: Always pair color with text, an icon, and screen reader announcements (`aria-live` or `announce`).
4. **Never submit forms automatically from AI assistance**: The user must explicitly review and authorize form submissions.
5. **Always provide label and description props**: Never rely on `placeholder` as a label. Placeholders disappear when text is typed and fail accessibility contrast requirements.
6. **Support multilingual text**: Use localized strings for labels and instructions (e.g. English, Amharic, Oromo) without assuming a single language.
