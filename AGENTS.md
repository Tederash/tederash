# AGENTS.md — Adaptive Accessibility Framework

## 1. Project Overview

Build an adaptive accessibility framework that allows web applications to dynamically adapt their interfaces and interactions to individual accessibility needs.

The project should provide developers with a reusable React and TypeScript SDK containing:

- An accessibility profile system.
- A centralized accessibility runtime.
- An adaptation engine.
- Accessible, adaptive React components.
- Multimodal interaction support.
- Intelligent form assistance.
- Developer tools for testing and previewing accessibility profiles.

The long-term vision is to build an accessibility ecosystem consisting of:

1. A React component library and SDK.
2. A browser extension that brings adaptive accessibility capabilities to existing websites.
3. An optional assistance layer using speech and AI.

**The immediate priority is the SDK and its underlying runtime. Do not begin implementing the browser extension until the core framework is stable.**

### Core product philosophy

Accessibility should not be a collection of isolated settings or a toolbar that changes a website's appearance.

Instead, the application should understand a user's accessibility preferences and adapt its components, interaction patterns, feedback, and assistance accordingly.

For example, a user who prefers larger text, stronger contrast, keyboard navigation, and simplified instructions should be able to activate a profile that applies those preferences consistently throughout an application.

Developers should not need to implement separate interfaces for every accessibility requirement.

---

## 2. Product Goals

### Primary goals

1. Make it easy for developers to build adaptive and accessible interfaces.
2. Allow users to combine and customize accessibility preferences.
3. Provide consistent accessibility behavior across application components.
4. Support multiple interaction methods, including keyboard, pointer, and voice where supported.
5. Make forms easier to understand and complete.
6. Provide developers with tools to inspect and test their applications under different accessibility profiles.
7. Support localization, particularly Amharic, without making the framework dependent on a particular language.

### Non-goals

Do not:

- Build a generic accessibility toolbar as the primary product.
- Replace operating-system screen readers or browser accessibility features.
- Reinvent existing accessible component primitives unnecessarily.
- Make AI a requirement for basic accessibility functionality.
- Require users to register or create accounts to use accessibility features.
- Build a complete browser extension during the initial implementation.
- Claim WCAG compliance merely because an automated audit passes.
- Automatically infer or label someone's disability.
- Introduce unnecessary microservices or distributed infrastructure.

---

## 3. Architecture

Use a modular architecture with clearly separated responsibilities.

### Layer 1: Developer API

The interface developers use to integrate the framework.

Responsibilities:

- React components.
- React hooks.
- Accessibility provider.
- Profile configuration.
- Component-level overrides.
- Runtime APIs.

### Layer 2: Adaptive Component Library

Reusable components that consume accessibility preferences and adapt their behavior.

Initial components:

- Button
- Input
- Textarea
- Checkbox
- Select
- Dialog
- Form
- Navigation

Build components on top of established accessible primitives where appropriate.

### Layer 3: Accessibility Runtime

The central system responsible for:

- Maintaining the active accessibility profile.
- Managing user preferences.
- Resolving profile inheritance and overrides.
- Applying adaptation rules.
- Notifying components when preferences change.
- Managing accessibility-related events.
- Persisting preferences locally.

This layer must be independent of React wherever practical.

### Layer 4: Interaction Engine

Provides alternative ways to interact with components.

Examples:

- Keyboard interaction.
- Pointer interaction.
- Voice commands.
- Voice input.
- Screen-reader-compatible announcements.

Do not implement every interaction mode at once. Build a stable keyboard and assistive-technology foundation first, then add voice.

### Layer 5: Assistance Engine

Provides contextual assistance.

Examples:

- Explaining form fields.
- Explaining validation errors.
- Simplifying instructions.
- Reading interface instructions aloud.
- Guiding users through multi-step forms.

AI should be an optional enhancement, not a dependency of the core runtime.

### Layer 6: Developer Experience

Tools that help developers understand how their applications behave under different accessibility conditions.

Examples:

- Accessibility playground.
- Live profile switching.
- Accessibility audits.
- Component documentation.
- Usage examples.
- CLI tooling (later phase).

---

## 4. Recommended Technology Stack

Use the following stack unless the existing repository has a strong reason to use something different.

| Area | Technology |
|---|---|
| Language | TypeScript |
| UI framework | React |
| Styling | Tailwind CSS |
| Accessible primitives | React Aria or Radix UI |
| Accessibility auditing | axe-core |
| Documentation/playground | Next.js |
| Package management | pnpm |
| Monorepo | pnpm workspaces |
| Testing | Vitest + React Testing Library |
| Browser testing | Playwright |
| Speech | Web Speech APIs, with feature detection |
| Persistence | localStorage initially |
| AI integration | Provider-agnostic adapter, later phase |

Prefer semantic HTML, native browser behavior, and established accessibility standards.

Do not create custom implementations of buttons, inputs, dialogs, or keyboard interaction when a suitable accessible primitive already exists.

---

## 5. Repository Structure

Use a monorepo so the runtime, components, documentation, and future integrations can evolve independently.

Suggested structure:

```text
adaptive-accessibility/
│
├── apps/
│   └── playground/
│       ├── app/
│       ├── components/
│       └── examples/
│
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── profiles/
│   │   │   ├── runtime/
│   │   │   ├── adaptation/
│   │   │   ├── events/
│   │   │   ├── persistence/
│   │   │   └── types/
│   │   └── tests/
│   │
│   ├── react/
│   │   ├── src/
│   │   │   ├── provider/
│   │   │   ├── hooks/
│   │   │   └── context/
│   │   └── tests/
│   │
│   ├── components/
│   │   ├── src/
│   │   │   ├── button/
│   │   │   ├── input/
│   │   │   ├── form/
│   │   │   ├── checkbox/
│   │   │   ├── select/
│   │   │   ├── dialog/
│   │   │   └── navigation/
│   │   └── tests/
│   │
│   ├── assistance/
│   │   └── src/
│   │
│   └── devtools/
│       └── src/
│
├── docs/
├── examples/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── AGENTS.md
```

This is a target structure, not a requirement to create every directory immediately. Only create modules when they have a concrete implementation purpose.

---

# 6. Implementation Roadmap

Implement the project incrementally. Each phase must produce working, testable functionality before proceeding to the next.

## Phase 0 — Repository Inspection and Technical Planning

Before writing implementation code:

1. Inspect the existing repository.
2. Identify the framework, package manager, dependencies, conventions, and existing code.
3. Identify reusable components and infrastructure.
4. Check whether the repository already contains functionality that should be preserved.
5. Propose a final directory structure.
6. Identify architectural decisions and potential technical risks.
7. Produce a concise implementation plan.

Do not replace the existing project structure without understanding it.

Avoid unnecessary dependencies and abstractions.

Deliverable: a repository-specific implementation plan.

## Phase 1 — Accessibility Core

**Priority: Critical**

Build the framework's foundation before implementing visual components.

### 1.1 Accessibility profile schema

Create a strongly typed accessibility preference model.

A profile should describe individual preferences, not assign a person a disability label.

Possible schema:

```ts
export interface AccessibilityProfile {
  id: string;
  name: string;

  visual?: {
    fontScale?: number;
    highContrast?: boolean;
    colorScheme?: "light" | "dark" | "system";
    reduceVisualClutter?: boolean;
    underlineLinks?: boolean;
  };

  motor?: {
    targetSize?: "normal" | "large" | "extra-large";
    keyboardNavigation?: boolean;
    reducePrecisionRequired?: boolean;
  };

  cognitive?: {
    simplifiedLanguage?: boolean;
    guidedInteraction?: boolean;
    reduceDistractions?: boolean;
    showInstructions?: boolean;
  };

  auditory?: {
    captionsEnabled?: boolean;
    visualNotifications?: boolean;
  };

  speech?: {
    speechOutput?: boolean;
    speechInput?: boolean;
    language?: string;
    speechRate?: number;
  };

  interaction?: {
    preferredInput?: "pointer" | "keyboard" | "voice";
    confirmationBeforeDestructiveActions?: boolean;
  };
}
```

Treat this as an initial proposal. Refine it based on actual component requirements.

Important requirements:

- All fields should be optional.
- Provide sensible defaults.
- Support combining preferences.
- Validate profile configurations.
- Support custom profiles.
- Support per-component overrides.
- Avoid coupling profiles to specific components.
- Keep the schema extensible.

### 1.2 Profile management

Implement:

- Creating profiles.
- Updating profiles.
- Activating profiles.
- Resetting profiles.
- Combining preferences.
- Applying component-level overrides.
- Switching profiles at runtime.

Profile switching must not require a page reload.

When multiple settings conflict, define a predictable precedence order:

1. Component-level override.
2. Active profile.
3. Application-level defaults.
4. Framework defaults.

### 1.3 Accessibility runtime

Implement a framework-independent runtime.

Suggested conceptual API:

```ts
const runtime = createAccessibilityRuntime({
  defaultProfile,
  persistence: "local",
});

runtime.setProfile(profile);

runtime.updatePreferences({
  visual: {
    fontScale: 1.25,
  },
});

runtime.getProfile();

runtime.subscribe(listener);
```

The runtime should:

- Hold the active accessibility state.
- Expose a subscription mechanism.
- Notify subscribers when state changes.
- Validate incoming profile updates.
- Support profile switching.
- Avoid unnecessary updates.
- Support deterministic testing.

Do not tie the core runtime directly to React Context or DOM manipulation.

### 1.4 Adaptation engine

Implement a centralized system that translates preferences into component adaptations.

For example:

```ts
const adaptations = resolveAdaptations(profile);
```

Possible adaptations:

- Increase text size.
- Increase interactive target dimensions.
- Apply high-contrast styling.
- Reduce unnecessary animations.
- Display additional instructions.
- Increase spacing.
- Provide stronger focus indicators.

Keep adaptation rules explicit and testable.

Avoid scattering conditional accessibility logic across individual components.

### Phase 1 acceptance criteria

- Profiles can be created and validated.
- Preferences can be combined.
- Profiles can be switched dynamically.
- The runtime notifies subscribers.
- Adaptation rules produce deterministic results.
- Core functionality works without AI, cloud services, or authentication.
- Unit tests cover profile resolution and state changes.

---

## Phase 2 — React Integration

**Priority: Critical**

Create the React interface for the accessibility runtime.

### 2.1 AccessibilityProvider

Provide a root-level provider:

```tsx
function App() {
  return (
    <AccessibilityProvider
      defaultProfile={defaultAccessibilityProfile}
    >
      <Application />
    </AccessibilityProvider>
  );
}
```

Responsibilities:

- Initialize the runtime.
- Expose the active profile.
- Subscribe React components to runtime changes.
- Provide profile management methods.
- Support nested component overrides.
- Clean up subscriptions correctly.

Avoid unnecessary re-renders. Components should only subscribe to the state they need where practical.

### 2.2 React hooks

Implement:

```ts
const {
  profile,
  setProfile,
  updatePreferences,
  resetProfile,
} = useAccessibility();
```

Also consider:

```ts
const fontScale = useAccessibilityPreference(
  "visual.fontScale"
);
```

Hooks should have clear TypeScript types and predictable behavior outside the provider.

### 2.3 Persistence

Implement local preference persistence.

Requirements:

- Persist user-selected preferences.
- Restore preferences on page reload.
- Handle unavailable or restricted storage.
- Validate stored data.
- Support resetting stored preferences.
- Avoid storing sensitive personal information unnecessarily.

Cloud synchronization is not part of the initial implementation.

### Phase 2 acceptance criteria

A React application can initialize the framework, activate a profile, update preferences, and have all subscribed components respond immediately.

---

## Phase 3 — Adaptive Component Library

**Priority: Critical**

Build a small set of high-quality components before expanding the library.

Start with:

1. Button
2. Input
3. Form
4. Checkbox
5. Select

Then add:

6. Dialog
7. Navigation
8. Textarea

### Component requirements

Every component must:

- Use semantic HTML.
- Support keyboard interaction.
- Work with screen readers.
- Have appropriate accessible names.
- Provide visible focus states.
- Support disabled and error states.
- Respect relevant accessibility preferences.
- Support standard React props.
- Forward refs where appropriate.
- Provide complete TypeScript definitions.
- Have unit and interaction tests.

### Adaptive Button example

```tsx
<AccessibleButton
  variant="primary"
  onClick={handleSubmit}
>
  Submit application
</AccessibleButton>
```

Under an active profile, the button may adapt its target size, contrast, focus treatment, and feedback.

### Adaptive Input example

```tsx
<AccessibleInput
  label="Email address"
  type="email"
  description="Enter the email address associated with your account."
  required
/>
```

The component should support:

- Proper label association.
- Descriptive instructions.
- Accessible validation messages.
- Screen-reader announcements.
- Profile-aware presentation.
- Optional voice input integration in a later phase.

### Design principles

Do not make components visually complicated.

Developers should be able to use the components without understanding the internal runtime.

Support customization through component props and styling APIs without allowing customization to silently break accessibility behavior.

### Phase 3 acceptance criteria

Build a functioning registration form using the component library.

Changing the accessibility profile should update the interface without modifying the application code.

---

## Phase 4 — Accessibility Event and Feedback System

**Priority: High**

Build a centralized mechanism for communicating important interface events.

Examples:

- Form submitted successfully.
- Invalid input detected.
- Dialog opened.
- Operation completed.
- Destructive action requires confirmation.

Proposed API:

```ts
announce({
  message: "Your application was submitted successfully.",
  priority: "polite",
});
```

The system should support:

- Screen-reader-compatible live announcements.
- Visual notifications.
- Consistent error feedback.
- Priority levels.
- Deduplication where appropriate.
- Configurable announcement behavior.

Important requirements:

- Do not communicate important information through color alone.
- Do not create excessive announcements.
- Use appropriate live-region semantics.
- Preserve compatibility with existing assistive technologies.
- Provide useful feedback without interrupting users unnecessarily.

---

## Phase 5 — Intelligent Form Assistance

**Priority: High**

Forms are an excellent first use case because they expose many accessibility problems.

Build an optional assistance layer that helps users understand and complete forms.

### Capabilities

1. Explain what a field is asking for.
2. Read field instructions aloud.
3. Explain validation errors in plain language.
4. Guide users through a multi-step form.
5. Support voice input where browser capabilities allow.
6. Provide understandable completion feedback.
7. Allow users to request help at any point.

Example:

Instead of displaying:

"Invalid input."

The system should provide:

"Your phone number appears incomplete. Please include the full number, including the area code."

### Important constraints

- Users must remain in control of form submissions.
- Never submit forms automatically without explicit authorization.
- Never overwrite user input without confirmation.
- AI-generated explanations must not replace actual validation.
- Provide deterministic fallback behavior.
- Clearly distinguish generated assistance from authoritative application instructions.
- Do not send form contents to an external AI service by default.

### AI architecture

Keep AI behind an abstraction:

```ts
interface AssistanceProvider {
  explainField(context: FieldContext): Promise<string>;

  explainError(context: ErrorContext): Promise<string>;

  simplifyInstructions(
    text: string
  ): Promise<string>;
}
```

The framework should support different providers without coupling the core package to a specific LLM.

---

## Phase 6 — Voice and Multimodal Interaction

**Priority: Medium**

Add voice capabilities after the underlying component and event systems are stable.

Potential capabilities:

- Read field labels and instructions.
- Dictate text into supported inputs.
- Navigate guided forms.
- Request contextual explanations.
- Provide spoken feedback.

Use browser speech APIs where available.

Requirements:

- Detect browser capability before using speech features.
- Provide graceful fallbacks.
- Allow users to enable or disable speech.
- Support language configuration.
- Do not assume speech recognition supports every language.
- Do not make voice the only way to complete any task.
- Require confirmation for consequential actions.

Voice interaction should complement keyboard, pointer, and assistive technology—not replace them.

---

## Phase 7 — Developer Playground and Tooling

**Priority: High**

Build a demonstration application that makes the framework's value obvious.

The playground should include:

### Live profile switching

Allow developers to switch between different combinations of preferences.

Examples:

- Standard.
- Low-vision preferences.
- Reduced-motion preferences.
- Keyboard-focused interaction.
- Cognitive assistance.
- Custom combined profile.

These are demonstration presets, not rigid disability categories.

### Component preview

Display the same components under different profiles.

### Form demonstration

Create a realistic multi-step registration form that demonstrates:

- Adaptive text and spacing.
- Keyboard navigation.
- Validation feedback.
- Guided instructions.
- Voice assistance when available.
- Dynamic profile switching.

### Developer inspection

Show:

- Current active profile.
- Resolved preferences.
- Applied adaptation rules.
- Accessibility announcements.
- Component state.

### Automated accessibility auditing

Integrate axe-core to identify common accessibility issues.

Present:

- Detected issues.
- Severity.
- Affected elements.
- Suggested remediation.

Do not claim automated auditing proves complete WCAG conformance.

---

## Phase 8 — Localization and Ethiopian Context

**Priority: Medium**

Make localization part of the architecture rather than adding it as an afterthought.

Prioritize:

- English.
- Amharic.

Consider:

- Localized labels and instructions.
- Correct text direction handling where needed.
- Ge'ez-script typography and rendering.
- Language-aware text-to-speech where supported.
- Localized accessibility announcements.
- Lightweight client-side functionality.
- Offline support for core accessibility features.

Do not promise reliable Amharic speech recognition or synthesis without testing actual browser and device support.

The framework should remain useful on low-bandwidth connections. Basic accessibility functionality must not depend on remote services.

---

## Phase 9 — Documentation and Package Release

**Priority: Medium**

Prepare the framework for external developers.

Provide:

- Installation instructions.
- Quick-start guide.
- API reference.
- Profile configuration guide.
- Component documentation.
- Custom component integration guide.
- Accessibility best practices.
- Working examples.
- Troubleshooting documentation.

Prepare packages for independent consumption.

Potential package boundaries:

```text
@framework/core
@framework/react
@framework/components
@framework/assistance
```

Use a consistent package naming scheme once the project name is finalized.

Do not publish incomplete packages simply to have a package registry presence.

---

## Phase 10 — Browser Extension & Tederash Ecosystem Integration

**Status: In Active Development.**

The Tederash Browser Extension acts as an intelligent, accessibility-focused assistant sidepanel that connects directly with web applications built using the Tederash Component Library.

### 10.1 Architectural Strategy: First-Class Tederash Bridge vs. Blind Scraping

Rather than relying on brittle, generic HTML scraping (which causes communication errors on restricted browser pages and requires heuristic DOM guessing), the extension and component library adhere to a **deterministic bridge protocol**:

1. **Pre-flight Handshake**:
   - The assistant only runs active perception on pages with an accessible, confirmed content script.
   - Internal browser pages (`chrome://*`, `chrome-extension://*`, blank tabs) are detected immediately, prompting the user with a clean guidance message instead of launching failing LLM loops.
2. **Deep Runtime Integration**:
   - On Tederash-powered applications, the extension interacts directly with the **Tederash Accessibility Runtime** (`@tederash/core`), **React Provider** (`@tederash/react`), and **Assistance Engine** (`@tederash/assistance`), avoiding blind CSS mutations and element guessing.

---

### 10.2 Component Library Compatibility Specification

To make any web application built with `@tederash/components` instantly recognizable and controllable by the extension assistant, the component library exposes the following lightweight contracts:

#### 1. Root Handshake Stamp in `AccessibilityProvider`
When `AccessibilityProvider` mounts, it stamps runtime attributes on `document.documentElement`:
```html
<html
  data-tederash-root="true"
  data-tederash-version="0.1.0"
  data-a11y-profile="standard"
  data-a11y-locale="en"
>
```
- **Detection**: The extension content script inspects `data-tederash-root` in under 0.1ms.
- **Fail-safe**: If absent, the assistant displays a clear notification: *"Tederash runtime not detected on this page. Open a page built with Tederash components to enable full assistance."*

#### 2. In-Page Event Bridge (`CustomEvent` Protocol)
In `packages/react/src/provider/AccessibilityProvider.tsx`, the provider establishes a window event listener:
- **Requests from Content Script**: Dispatched on `window` as `'tederash:request'` containing `{ type, payload, reqId }`.
- **Responses from React Runtime**: Emitted as `'tederash:response'` containing `{ reqId, data, ok }`.
- **Supported operations**:
  - `tederash:query_state`: Returns `{ profile, adaptations, locale }`.
  - `tederash:set_profile`: Calls `runtime.setProfile(profileId)`.
  - `tederash:update_prefs`: Calls `runtime.updatePreferences(partial)`.
  - `tederash:announce`: Dispatches announcement through `runtime.announce(...)`.

#### 3. Semantic Component Data Attributes
Every component in `@tederash/components` passes semantic data attributes to its outermost interactive DOM element:
- **Button**: `data-tederash-component="button" data-tederash-id="<id>" data-tederash-intent="<variant>"`
- **Input / Textarea**: `data-tederash-component="input" data-tederash-id="<id>" data-tederash-field="<name>" data-tederash-invalid="<boolean>"`
- **Select**: `data-tederash-component="select" data-tederash-id="<id>" data-tederash-value="<val>"`
- **Checkbox**: `data-tederash-component="checkbox" data-tederash-id="<id>" data-tederash-checked="<boolean>"`
- **Dialog**: `data-tederash-component="dialog" data-tederash-state="open|closed"`

---

### 10.3 Tederash Agent Tools Specification (Vercel AI SDK)

The browser extension orchestrates its agent loop using **Vercel AI SDK** (`ai` + `@ai-sdk/openai` + `zod`) running against Groq's high-speed inference (`openai/gpt-oss-120b` or `qwen/qwen3.8-27b`), guarded by the extension **Policy Engine**:

| Tool Name | Purpose | Parameters (Zod Schema) | Execution & Safety |
|---|---|---|---|
| **`tederash_detect`** | Verifies Tederash presence and retrieves root accessibility state | None (`z.object({})`) | Reads `data-tederash-*` on root; risk: `none` |
| **`tederash_get_tree`** | Retrieves semantic component hierarchy (fields, buttons, dialogs) | `filter?: 'all' \| 'form_fields' \| 'buttons' \| 'dialogs'` | Structured JSON representation from component registry; risk: `none` |
| **`tederash_set_profile`** | Switches active accessibility profile globally | `profileId: 'standard' \| 'low-vision' \| 'motor' \| 'cognitive' \| 'dyslexia' \| 'high-contrast'` | Dispatches to React runtime; triggers instant reactive re-render; risk: `none` |
| **`tederash_update_pref`** | Granularly adjusts specific accessibility settings | `fontScale?: number, highContrast?: boolean, targetSize?: string, locale?: 'en' \| 'am', simplifiedLanguage?: boolean` | Calls `runtime.updatePreferences`; risk: `none` |
| **`tederash_explain_field`** | Provides plain-language cognitive assistance for a form field | `fieldId: string` | Interfaces with `@tederash/assistance` engine; risk: `none` |
| **`tederash_explain_error`** | Explains validation failures with plain-language remediation | `fieldId?: string` | Queries active errors and generates accessible guidance; risk: `none` |
| **`tederash_interact`** | Executes semantic action on a Tederash component | `componentId: string, action: 'click' \| 'fill' \| 'select' \| 'toggle', value?: string` | Evaluated against Policy Engine; dispatches synthetic React events; risk: `low` / `consequential` |
| **`tederash_announce`** | Broadcasts live accessibility announcement | `message: string, priority?: 'polite' \| 'assertive'` | Routes to Tederash `LiveRegion`; risk: `none` |
| **`tederash_finish`** | Concludes the task with a summary | `summary: string` | Concludes agent turn; risk: `none` |

---

### 10.4 Agent Orchestration & Execution Rules

1. **Pre-flight Ping Mandatory**: Before invoking `generateText`, the background worker must send `content/ping`. If unreachable, terminate immediately with actionable user guidance instead of burning LLM tokens.
2. **Strict Tederash Tab Gating**: The extension does not activate or run the agent if the active tab does not support Tederash. On non-Tederash or internal browser pages, the assistant UI displays a locked/disabled state, and the agent loop is completely blocked from executing.
3. **Policy Engine Gate**: Every tool execution must call `evaluatePolicy(call)` before contacting the content script. Actions that violate user safety, exfiltrate sensitive data, or bypass confirmation are blocked deterministically.
4. **Structured Tool Calling**: Use Vercel AI SDK's `tool({ inputSchema, execute })` with `stopWhen: isStepCount(6)` to manage agent multi-step turns deterministically.
5. **Markdown Formatting**: All assistant conversational output must render through `MarkdownRenderer` with clean typography matching the component library documentation.

---

# 7. MVP Definition

The first complete demonstration must be achievable without implementing every roadmap phase.

The MVP consists of:

1. Accessibility profile schema.
2. Accessibility runtime.
3. Profile and preference management.
4. React provider and hooks.
5. Three adaptive components:
   - Button
   - Input
   - Form
6. Centralized accessibility announcements.
7. A registration-form playground.
8. Live switching between accessibility profiles.
9. Automated accessibility checks.
10. Tests and documentation.

### MVP demonstration scenario

Build a realistic registration form.

Start with a standard profile.

Switch to a custom profile with:

- Larger text.
- High contrast.
- Larger interaction targets.
- Reduced motion.
- Simplified instructions.
- Keyboard-focused interaction.

Demonstrate that the same application adapts without rewriting its form or changing its underlying business logic.

Then demonstrate accessible validation feedback and guided form assistance.

**The central demonstration should prove that accessibility preferences are a runtime concern, not something developers must manually reimplement for every component.**

---

# 8. Engineering Standards

These requirements apply to every implementation phase.

### TypeScript

- Use strict TypeScript.
- Avoid `any`.
- Prefer explicit public interfaces.
- Validate external or persisted data at runtime.
- Keep public APIs small and stable.

### Accessibility

- Prefer semantic HTML.
- Follow WCAG 2.2 AA as a design and testing target.
- Ensure keyboard accessibility.
- Ensure meaningful accessible names.
- Provide visible focus indicators.
- Respect reduced-motion preferences.
- Avoid color-only communication.
- Test with actual assistive technologies where possible.

### Architecture

- Keep the core runtime framework-independent.
- Separate state management from presentation.
- Separate adaptation rules from components.
- Avoid circular dependencies.
- Avoid unnecessary abstractions.
- Prefer composition over inheritance.
- Keep external integrations optional.
- Make browser API usage capability-aware.

### Performance

- Avoid unnecessary React re-renders.
- Avoid expensive calculations during rendering.
- Lazy-load optional assistance features.
- Keep the core package lightweight.
- Avoid loading AI or speech dependencies when unused.

### Testing

Every meaningful feature must have tests.

Use:

- Unit tests for core logic.
- Integration tests for runtime and React interaction.
- Component tests for accessible behavior.
- Browser tests for real interaction flows.
- Accessibility audits with axe-core.

Do not treat passing tests as proof of complete accessibility.

### Security and privacy

- Keep user preferences local by default.
- Do not collect unnecessary personal data.
- Do not send user input to external AI providers without explicit consent.
- Do not execute arbitrary generated code.
- Require confirmation before consequential actions.
- Treat website content and external model output as untrusted data.

---

# 9. Agent Working Instructions

When working on this repository, follow these rules.

### Before implementing

1. Inspect the relevant code.
2. Understand existing abstractions.
3. Identify dependencies and integration points.
4. Explain the intended changes briefly.
5. Implement only the current task and its necessary dependencies.

### During implementation

1. Follow the established architecture.
2. Keep changes modular.
3. Avoid unrelated refactoring.
4. Write tests alongside functionality.
5. Update types and documentation when public APIs change.
6. Consider keyboard and screen-reader behavior for every interactive component.
7. Keep the implementation extensible without overengineering.

### After implementation

1. Run relevant tests.
2. Run TypeScript checks.
3. Run linting.
4. Run the application or relevant example.
5. Report what was implemented.
6. Report tests and checks that passed.
7. Explicitly report unresolved issues.
8. Identify the next logical implementation task.

### Important behavioral rules

- Do not implement multiple roadmap phases in one large change.
- Do not introduce dependencies without explaining their purpose.
- Do not silently change public APIs.
- Do not remove existing functionality without justification.
- Do not claim a feature is complete when it is only partially implemented.
- Do not use mock implementations as if they were production-ready functionality.
- Do not build features merely because they sound impressive.
- Prioritize a small, coherent, working product over a large collection of incomplete features.

---

# 10. Immediate Execution Plan

## Execution Plan & Status (Updated post Phase 0 Inspection)

### Architecture Decision: Monorepo & Unified Application
- **Monorepo setup**: `pnpm` workspaces (`packages/core`, `packages/react`, `packages/components`, `packages/assistance`, `apps/docs`).
- **Unified Single-Port Application (`apps/docs`)**:
  - The documentation and interactive demonstration have been consolidated into **one flagship application** running on a single port (`3000`).
  - **Landing Page (`/`)**: High-impact hero inspired by `Welcome.tsx`, interactive multi-step registration demo with Web Speech TTS/dictation, live profile switcher (7 presets), real-time runtime inspector, 6 modular architecture cards, architectural comparison table, and community sponsors section.
  - **Documentation (`/docs`)**: Complete Nextra MDX documentation site covering Quick Start, Profile Schemas, Precedence Resolution, Component APIs, Hook APIs, Speech APIs, Ethiopian & Ge'ez Localization, and 6 Architecture Decision Records (ADRs).
  - **Unified Runtime Theme**: Uses the warm paper palette, ink typography, and teal accent (`--tederash-accent`) across both the landing page and the docs.
  - **Universal Accessibility Shell**: `AccessibilityProvider`, floating `AccessibilityControlPanel` (with embedded `axe-core` live auditing), and `LiveRegion` are mounted globally so that every route adapts dynamically at runtime.
  - **Offline First**: Zero cloud dependencies required for core functionality; runs 100% locally.

### Execution Sequence & Current Status

*Detailed teamwork handoff specification available in [TEAMWORK_STATE_EXPORT.md](file:///home/tsegaye/Projects/hackathon/tederash-ui-library/TEAMWORK_STATE_EXPORT.md).*

| Step | Task | Status | Result & Coverage |
|---|---|---|---|
| **1** | **Inspect repository & finalize plan** | **Completed** | Technical plan recorded; SaaS template integration strategy defined |
| **2** | **Initialize monorepo & workspace config** | **Completed** | `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `apps/docs` configured |
| **3** | **Finalize profile schema & types** | **Completed** | Strongly-typed `AccessibilityProfile` in `@tederash/core` (`visual`, `motor`, `cognitive`, `auditory`, `speech`, `interaction`) |
| **4** | **Implement profile utilities & validation** | **Completed** | `validateProfile`, `sanitizeProfile`, 4-tier `resolveProfile` merge precedence |
| **5** | **Implement accessibility runtime** | **Completed** | Framework-independent runtime, `useSyncExternalStore` safe immutable snapshots, persistence adapters |
| **6** | **Implement adaptation engine** | **Completed** | Deterministic `resolveAdaptations` engine mapping profiles to CSS variables and data attributes |
| **7** | **Add unit tests for core** | **Completed** | 11/11 tests passing in `@tederash/core` |
| **8** | **Implement React Provider & hooks** | **Completed** | `AccessibilityProvider`, `AccessibilityOverride`, `useAccessibility`, `useAccessibilityPreference`, `useAdaptations`, `useAnnounce` (16 tests passing) |
| **9** | **Implement adaptive components** | **Completed** | Full 9 components in `@tederash/components`: Button, Input, Form, Checkbox, Select, Dialog, Navigation, Textarea (46 tests passing) |
| **10** | **Implement live announcements system** | **Completed** | `LiveRegion` with polite/assertive containers and visual notification banner |
| **11** | **Implement intelligent form assistance** | **Completed** | `@tederash/assistance` with `AssistanceProvider`, `HeuristicAssistanceProvider`, `AssistanceManager` (40 tests passing) |
| **12** | **Add full E2E test suite (Tiers 1–4)** | **Completed** | 81 E2E integration tests passing in `packages/components/tests/e2e/` (**282/282 workspace tests passing**) |
| **13** | **Multimodal speech & voice interaction** | **Completed** | `packages/core/src/speech/` (capability detection, synthesis & recognition controllers) + `useSpeechSynthesis` / `useSpeechRecognition` hooks; 27 tests (17 core + 10 React) |
| **14** | **Localization & Ethiopian Context** | **Completed** | Bilingual en/am dictionaries, Ge'ez typography engine (line-height 1.6–1.8), `AMHARIC_PRESET`, `useLocale` hook; 25 tests (18 core + 7 React); typography tokens injected via adaptation engine; all string-bearing components localized |
| **15** | **Interactive Showcase & axe-core audits** | **Completed** | Interactive registration demo, preset selector, live runtime inspector, and axe-core drawer; voice dictation and speech readout; guided 3-step wizard engaging on `cognitive.guidedInteraction` |
| **16** | **Unified Single-Port Nextra Application** | **Completed** | Landing page at `/`, Nextra documentation at `/docs`, adaptive subscription at `/subscription`, unified theme, running on port 3000 |

## First task for the coding agent

The first implementation milestone is:

**1. Initialize the monorepo workspace and move necessary SaaS code into `apps/playground`.**
**2. Implement `@tederash/core`: profiles, runtime, adaptation engine, and unit tests.**
**3. Implement `@tederash/react`: provider, context, and hooks.**

Once that foundation is tested, continue with the adaptive components and playground integration.

## Definition of Success

A developer should be able to install the framework, wrap an application in `AccessibilityProvider`, define or select an accessibility profile, and have supported components adapt automatically.

A user should be able to change their preferences without requiring the application to be rewritten.

The framework should make accessible development easier without sacrificing application flexibility, performance, privacy, or compatibility with existing assistive technologies.