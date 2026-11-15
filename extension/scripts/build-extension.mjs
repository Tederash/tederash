import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'out');
const isWatch = process.argv.includes('--watch');
// Minify by default; explicit dev mode (or watch) keeps readable output.
const isProd = !isWatch && process.env.NODE_ENV !== 'development';

function loadEnv() {
  const possiblePaths = [
    path.join(ROOT, '.env'),
    path.join(ROOT, 'extension', '.env'),
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '../.env'),
    path.resolve(ROOT, '../extension/.env'),
    path.resolve(ROOT, '../.env'),
  ];
  const env = {};
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          env[key] = val;
        }
      }
      if (env.GROQ_API_KEY) break;
    }
  }
  return env;
}

const envVars = loadEnv();
const groqKey = process.env.TEDERASH_NO_DEV_KEY
  ? ''
  : envVars.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
const groqModel = envVars.GROQ_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

if (groqKey) {
  console.warn(
    '[build-extension] GROQ_API_KEY from .env is embedded in background.js as a dev default. ' +
      'Do not distribute this build; set TEDERASH_NO_DEV_KEY=1 to omit it.'
  );
}

async function buildAll() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const common = {
    bundle: true,
    sourcemap: isProd ? false : 'linked',
    minify: isProd,
    target: ['chrome120'],
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
      // Dev convenience only: seeds the AI config when the user has not saved a key.
      // Never read via `process.env` (the service worker has no `process`).
      __TEDERASH_DEV_GROQ_KEY__: JSON.stringify(groqKey),
      __TEDERASH_DEV_GROQ_MODEL__: JSON.stringify(groqModel),
    },
  };

  const targets = [
    {
      entryPoints: [path.join(ROOT, 'src/extension/background/index.ts')],
      outfile: path.join(OUT_DIR, 'background.js'),
      format: 'esm',
    },
    {
      entryPoints: [path.join(ROOT, 'src/extension/content/index.ts')],
      outfile: path.join(OUT_DIR, 'content.js'),
      format: 'iife',
    },
    {
      entryPoints: [path.join(ROOT, 'src/extension/offscreen/index.ts')],
      outfile: path.join(OUT_DIR, 'offscreen.js'),
      format: 'iife',
    },
    {
      entryPoints: [path.join(ROOT, 'src/extension/injected/main-world.ts')],
      outfile: path.join(OUT_DIR, 'main-world.js'),
      format: 'iife',
    },
  ];

  const offscreenSrc = path.join(ROOT, 'src/extension/offscreen/offscreen.html');
  const offscreenDst = path.join(OUT_DIR, 'offscreen.html');
  if (fs.existsSync(offscreenSrc)) {
    fs.copyFileSync(offscreenSrc, offscreenDst);
  }

  /**
   * Voice activity detector assets for hands-free voice mode. The VAD worklet,
   * the Silero model and the ONNX Runtime WASM must live inside the extension
   * origin: the CSP allows no CDN fetches, so they are copied next to the
   * bundles and addressed with chrome.runtime.getURL('vad/…').
   */
  const vadDir = path.join(OUT_DIR, 'vad');
  fs.mkdirSync(vadDir, { recursive: true });
  const vadWebDist = path.join(ROOT, 'node_modules/@ricky0123/vad-web/dist');
  // v5 is the model the hook selects; legacy is kept so the version can be
  // swapped without another build change.
  const vadAssets = [
    path.join(vadWebDist, 'vad.worklet.bundle.min.js'),
    path.join(vadWebDist, 'silero_vad_v5.onnx'),
    path.join(vadWebDist, 'silero_vad_legacy.onnx'),
  ];
  // ONNX Runtime is installed transitively; resolve it through pnpm's store.
  const ortDist = (() => {
    const direct = path.join(vadWebDist, 'node_modules/onnxruntime-web/dist');
    if (fs.existsSync(direct)) return direct;
    const store = path.join(ROOT, '../node_modules/.pnpm');
    if (!fs.existsSync(store)) return undefined;
    const entry = fs
      .readdirSync(store)
      .filter((name) => name.startsWith('onnxruntime-web@'))
      .sort()
      .pop();
    return entry ? path.join(store, entry, 'node_modules/onnxruntime-web/dist') : undefined;
  })();
  if (ortDist) {
    // The CPU runtime pair the bundle asks for; the heavier WebGPU variants are
    // not needed for a 1.7 MB audio model.
    for (const name of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
      const src = path.join(ortDist, name);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(vadDir, name));
      else console.warn(`[build-extension] Missing ONNX Runtime asset: ${name}`);
    }
  } else {
    console.warn('[build-extension] onnxruntime-web not found; voice mode VAD will not start.');
  }
  for (const src of vadAssets) {
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(vadDir, path.basename(src)));
    else console.warn(`[build-extension] Missing VAD asset: ${path.basename(src)}`);
  }

  if (isWatch) {
    const contexts = await Promise.all(
      targets.map((cfg) => esbuild.context({ ...common, ...cfg }))
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log('[build-extension] Watching extension entrypoints...');
  } else {
    await Promise.all(targets.map((cfg) => esbuild.build({ ...common, ...cfg })));
    console.log('[build-extension] Built all extension bundles.');
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
