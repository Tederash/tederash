import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'out');
const BASE_MANIFEST_PATH = path.join(ROOT, 'src/extension/manifest.base.json');

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const base = JSON.parse(fs.readFileSync(BASE_MANIFEST_PATH, 'utf-8'));
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    base.name = '__MSG_extName__ (Dev)';
  }

  const outManifestPath = path.join(OUT_DIR, 'manifest.json');
  fs.writeFileSync(outManifestPath, JSON.stringify(base, null, 2) + '\n', 'utf-8');
  console.log(`[build-manifest] Wrote ${path.relative(ROOT, outManifestPath)}`);
}

main();
