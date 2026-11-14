# ADR-002: Incremental Strict TypeScript Migration

## Status
Accepted

## Context
The starter repository uses plain JavaScript (`.js`), while `AGENTS.MD` §14 mandates strict TypeScript with zero `any` in `src/shared/` and `src/extension/`, validated by `zod` at all runtime boundaries.

## Decision
Add `tsconfig.json` with `"strict": true` and `"allowJs": true`. All new modules in `src/` and new Next.js pages (`pages/*.tsx`) are authored in strict TypeScript. Existing starter `.js` components (`components/Header`, `components/Footer`, etc.) remain compatible during transition without breaking builds.

## Consequences
- Type checking (`pnpm typecheck`) validates all shared schemas, messages, background service worker, content scripts, and UI pages.
- No big-bang rewrite of unused starter files is required to start Phase P0.
