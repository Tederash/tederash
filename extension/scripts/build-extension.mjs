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
