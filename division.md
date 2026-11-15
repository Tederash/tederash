# ALX Accessibility Hackathon 2026 — Track 1 (Accessible onboarding)

Task division for the Tederash team, with a self-contained prompt per task. Hand a prompt to a person or an agent as-is; everything it needs is inside it plus the shared contracts in section 0.

**Submission:** code + README + docker-compose.yml + CONFORMANCE.md, Sunday 16:30. The gate is pass/fail: the co-designer finishes the main task unaided (screen reader, keyboard only, 200% zoom, sound off), axe shows zero serious/critical, and a WCAG 2.2 AA conformance report exists. Nothing else is scored until the gate passes.

**Order of priority if time runs out:** T0 → T1 → T6 → T7 → T2 → T3 → T5 → T4 → T8. T1 + T6 + T7 are the gate. T2 and T3 are must-haves that lose points when missing. T4, T5 and T8 add adoption and Ethiopia points.

**One decision, made now:** the module is a framework-free web component built on `@tederash/core` (runtime, profiles, localization, speech, assistance). It does not ship React or `@tederash/components`. Reason: the brief wants one script under 500 KB on Slow 3G and a shadow root; React plus the component library would roughly triple the bundle for no gate benefit. The library fixes in T8 still matter for the docs site and the landing demo, but they are not on the gate path.

---

## 0. Shared contracts (everyone reads this, nobody changes it alone)

Any change here is announced in the team chat and applied in the same commit to every consumer.

### 0.1 Repository layout (new top-level folders, next to the existing monorepo)

```
hackathon/
├── README.md                 ← T7
├── docker-compose.yml        ← T7 (T5 adds the api service)
├── CONFORMANCE.md            ← T6
├── openapi.yaml              ← T5
├── module/                   ← built output of packages/signup (committed)
│   ├── db-signup.js          ← the ONE script a host loads (IIFE, self-contained)
│   ├── i18n/en.json, am.json
│   ├── questions/signup.json, job-application.json, employer-accommodations.json
│   └── audio/am/*.mp3, en/*.mp3   ← recorded question prompts (T2)
├── api/                      ← T5 server
├── demo/
│   ├── blank.html            ← no Bootstrap, no Savanna CSS; module must look right here
│   └── data/jobs.json        ← test jobs (T4)
└── savanna/                  ← git clone of alx-africa/Savanna-static-pages, UNCHANGED,
    └── pages/signup.html, profile.html, jobs.html   ← the only additions
```

Source lives in `packages/signup/` (pnpm workspace package `@tederash/signup`), bundled by esbuild to `hackathon/module/db-signup.js`. T0 sets this up.

### 0.2 The element

```html
<script src="module/db-signup.js" defer></script>
<db-signup lang="am" api="http://localhost:8080/api" theme="host" mode="signup"></db-signup>
```

| Attribute | Values | Meaning |
|---|---|---|
| `lang` | `en` (default), `am` | Interface language. Reflected as `lang` on the shadow form. |
| `api` | URL or absent | Level 2 server. Absent means events + local storage only. |
| `mode` | `signup` (default), `profile`, `job-application`, `employer` | Which question file drives the engine and whether answers are pre-filled from storage. |
| `questions` | URL | Override the question file (used by T4). |
| `simple` | boolean attribute | Low-literacy path on by default (user can still toggle inside). |

### 0.3 Events (all `bubbles: true, composed: true`)

| Event | `detail` |
|---|---|
| `db-signup:step` | `{ step: 3, of: 8, id: "phone" }` |
| `db-signup:done` | `{ profile: { name, phone, language, idRoute, ... }, voiceNotes: [{ questionId, blob?: Blob, url?: string, durationMs }] }` |
| `db-signup:support` | `{ support: ["captions", "interpreter:am", "more-time"] }` — fired separately, never merged into `profile` |
| `db-signup:saved` | `{ where: "device" \| "server", pending: number }` |
| `db-signup:error` | `{ code, message }` |

### 0.4 Question file schema (`module/questions/*.json`)

```json
{
  "id": "signup",
  "version": 1,
  "steps": [
    {
      "id": "name",
      "type": "text",
      "required": true,
      "autocomplete": "name",
      "label": { "en": "Full name", "am": "ሙሉ ስም" },
      "simpleLabel": { "en": "Your name", "am": "ስምዎ" },
      "help": { "en": "As it appears on any document you have.", "am": "በማንኛውም ሰነድዎ ላይ እንደሚታየው።" },
      "icon": "person",
      "voice": true,
      "validate": "nonEmpty"
    },
    { "id": "phone", "type": "tel", "validate": "ethiopianPhone", "autocomplete": "tel", "label": {...} },
    { "id": "language", "type": "choice", "options": [{ "value": "am", "label": {...}, "icon": "..." }], "label": {...} },
    { "id": "idRoute", "type": "choice", "options": [
        { "value": "national-id" }, { "value": "refugee-id" }, { "value": "other-document" },
        { "value": "no-document", "outcome": "partner-referral" } ] },
    { "id": "support", "type": "multi", "sensitive": true, "optional": true,
      "options": [ { "value": "captions" }, { "value": "sign-language" }, { "value": "screen-reader" },
        { "value": "large-text" }, { "value": "interpreter:am" }, { "value": "more-time" }, { "value": "prefer-not-to-say", "exclusive": true } ] }
  ]
}
```

Types: `text`, `tel`, `email`, `choice` (single, rendered as radio group), `multi` (checkbox group), `date` (three fields: day, month, year; Ethiopian calendar label shown alongside), `info` (a screen with no input, e.g. the partner referral confirmation). `sensitive: true` steps are stored and sent apart from the profile (0.5, 0.6).

### 0.5 Storage keys (browser)

| Key | Content |
|---|---|
| `db-signup:<questionsId>:answers` | `{ [stepId]: value }` without sensitive steps |
| `db-signup:<questionsId>:support` | sensitive steps only |
| `db-signup:<questionsId>:cursor` | `{ stepId, updatedAt }` |
| `db-signup:<questionsId>:voice` | IndexedDB store `voiceNotes`, keyed by `stepId` |
| `db-signup:outbox` | queued API calls `[{ method, path, body, createdAt }]` (T5) |
| `db-signup:consent` | `{ acceptedAt, version }` |

### 0.6 API (T5 implements, T1/T3 call through one `api.ts` client)

```
POST   /api/v1/learners                 { name, phone, language, idRoute }   -> 201 { id }
PATCH  /api/v1/learners/{id}            partial profile                       -> 200
PUT    /api/v1/learners/{id}/support    { support: [...] }                    -> 204   (stored in a separate table)
GET    /api/v1/learners/{id}/export     -> 200 everything held, as JSON
DELETE /api/v1/learners/{id}            -> 204
POST   /api/v1/voice-notes              multipart { learnerId, questionId, audio } -> 201 { url }
POST   /api/v1/webhooks                 { url, events: ["learner.created"] }  -> 201
```

Errors are `{ "error": { "code": "...", "message": "words a person can read" } }` with 400/404.

### 0.7 Styling contract

Shadow root, `:host { display:block }`, every colour and font read from the host with fallbacks:
`var(--bs-primary, #002b56)`, `var(--bs-body-font-family, system-ui, "Noto Sans Ethiopic", sans-serif)`, `var(--bs-body-color, #1a1a1a)`. Sizes in `rem`. Targets ≥ 44 px. Focus is `outline: 3px solid` two-tone (dark inner via `box-shadow: 0 0 0 2px #fff` plus the outline) and never removed. Amharic text gets `line-height: 1.7`, no uppercase, no letter spacing. Logical properties only (`margin-inline-start`). Respect `prefers-reduced-motion`; no animation that matters.

### 0.8 i18n contract

`module/i18n/<lang>.json` is flat `{ "key": "string with {param}" }`. No sentence lives in code; a missing key renders the key and logs a warning in dev. Adding Afaan Oromo is one new JSON file plus one line in the language list. Reuse `@tederash/core` dictionaries where keys already exist (labels, errors, announcements) and add module keys next to them.

---

## T0 — Scaffold, build and contracts (first 90 minutes, blocks everyone)

**Deliverable:** `pnpm --filter @tederash/signup build` produces `hackathon/module/db-signup.js`; `<db-signup>` renders a placeholder step in `savanna/pages/signup.html` and in `demo/blank.html`; `docker compose up` serves both on :8080; contracts above are checked in as TypeScript types.

### Prompt

```
You are setting up the build for a hackathon module in the Tederash monorepo (pnpm workspaces, TypeScript strict, esbuild already used in extension/scripts/build-extension.mjs). Read division.md section 0 first; it is the contract everyone codes against.

Do exactly this, in order, and stop when it works:

1. Create packages/signup (name @tederash/signup, private). Dependencies: @tederash/core (workspace), zod. No React, no UI framework. src/index.ts registers a custom element <db-signup> with an open shadow root, reads the attributes in division.md 0.2, and renders a placeholder heading plus one Continue button styled per 0.7. Put the attribute, event, question-file, storage and API contracts from section 0 into src/contracts.ts as exported TypeScript types and zod schemas (QuestionFile, Step, Events, StorageKeys, Api). Export an `emit(el, name, detail)` helper that dispatches bubbling, composed CustomEvents.

2. Add scripts/build.mjs using esbuild: bundle src/index.ts to ../../hackathon/module/db-signup.js as a single IIFE, target es2020, minify, sourcemap external, define process.env.NODE_ENV. Copy src/i18n/*.json and src/questions/*.json next to it. Print the gzipped size at the end and fail the build above 500 KB. Add "build" and "dev" (watch) scripts.

3. Create hackathon/ with the layout in division.md 0.1. Clone https://github.com/alx-africa/Savanna-static-pages into hackathon/savanna and do not modify any existing file in it. Add hackathon/savanna/pages/signup.html: copy the <head> of the starter's index.html so it carries Savanna's CSS, put <db-signup lang="am"> inside <main>, and add a script that listens for db-signup:done and navigates to homepage-v1-paced.html. Add profile.html the same way with mode="profile". Add hackathon/demo/blank.html with no CSS at all except the script tag and the element. Both must show the placeholder.

4. Add hackathon/docker-compose.yml with one nginx:alpine service on 8080 serving savanna/, module/ at /module and demo/ at /demo, read-only volumes, as in the brief. Test `docker compose up` and open http://localhost:8080/pages/signup.html and /demo/blank.html.

5. Write hackathon/README.md with only the "Run it" section filled in for now (the full outline is in division.md T7).

Constraints: no global variables, nothing attached to window, no changes to document.body. Keep the bundle under 60 KB gzipped at this stage. Do not implement questions, voice or storage; T1 and T2 do that. Commit with message "hackathon: scaffold db-signup module, savanna host pages, compose".
```

---

## T1 — Step engine, persistence, validation (the gate)

**Deliverable:** the full sign-up flow from `questions/signup.json` works end to end on the Savanna page and the blank page, keyboard-only and with a screen reader, survives reload, and emits the events.

### Prompt

```
You are building the core of <db-signup>, a framework-free web component in packages/signup (see division.md section 0 for contracts; T0 has created the package, the contracts file, the build and the host pages). Everything renders inside the open shadow root. Use @tederash/core for the localization dictionaries and announcements where they fit; add module strings to src/i18n/en.json and am.json (flat keys, no sentence in code).

Build, in this order, testing each step with the keyboard before the next:

1. Step engine driven by a question file (schema in division.md 0.4). One question per screen. Layout: progress line in words ("Question 3 of 8" / "ጥያቄ 3 ከ 8") as the first element, then an <h2> with the question, help text, the input, an error paragraph, then Back and Continue as real <button>s. On every step change move focus to the <h2> (tabindex="-1"). Back never loses data. No timers anywhere. Emit db-signup:step on each change.

2. Inputs by type: text/tel/email as <input> with a visible <label for>, autocomplete from the step, aria-describedby pointing to help + error ids (same shadow root). choice as a <fieldset><legend> radio group; multi as a checkbox group with an "exclusive" option (prefer-not-to-say) that unchecks the others when chosen. date as three labelled fields (day, month, year) plus a read-only line showing the same date in the Ethiopian calendar via Intl.DateTimeFormat('am-ET-u-ca-ethiopic'). info steps have no input and Continue only.

3. Persistence: save every answer the moment it changes to localStorage under the keys in division.md 0.5; sensitive steps go to the separate key. Save the cursor. On load, resume at the saved step with saved answers; show a one-line notice "We kept your answers on this phone" (localized). mode="profile" pre-fills from storage and shows all steps as a reviewable list with Edit per step.

4. Validation in words: nonEmpty, ethiopianPhone (accept 09…, 07…, +251…, store as +2519…/+2517…), email. On failure: set aria-invalid="true", write the message into the error paragraph (role="alert" is NOT used; instead the paragraph is referenced by aria-describedby and you move focus to the field, which makes the screen reader read label + error). Clear aria-invalid once valid. Never validate a pristine field; validate on Continue and on blur after a first attempt.

5. Identity routes step: national-id, refugee-id, other-document, no-document. no-document leads to an info step that ends successfully with a partner referral message (what the learner sees next, in plain words) and sets profile.idRoute = "no-document" with profile.referral = "partner". It must not end in an error.

6. Final step: review list (sensitive answers shown but marked "kept separate"), then Finish. On Finish emit db-signup:done with { profile, voiceNotes } and db-signup:support with { support } as two separate events. If an api attribute is present, call the client in src/api.ts (T5 provides it; until then stub it to resolve) and emit db-signup:saved.

7. Styling per division.md 0.7. Check in demo/blank.html (no host CSS) and in savanna/pages/signup.html (1.5 MB of Bootstrap outside the shadow root) that it looks the same. 200% zoom and 320 px width: no horizontal scroll.

Tests: vitest with jsdom for the engine (next/back, resume from storage, validation messages per language, exclusive option, event payloads, phone normalization). Keep the bundle under 120 KB gzipped. Do not add voice, read-aloud or the simple-words switch; T2 does that on top of your engine, so expose hooks: `onStepRender(cb)` and a `renderExtras(step, container)` slot beside each input.
```

---

## T2 — Voice input, read-aloud, low-literacy path

**Deliverable:** every input has a "Speak your answer" button, every question has "Listen", a voice-note fallback exists, and the simple-words switch works; all of it degrades honestly when the browser cannot do it.

### Prompt

```
You are adding voice and the low-literacy path to <db-signup> in packages/signup (contracts in division.md section 0; T1 built the step engine and exposes renderExtras(step, container) and onStepRender). Use the speech controllers from @tederash/core: createSpeechRecognitionController, createSpeechSynthesisController, findVoiceForLanguage / hasVoiceForLanguage, and the error codes they report. Strings go in src/i18n/*.json.

Build in this order:

1. "Speak your answer" beside each text/tel/email input (voice: true in the step). Uses SpeechRecognition with lang am-ET or en-US from the element's lang. While listening show text "Listening…" plus an icon (never colour alone) and a Stop button. Never write into the field directly: show the heard text in an editable review box with Insert, Try again and Discard, and read it back with speech synthesis when a voice exists. Insert sets the field value through the normal input path so validation runs. Hide the button entirely when SpeechRecognition is missing (feature-detect), and show a one-line note on first use that Chrome sends audio to Google for recognition.

2. Voice-note fallback: a "Record instead" button using getUserMedia + MediaRecorder (works where recognition does not, including Firefox). Show a clear recording indicator with elapsed seconds in words and a Stop button; cap at 60 s. Store the blob in IndexedDB under the voice store (division.md 0.5) keyed by stepId, play it back with a real <audio controls>, and let the learner delete it. A step with a voice note counts as answered. voiceNotes are included in db-signup:done.

3. "Listen" on every question: speaks label + help (+ error if present) with speechSynthesis in the current language. Before speaking, check hasVoiceForLanguage(getVoices(), lang) after voiceschanged. If there is no voice for Amharic, play module/audio/am/<stepId>.mp3 when it exists, otherwise show "No Amharic voice on this phone" and keep the button disabled with that reason as aria-describedby. Record the audio files for every step of signup.json in both languages (a team member reads them; 16 kHz mono mp3, small). Add a small script that lists steps missing audio.

4. Low-literacy path: a switch at the top ("Simple words") that is on when the element has the simple attribute. When on: use simpleLabel, show the step's icon (inline SVG from a small local set, aria-hidden, with the text always beside it), make choice options big tappable cards (still real radio inputs), and auto-focus the Listen button after the heading so one tap reads the question. The switch state is saved with the cursor.

5. Mobile reality: all of this is tested on an Android phone over HTTPS (cloudflared tunnel --url http://localhost:8080). getUserMedia and speech fail silently on plain http over LAN. Write what you found per feature per browser in hackathon/README.md under "Offline and slow connection".

Do not block the flow on any voice feature: typing always works. Keep the added bundle weight under 40 KB gzipped. Tests: review box inserts through onChange, voice note stored and listed, Listen falls back to the audio file when getVoices() has no am voice, controls hidden when APIs are absent.
```

---

## T3 — Support screen, identity routes, privacy and consent

**Deliverable:** the sensitive parts of the flow meet the brief: support choices optional, separate, never shown to employers; consent recorded; export and delete reachable; profile edit mode.

### Prompt

```
You own privacy and the sensitive screens of <db-signup> in packages/signup (contracts in division.md section 0; T1 built the engine, T5 builds the API). Strings in src/i18n/*.json, both languages.

1. Support step (type multi, sensitive): options captions, sign-language, screen-reader, large-text, interpreter language (a nested choice of am/en/other when ticked), more-time, and "Prefer not to say" which is exclusive and visually identical in weight to the others. The step is skippable with Continue. No wording about diagnosis, disability or documents anywhere. Help text says, in plain words, that these choices are stored apart from the profile and never sent to an employer.

2. Consent screen before the first question: what is collected, where it is stored (this phone; the host's server only if configured), that voice is only recorded when the learner presses the button, and that they can see, export or delete everything. One checkbox "I agree" (required) and a "Read it to me" button. Store {acceptedAt, version} under db-signup:consent. Without consent the engine does not start.

3. Data controls on the review step and in mode="profile": "Download my data" (builds a JSON file from storage, and from GET /export when an api is configured) and "Delete everything" which clears all db-signup:* keys and the IndexedDB store, calls DELETE /learners/{id} when configured, and ends on a confirmation screen. Deletion uses a real <dialog> opened with showModal(), focus goes to Cancel, Escape closes, focus returns to the button. Button label is specific: "Delete my answers".

4. Partner registration path: an info step reachable from idRoute=no-document explaining that a partner organisation can finish registration with the learner's consent; the module emits db-signup:done with referral:"partner" and never asks for or stores a password.

5. Make sure db-signup:support and PUT /support are the only places support data travels, and that db-signup:done, the export file and the API profile object never contain it. Add a vitest test that asserts this by inspecting the payloads.

6. Write hackathon/README.md section "Data and privacy": what is collected, where it is stored, how to delete it, what goes to third parties (nothing unless the host configured an api).
```

---

## T4 — Career gateway (jobs page, application flow, accommodations form)

**Deliverable:** `savanna/pages/jobs.html` with accessible job cards, a support-aware filter that runs in the browser, an application flow and an employer accommodations form, both driven by question files on the same engine; JobPosting JSON-LD on every job.

### Prompt

```
You are building the career gateway for Track 1 using the existing <db-signup> engine (packages/signup; contracts in division.md section 0). No new engine: new question files and a jobs page.

1. hackathon/demo/data/jobs.json: eight test jobs (no real companies), each with title, plainSummary (en + am), employmentType, locationType, city, accommodations offered (array from the same vocabulary as the support options: captions, sign-language, screen-reader, large-text, interpreter:am, more-time, remote, flexible-hours), datePosted.

2. hackathon/savanna/pages/jobs.html (copy the starter <head>, add the sidebar link "Jobs"): a list of job cards as <article> elements with an <h3> title, the summary, a definition list of facts, a "Listen to summary" button (speechSynthesis in the page language, with the same voice check as T2), and an "Apply" link to application.html?job=<id>. Cards work at 200% zoom and 320 px width. Embed a schema.org JobPosting JSON-LD <script type="application/ld+json"> per job (shape in the brief). Validate one with Google's Rich Results test or the schema.org validator and note the result in the README.

3. Support filter: a "Show jobs that offer the support I chose" checkbox that reads db-signup:signup:support from localStorage and filters cards in the browser. Nothing is sent anywhere; say so next to the checkbox. Announce the result count in words in an aria-live="polite" region.

4. Application flow: module/questions/job-application.json (name and phone pre-filled from the signup answers, a free-text "why this job" step with voice, availability as a date step, an accommodations-for-interview step marked sensitive) mounted in application.html with mode="job-application" and questions="…". On done, the host page shows a confirmation and emits nothing to an employer about support.

5. Employer accommodations form: module/questions/employer-accommodations.json mounted in employer.html, asking which accommodations the employer offers (same vocabulary), so the data that feeds the filter comes from the same words.

Tests: filter logic as a pure function with vitest; JSON-LD present and parseable for every card. Add the README "Install, Level 3" paragraph describing the JobPosting embedding.
```

---

## T5 — Level 2 API, offline outbox, OpenAPI

**Deliverable:** a small server in `hackathon/api/` with the endpoints in 0.6, Swagger UI at `/docs`, `openapi.yaml` at the repo root, one webhook, a client with an offline outbox in the module, Docker service, curl examples.

### Prompt

```
You are building the Level 2 server and client for <db-signup> (contracts in division.md 0.5 and 0.6). Keep it small and boring.

Server (hackathon/api): FastAPI (Python 3.12) or Hono (Node 22), pick whichever a stranger can run from the Dockerfile without surprises. SQLite file database with two tables: learners(id, name, phone, language, id_route, referral, created_at, updated_at) and learner_support(learner_id, support_json, updated_at) — a separate table on purpose; the GET /learners/{id} response must not include support. Endpoints exactly as in 0.6 plus GET /health. 201 on create, 400 with { error: { code, message } } in words on bad input, 404 when missing. Phone is normalised server-side too (+251). POST /voice-notes stores files under a data volume and returns a URL. POST /webhooks registers a URL; on learner.created, learner.updated and learner.deleted the server POSTs { event, learnerId, at } to it with a 5 s timeout and never blocks the request on it. CORS allows the host origins from an env var. Every setting comes from .env; commit .env.example; never a real key.

OpenAPI: generate openapi.yaml from the code (FastAPI gives it; for Hono use @hono/zod-openapi) and copy it to hackathon/openapi.yaml in the build. Serve Swagger UI at /docs.

Client (packages/signup/src/api.ts): one function per endpoint. Every write goes through an outbox in localStorage (db-signup:outbox): try the request; on network failure queue it and emit db-signup:saved with { where: "device", pending } and show the learner the localized line "Saved on this phone. It will send when you are online." Flush the outbox on `online` and on load, in order, keeping the learner id returned by the first POST for the later PATCH/PUT. No retries faster than every 30 s.

Docker: add an api service to hackathon/docker-compose.yml with a named volume for data, and make nginx proxy /api to it so the host page can use api="/api". `docker compose up` on a clean machine must bring up both.

README: the "Install, Level 2" section with one curl per call that the judge can paste, and the "Cost to run" section (nginx + one small container + SQLite for 3,000 learners: give a rough monthly figure for a 5 USD VPS and say what grows).

Tests: endpoint tests for create/update/support-separation/export/delete, and a vitest test for the outbox (queue on failure, flush in order on online).
```

---

## T6 — Accessibility gate, conformance report, Ethiopia checks

**Deliverable:** axe clean on both host pages, the manual test matrix done and written down, `CONFORMANCE.md`, Amharic complete, Slow 3G numbers in the README.

### Prompt

```
You are the accessibility gatekeeper for the <db-signup> module (hackathon/; module source in packages/signup). You do not add features. You find and fix what would fail the gate and you write CONFORMANCE.md. Work from the brief's checklist in section 8 of the hackathon guide (real elements, names, keyboard, visible focus, focus moves on screen change, errors in words next to the field and announced, real <dialog>, contrast 4.5:1 text / 3:1 controls, 200% zoom and 320 px, 24 px targets aim 44, lang="am" on Amharic, nothing times out or moves by itself, help in the same place).

1. Add hackathon/scripts/axe.mjs that runs @axe-core/cli (or Playwright + axe-core) against http://localhost:8080/pages/signup.html, /pages/profile.html, /pages/jobs.html and /demo/blank.html, walking through every step of the flow (fill valid answers and press Continue) and failing on any serious or critical issue. Wire it as `pnpm --filter @tederash/signup test:axe`. Fix what it finds inside the module only; a starter defect that blocks reaching the module is patched in a separate file under hackathon/savanna/patches/ and listed in the README.

2. Manual matrix, each done and recorded in CONFORMANCE.md with device and result: keyboard only (mouse unplugged) through the whole flow; NVDA + Chrome on Windows (Tab, then arrow reading); TalkBack on Android in Chrome with eyes closed; 200% zoom at phone width; sound off; prefers-reduced-motion on; Windows High Contrast / forced-colors (the focus outline must survive, so it is outline not box-shadow).

3. Check the module itself for the defects the component review flagged and fix any that are present: focus ring under 3:1 contrast or implemented with box-shadow only; targets under 44 px; the same error announced twice (keep one channel: focus to the field with aria-describedby, no role="alert" duplicate, no global assertive region); any live region that fires on every keystroke; auto-dismissing messages; colour-only state; Enter toggling a checkbox; a custom select where a native one would do; aria-invalid on pristine fields.

4. Amharic completeness: diff en.json and am.json keys (script that fails on a missing key); have an Amharic reader on the team read every screen; lang="am" on the shadow form and on any Amharic text inside an English page; Noto Sans Ethiopic in the font fallback; line-height 1.7 for Amharic; no uppercase or letter-spacing on Ethiopic text. Dates shown in the Ethiopian calendar where a date appears. Phone validation accepts 09, 07 and +251.

5. Performance: Chrome DevTools, Slow 3G, load /demo/blank.html cold; record load time and transferred KB in the README. The script must be under 500 KB and should be far under; name the number.

6. Write hackathon/CONFORMANCE.md as the table in the brief (WCAG 2.2 AA criterion | Supports / Partly / Does not | Notes) covering at least: 1.1.1, 1.3.1, 1.3.5, 1.4.1, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 1.4.12, 2.1.1, 2.1.2, 2.2.1, 2.4.3, 2.4.7, 2.4.11, 2.5.7, 2.5.8, 3.1.1, 3.1.2, 3.2.3, 3.2.6, 3.3.1, 3.3.2, 3.3.3, 3.3.7, 3.3.8, 4.1.2, 4.1.3. Honest "Partly" with a reason beats a column of "Supports". End with who tested, on which device and screen reader, and what they could not do.
```

---

## T7 — README, Docker, submission packaging, co-designer test plan

**Deliverable:** a stranger runs `docker compose up` and installs the module in an hour from the README alone; the four submission files exist and are consistent; the co-designer test is scheduled and its findings are recorded.

### Prompt

```
You own the submission package for the Track 1 module in hackathon/ (module source in packages/signup). Nothing is finished until a stranger can follow it.

1. hackathon/README.md in exactly the brief's outline:
   # Module name, track, team members and co-designer
   ## What it does (three sentences, plain English)
   ## The main task we tested (one sentence, e.g. "A blind learner with no kebele ID registers by voice in Amharic on a low-cost Android phone, with nobody helping.")
   ## Run it (docker compose up, then the addresses to open)
   ## Install, Level 1 (the script tag, every attribute, every event with its detail shape, a host listener example)
   ## Install, Level 2 (link to openapi.yaml, one curl per call)  ← from T5
   ## Install, Level 3 (JobPosting JSON-LD)  ← from T4
   ## Languages (and how to add one: one JSON file)
   ## Offline and slow connection (what works offline, the outbox, measured Slow 3G load time and KB)  ← from T2/T6
   ## Data and privacy  ← from T3
   ## Cost to run  ← from T5
   ## Finished and not finished (honest)
   ## Libraries and their licences (every dependency of the module and the api, with licence)
   Collect each owner's section, make the voice consistent, remove anything that is not true yet.

2. hackathon/docker-compose.yml final check: clean clone on a laptop that is not yours, `docker compose up`, open every page, run the module in the blank page, run the Level 2 curl examples. Fix anything that needs a step not in the README.

3. Licence: add the open licence ALX named at kick-off as hackathon/LICENSE and reference it in the README.

4. Co-designer test plan: a one-page checklist in hackathon/docs/CO-DESIGNER-TEST.md: the main task sentence, device and settings, HTTPS address (cloudflared), observation notes template (what they did, where they paused, what they said, what blocked them), and a rule: no prompting, no proof or history asked. Run it today on their device, record findings, hand blockers to T1/T2/T3 owners, and run it again before 15:30 on Sunday. Only blockers get fixed after 14:00.

5. Freeze: at Sunday 14:00 tag the repo, stop feature work, and check that README, CONFORMANCE.md, openapi.yaml and docker-compose.yml agree with the code (attribute names, event names, endpoint paths, file names).
```

---

## T8 — Component library accessibility fixes (parallel, not on the gate)

**Deliverable:** `@tederash/components` default behaviour meets the baseline the review asked for, so the docs site, landing demo and jobs demo hold up under the same tests; no public API removed.

### Prompt

```
You are fixing baseline accessibility in packages/components (React, Radix/shadcn primitives, Tailwind v4) following an external review. Rule for every change: the default component, with no Tederash profile active, must already meet WCAG 2.2 AA; profiles push further, they do not make it compliant. Do not remove props; add tests with Testing Library and jest-axe style assertions (vitest-axe) for each item.

Do these in order, one commit each:

1. Focus ring: replace Tailwind ring (box-shadow) focus styles with a two-tone outline: `outline: 3px solid <dark>` plus `outline-offset: 2px` and a 2 px light inner edge, at ≥ 3:1 against adjacent colours in light and dark themes. It must survive forced-colors mode (outline-color: Highlight there). Make it the default; the profile's "high-visibility" option only thickens it.

2. Target size: default interactive height 44 px (buttons, inputs, checkbox and radio hit areas including their label). Keep "normal/large/extra-large" as 44/48/56.

3. One announcement channel for form errors: field errors live only in aria-describedby text with aria-invalid set after validation (never on a pristine field). On failed submit, TederashForm moves focus to an error summary whose items are links that focus the field. Remove per-field role="alert" and any duplicate global assertive announcement of the same error.

4. Character counter: visual counter aria-hidden; announce only when crossing 80%, 95% and 100% of maxLength.

5. Checkbox keyboard: Space toggles, Enter does not (native pattern); verify with Radix.

6. Select: add a native <select> rendering as the default for TederashSelect (same props), with the Radix listbox behind an opt-in prop (e.g. `appearance="custom"`). Keep the tederash:interact `choose` registration working for both.

7. SkipLink primitive: new component rendered first in <body> with a configurable target id; remove the skip link from inside TederashNavigation (keep a deprecation alias).

8. Notifications: LiveRegion visual banners persist until dismissed by default, with an optional adjustable timeout; re-announce an identical message by clearing and re-setting the region instead of deduplicating it away.

9. Inputs: pass through autocomplete tokens and document them; never block paste on password or one-time-code fields; never attach dictation or read-aloud to password fields (already true; add a test).

10. Links in body text are underlined by default; the profile option becomes "underline all links" rather than the only way to get underlines.

11. Localization: when a component renders Amharic strings inside an English document, set lang="am" on that element; add the Ethiopic font fallback and line-height from @tederash/core typography to the base styles.

12. Destructive confirmation: replace window.confirm in TederashButton with the library dialog as role="alertdialog": specific button labels from props ("Delete 3 files"), focus on Cancel, no click-outside dismissal. Offer an `onUndo` prop path for cases where undo is better than confirm.

After each item run `pnpm -r typecheck && pnpm -r test` and the docs app typecheck. Write a short per-component conformance note in packages/components/A11Y.md listing which criteria each item addresses and how it was tested.
```

---

## Who does what (suggested, 5 people)

| Person | Saturday | Sunday morning | Sunday after 14:00 |
|---|---|---|---|
| A | T0 then T1 | T1 polish, T3 | blockers only |
| B | T2 (after T0 lands) | T2 mobile testing | blockers only |
| C | T5 server | T5 client/outbox, T4 | README sections |
| D | T6 setup (axe script, test matrix), Amharic review | T6 full pass, CONFORMANCE.md | final co-designer run |
| E | T7 README skeleton, co-designer session, audio recording for T2 | T4 jobs page, T7 packaging | freeze and submit |

T8 runs only if a sixth person exists or after submission.
