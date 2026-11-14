# ADR-001: Dual Extension Build Pipeline (Next.js Static Export + esbuild)

## Status
Accepted

## Context
The starter uses Next.js 13.4.1 (`next build && next export`) with `out.js` to rename `out/_next` to `out/next` for Chrome MV3 compatibility. However, MV3 also requires:
- A background service worker (`background.js`)
- A single self-contained content script (`content.js`, IIFE so it needs no dynamic module chunks)
- An offscreen document bundle (`offscreen.js` + `offscreen.html`)
- A minimal MAIN-world helper (`main-world.js`, IIFE)
- A generated `manifest.json` combining base metadata, permissions, and environment flags

Next.js cannot bundle MV3 service workers or single-file IIFE content scripts cleanly alongside static HTML pages.

## Decision
Keep Next.js (`output: 'export'`) exclusively for extension UI pages (`popup.html`, `options.html`, `onboarding.html`, `sidepanel.html`), and add two small Node build scripts:
1. `scripts/postbuild-next.mjs`: replaces `out.js`, normalizes `_next` → `next` with route-depth-aware relative paths (`./next` or `../next`), and verifies MV3 CSP compliance (no inline executable scripts).
2. `scripts/build-extension.mjs`: uses `esbuild` to bundle `background`, `content`, `offscreen`, and `main-world` directly into `out/`, plus `scripts/build-manifest.mjs` to emit `out/manifest.json`.

## Consequences
- Single `pnpm build` produces a complete unpacked extension in `out/`.
- `pnpm dev` continues to work for rapid UI iteration using `src/dev/chrome-mock.ts`.
- `pnpm build:ext --watch` enables fast iteration on background/content scripts in Chrome.
