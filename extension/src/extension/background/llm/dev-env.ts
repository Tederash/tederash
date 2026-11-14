/**
 * Build-time dev defaults, injected by scripts/build-extension.mjs through esbuild `define`.
 * Plain identifiers (not `process.env`) because MV3 service workers have no `process`.
 * In tests or unbundled code the identifiers are undeclared, hence the typeof guards.
 */
declare const __TEDERASH_DEV_GROQ_KEY__: string | undefined;
declare const __TEDERASH_DEV_GROQ_MODEL__: string | undefined;

export const DEV_GROQ_KEY: string =
  typeof __TEDERASH_DEV_GROQ_KEY__ === 'string' ? __TEDERASH_DEV_GROQ_KEY__ : '';

export const DEV_GROQ_MODEL: string =
  typeof __TEDERASH_DEV_GROQ_MODEL__ === 'string' ? __TEDERASH_DEV_GROQ_MODEL__ : '';
