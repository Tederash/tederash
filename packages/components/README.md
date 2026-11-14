# @tederash/components

Accessible, adaptive React components for the Tederash Adaptive Accessibility Framework. Every component consumes the active accessibility profile and adapts target size, contrast, spacing, and feedback automatically — without application code changes.

## Install

```bash
pnpm add @tederash/components @tederash/react @tederash/core
```

## Styling requirement

Components are styled with **Tailwind CSS** utility classes. Your application must have Tailwind configured — without it, components render with structural accessibility behavior but no intended visual styling.

## Quick start

```tsx
import { AccessibleButton, AccessibleInput, AccessibleForm } from "@tederash/components";

<AccessibleForm>
  <AccessibleInput
    label="Email address"
    type="email"
    description="Enter the email address associated with your account."
    required
  />
  <AccessibleButton variant="primary" onClick={handleSubmit}>
    Submit application
  </AccessibleButton>
</AccessibleForm>
```

Under an active accessibility profile, the button adapts its target size, contrast, and focus treatment, and the input adapts its presentation and validation feedback.

## Links

- [Documentation](https://github.com/tse-coder/tederash)
- License: MIT
