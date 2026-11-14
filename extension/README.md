# Tederash — Personalized Web Accessibility Assistant 🚀

Tederash is a Chrome extension that adapts **any** website to *you*. Instead of a bag of
toggles, it is built around **profiles** — coherent bundles of adaptations (text size,
spacing, contrast, reading aids, larger targets) — plus a reading engine that reads pages
aloud. Voice control, guided form filling, and an agentic assistant land in later phases of
the roadmap (see `AGENTS.MD`).

Built with Next.js (static export), TypeScript, Tailwind CSS, Radix UI primitives, and
Chrome Extension Manifest V3.

## Features today (v0.1.0)

- **Profiles** — Low vision, Motor & hands-free, Cognitive support, Dyslexia, Deaf/HoH, and
  Custom; switchable from the popup, editable in the dashboard.
- **On-page adaptations** — text scaling, spacing (line/letter/word/paragraph), contrast
  themes (dark, high-contrast), dyslexia-friendly font, larger click targets, focus
  highlight, reduced motion — all reversible with zero leftover page mutations.
- **Reading ruler** — a translucent band that follows your pointer while reading.
- **Read aloud** — deterministic page-text extraction + `chrome.tts` with rate, pitch, and
  language from your voice settings.
- **Dashboard** (`options.html`) — profiles editor, per-site overrides, voice settings,
  local vault (form values, device-only), AI & privacy controls, shortcuts, about.
- **Per-site control** — pause on any site, or keep Tederash off sites entirely.
- **Onboarding** — 4-step setup that creates your profile; partial progress survives a
  closed tab.

## Repository layout

```
pages/               Next.js extension pages (popup, options, onboarding, sidepanel)
src/
  components/        UI (Radix-based primitives, popup, dashboard sections)
  extension/
    background/      MV3 service worker (settings, TTS)
    content/         Content script (adaptation engine, ruler, reading extraction)
    offscreen/       Offscreen document (reserved for speech recognition)
  shared/            Pure TypeScript: message contracts, settings schema, resolver
  dev/               chrome API mock for `next dev`
scripts/             Build pipeline (esbuild bundling, manifest composition)
tests/               Vitest unit tests + Playwright e2e
```

## Installation

```bash
pnpm install
```

## Run locally (web dev mode)

```bash
pnpm run dev
```

Open http://localhost:3000/ — the popup UI runs with a mocked `chrome` API so you can
iterate without reloading the extension.

## Build and load into Chrome

1. Build (Next export → `out/`, bundle background/content, compose manifest):

   ```bash
   pnpm run build
   ```

2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the generated `out/` folder.

## Development

```bash
pnpm run typecheck    # tsc --noEmit
pnpm run lint         # eslint
pnpm test             # vitest unit tests
pnpm run test:e2e     # playwright
```

## Troubleshooting

- **"Read page" fails on a tab** — if the tab was open *before* you loaded or reloaded the
  extension, Chrome hasn't attached the content script to it yet. Reload the page once
  (Tederash also tries to inject itself on demand). If no voices are installed on your
  system, Tederash automatically falls back to the browser's built-in speech engine.

## Roadmap

The product spec, phase plan (P0–P8), and conventions live in **`AGENTS.MD`** — it is the
single source of truth. Highlights ahead: page snapshots & element registry (P3), voice
commands (P4), policy-gated guided forms + vault (P5), and the safe agentic loop (P6).

## License

MIT — see `LICENSE`.
