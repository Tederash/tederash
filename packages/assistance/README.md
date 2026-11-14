# @tederash/assistance

Contextual form assistance engine for the Tederash Adaptive Accessibility Framework. Explains form fields and validation errors in plain language, simplifies instructions, and guides users through multi-step forms — deterministically and offline by default, with pluggable AI providers as an optional enhancement.

## Install

```bash
pnpm add @tederash/assistance @tederash/core
```

## Design principles

- **AI is optional, never required.** A deterministic `HeuristicAssistanceProvider` works with zero network and zero API keys.
- **Deterministic fallbacks.** Generated assistance never replaces actual validation.
- **Privacy.** Form contents are not sent to external AI services unless you explicitly configure and opt into a provider.

## Links

- [Documentation](https://github.com/tse-coder/tederash)
- License: MIT
