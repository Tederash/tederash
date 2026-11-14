import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'out');
const isWatch = process.argv.includes('--watch');
// Minify by default; explicit dev mode (or watch) keeps readable output.
const isProd = !isWatch && process.env.NODE_ENV !== 'development';

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
