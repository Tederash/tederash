import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'out');

function walkHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function assertNoInlineExecutableScripts(html, relFile) {
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    const attrs = match[1] ?? '';
    const body = (match[2] ?? '').trim();
    const hasSrc = /\bsrc\s*=/i.test(attrs);
    const isJson = /\btype\s*=\s*["']application\/json["']/i.test(attrs);
    if (!hasSrc && !isJson && body.length > 0) {
      throw new Error(
        `[postbuild-next] Inline executable <script> detected in ${relFile}. MV3 CSP forbids inline scripts.`
      );
    }
  }
}

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    throw new Error(`[postbuild-next] Output directory not found: ${OUT_DIR}`);
  }

  const nextDir = path.join(OUT_DIR, '_next');
  const renamedNextDir = path.join(OUT_DIR, 'next');

  if (fs.existsSync(nextDir)) {
    if (fs.existsSync(renamedNextDir)) {
      fs.rmSync(renamedNextDir, { recursive: true, force: true });
    }
    fs.renameSync(nextDir, renamedNextDir);
    console.log('[postbuild-next] Renamed out/_next -> out/next');
  }

  const htmlFiles = walkHtmlFiles(OUT_DIR);
  for (const file of htmlFiles) {
    const rel = path.relative(OUT_DIR, file);
    const depth = rel.split(path.sep).length - 1;
    const prefix = depth === 0 ? './next' : `${'../'.repeat(depth)}next`;

    let html = fs.readFileSync(file, 'utf-8');
    html = html.replace(/\/_next/g, prefix);
    assertNoInlineExecutableScripts(html, rel);
    fs.writeFileSync(file, html, 'utf-8');
  }

  for (const stale of ['inject.js', 'manifest.json']) {
    const stalePath = path.join(OUT_DIR, stale);
    if (fs.existsSync(stalePath)) {
      fs.rmSync(stalePath, { force: true });
    }
  }

  console.log(`[postbuild-next] Processed ${htmlFiles.length} HTML files (CSP verified).`);
}

main();
