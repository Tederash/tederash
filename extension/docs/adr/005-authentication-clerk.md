# ADR-005: Clerk for Optional Authentication

## Status
Accepted

## Context
Tederash is local-first by default so users with disabilities can use adaptations, local voice commands, and the encrypted local vault without creating an account (`AGENTS.MD` §10). However, if optional cloud account features are introduced (e.g., managed LLM proxy quota or encrypted cross-device profile sync), an authentication provider is needed.

## Decision
Use **Clerk** (`@clerk/chrome-extension` / Clerk OAuth) for any future or optional user authentication flows. Local-first operation (profiles, adaptations, local vault, BYOK) remains fully functional without signing in.

## Consequences
- No custom auth/session/password implementation needed.
- Keeps WCAG 3.3.8 (Accessible Authentication) compliant via Clerk's passkey/OAuth/magic-link flows.
