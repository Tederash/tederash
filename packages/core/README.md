# @tederash/core

Framework-independent accessibility runtime and profile engine for the Tederash Adaptive Accessibility Framework. Holds the active accessibility profile, resolves preference precedence, validates profile updates, and applies deterministic adaptation rules — with no React or DOM dependency.

## Install

```bash
pnpm add @tederash/core
```

## Quick start

```ts
import { createAccessibilityRuntime } from "@tederash/core";

const runtime = createAccessibilityRuntime({ persistence: "local" });

runtime.setProfile("low-vision");
runtime.updatePreferences({ visual: { fontScale: 1.25 } });

const unsubscribe = runtime.subscribe(() => {
  console.log("Preferences changed:", runtime.getProfile());
});
```

## Links

- [Documentation](https://github.com/tse-coder/tederash)
- License: MIT
