# @tederash/react

React integration for the Tederash Adaptive Accessibility Framework: `AccessibilityProvider`, component-level overrides, and preference-aware hooks.

## Install

```bash
pnpm add @tederash/react @tederash/core
```

## Quick start

```tsx
import { AccessibilityProvider, useAccessibility } from "@tederash/react";

function App() {
  return (
    <AccessibilityProvider defaultProfile="standard">
      <MyApplication />
    </AccessibilityProvider>
  );
}

function TextSizeControl() {
  const { profile, updatePreferences } = useAccessibility();
  return (
    <button onClick={() => updatePreferences({ visual: { fontScale: 1.25 } })}>
      Larger text (current: {profile.visual?.fontScale ?? 1})
    </button>
  );
}
```

## Links

- [Documentation](https://github.com/tse-coder/tederash)
- License: MIT
