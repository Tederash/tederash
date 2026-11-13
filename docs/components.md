# Adaptive Components (`@tederash/components`)

All components:

- Use semantic HTML and/or Radix UI primitives (never custom accessibility behavior).
- Read the active profile's adaptations via `useAccessibility` and localize built-in strings via the active locale.
- Forward refs, accept standard React props, and expose complete TypeScript definitions.
- Respect destructive-action confirmation and error/disabled states.

Localization note: components translate built-in strings (error summaries, aria labels, counters) from the active profile's locale. Strings you pass as props always take precedence.

## AccessibleButton

```tsx
<AccessibleButton variant="primary" onClick={submit}>
  Submit application
</AccessibleButton>
```

- Variants: `primary`, `secondary`, `destructive`, `outline`, `ghost`, `link` (plus `asChild` via Radix Slot).
- Adaptive: minimum target height (40/48/56px), padding, focus-ring visibility, motion classes.
- `variant="destructive"` triggers a confirmation when `interaction.confirmationBeforeDestructiveActions` is on; the prompt defaults to the localized `labels.confirmDestructivePrompt` (override with `confirmDestructivePrompt`).

## AccessibleInput

```tsx
<AccessibleInput
  label="Email address"
  type="email"
  description="Enter the email address associated with your account."
  simplifiedDescription="The email where we can message you."
  error={emailError}
  required
/>
```

- Proper `htmlFor`/`id` association, `aria-describedby` wiring, `aria-invalid` on error.
- `simplifiedDescription` is shown instead of `description` when `cognitive.simplifiedLanguage` is on.
- Adaptive target sizing; visible error text (never color-only).

## AccessibleForm

```tsx
<AccessibleForm
  errors={formErrors}                          // summarized in an accessible banner
  onSubmit={handleSubmit}
  successAnnouncement="Registration completed successfully."
>
```

- WCAG 3.3.1/3.3.3 error identification: `role="alert"` summary with a localized heading and per-item list; submit announces the localized error count assertively or the success message politely.

## AccessibleTextarea

Same adaptive behavior as `AccessibleInput` for multi-line text, plus a localized `aria-live` character counter (`{count} / {max}`) when `maxLength` is set.

## AccessibleCheckbox

Accessible toggle with keyboard Space support and adaptive sizing.

## AccessibleSelect

```tsx
<AccessibleSelect
  label="Role"
  options={[{ value: "admin", label: "Administrator" }]}
  onChange={(value) => setRole(value)}
  error={roleError}
/>
```

- Full keyboard navigation (ArrowUp/ArrowDown, Enter/Space, Escape, Tab).
- Placeholder defaults to the localized `labels.selectAnOption` (override with `placeholder`).

## AccessibleDialog

```tsx
<AccessibleDialog
  open={open}
  onOpenChange={setOpen}
  title="Confirm deletion"
  description="This action cannot be undone."
  destructive
>
  <p>Dialog body…</p>
</AccessibleDialog>
```

- Modal with focus trap, Escape dismissal, backdrop-click dismissal (both toggleable), stable refs preventing focus theft on parent re-renders.
- Close button's accessible name defaults to the localized `labels.closeDialog` (override with `closeButtonAriaLabel`).

## AccessibleNavigation

```tsx
<AccessibleNavigation
  links={[{ label: "Profile", href: "/profile" }]}
  activeRoute={pathname}
  skipToContentTarget="#main-content"
/>
```

- Landmark `<nav>` with accessible name, active route highlight, mobile hamburger drawer, and a skip-to-content link (localized label; override with `skipToContentLabel`).
- Menu toggle labels come from `labels.openMenu` / `labels.closeMenu`.

## LiveRegion

Renders dual `aria-live` containers (`polite` + `assertive`) wired to the runtime's announcement bus, plus a visual notification banner. Place it once near the root of your app. Respects `auditory.visualNotifications` and `cognitive.reduceDistractions`.

## Testing your own components

Compose a test harness the same way the library does:

```tsx
<AccessibilityProvider defaultProfile={AMHARIC_PRESET} persistence="none">
  <MyForm />
</AccessibilityProvider>
```

Run axe-core against the rendered output to catch common issues — remembering that automated audits are a floor, not proof of WCAG conformance.
