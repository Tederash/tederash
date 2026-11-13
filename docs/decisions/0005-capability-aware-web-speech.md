# ADR-0005: Capability-aware Web Speech services with graceful degradation

## Status
Accepted

## Date
2026-11-13

## Context
Phase 6 requires voice capabilities (read-aloud, dictation) built on browser Web Speech APIs, but the APIs are inconsistently implemented: `speechSynthesis` is widely available, `SpeechRecognition` exists only under vendor prefixes (`webkitSpeechRecognition`) in most engines, and neither exists in jsdom, Node, or older browsers. Amharic (`am-ET`) voice support in particular cannot be assumed anywhere. Accessibility features must also never become the *only* way to complete a task, and tests must run without real speech engines.

## Decision

1. **Detection before use.** `getSpeechCapabilities()` / `isSpeechSynthesisSupported()` / `isSpeechRecognitionSupported()` perform SSR-safe feature detection; React hooks expose `isSupported` so UI can hide or degrade voice affordances.
2. **Controllers, not globals.** `createSpeechSynthesisController` / `createSpeechRecognitionController` wrap the APIs in framework-independent controllers with state tracking, option clamping (rate/pitch/volume), vendor-prefix resolution, and friendly error mapping (mic denied, no speech, network, …).
3. **Graceful degradation.** Calling any controller method in an unsupported environment triggers the `onError` callback with a clear message — it never throws and never leaves state inconsistent.
4. **Lifecycle safety.** React hooks cancel synthesis and abort recognition on unmount; `stopListening` flips listening state immediately so dictation UIs respond instantly, while final results still arrive through callbacks.
5. **Optional, never exclusive.** Speech features in the playground (read-aloud button, per-field dictation) render only when the profile enables them *and* the browser supports them; every voice-completable task remains completable by keyboard/pointer.

## Alternatives Considered

### Direct `window.speechSynthesis` calls in components
- Pros: No abstraction.
- Cons: Vendor-prefix handling, clamping, error mapping, and cleanup duplicated everywhere; untestable without a real browser.
- Rejected.

### Third-party speech library (e.g. react-speech-recognition)
- Pros: Handles quirks.
- Cons: A hard dependency in the accessibility core for a feature that is optional by design; our controller surface is small enough to own.
- Rejected: The framework stays dependency-light and the Web Speech surface is stable enough to wrap directly.

### Detecting specific Amharic voices and promising am-ET dictation
- Pros: Better UX where supported.
- Cons: Voice enumeration is unreliable (async `voiceschanged`, missing metadata); promising support we cannot test violates the specification ("Do not promise reliable Amharic speech recognition or synthesis without testing actual browser and device support").
- Rejected: The language tag is passed through to the engine, and the UI communicates when the environment lacks support.

## Consequences
- Tests inject structural mocks (utterance/recognition classes) into `window`; no network or audio hardware required.
- jsdom and Node environments see `isSupported: false` and exercise fallback paths in CI.
- Adding a new speech modality (e.g. wake word) follows the same pattern: detect → controller → hook → optional UI.
