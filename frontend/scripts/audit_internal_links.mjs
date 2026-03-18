import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const distDir = path.join(frontendRoot, 'dist');
const reportDir = path.join(frontendRoot, 'reports');
const reportPath = path.join(reportDir, 'internal-link-audit.json');

function normalizePath(input) {
  if (!input) return '/';
  let p = input.split('#')[0].split('?')[0].trim();
  if (!p) p = '/';
  if (!p.startsWith('/')) return p;
  if (p !== '/' && !p.endsWith('/')) p += '/';
  return p;
}

async function walkHtmlFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkHtmlFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function fileToRoutes(filePath) {
  const rel = path.relative(distDir, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return ['/'];
  if (rel.endsWith('/index.html')) {
    const route = `/${rel.slice(0, -'index.html'.length)}`;
    return [route];
  }
  const noExt = `/${rel.slice(0, -'.html'.length)}`;
  return [noExt, `${noExt}/`];
}

function collectAnchorHrefs(html) {
  const hrefs = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) hrefs.push(match[1]);
  return hrefs;
}

async function loadRedirectSet() {
  const astroConfigPath = path.join(frontendRoot, 'astro.config.mjs');
  const mod = await import(pathToFileURL(astroConfigPath).href);
  const redirects = mod.default?.redirects ?? {};
  return new Set(Object.keys(redirects).map(normalizePath));
}

async function main() {
  const htmlFiles = await walkHtmlFiles(distDir);
  const existingRoutes = new Set();
  for (const file of htmlFiles) {
    for (const route of fileToRoutes(file)) existingRoutes.add(normalizePath(route));
  }
  const redirectRoutes = await loadRedirectSet();

  const broken = [];
  let totalAnchors = 0;
  let internalAnchors = 0;

  for (const file of htmlFiles) {
    const sourceRoutes = fileToRoutes(file);
    const source = normalizePath(sourceRoutes[0]);
    const html = await fs.readFile(file, 'utf8');
    const hrefs = collectAnchorHrefs(html);
    totalAnchors += hrefs.length;

    for (const href of hrefs) {
      if (!href.startsWith('/')) continue;
      if (href.startsWith('//')) continue;
      if (href.startsWith('/_astro/')) continue;
      if (href.includes('.')) continue; // non-route assets

      internalAnchors += 1;
      const target = normalizePath(href);
      if (existingRoutes.has(target)) continue;
      if (redirectRoutes.has(target)) continue;

      broken.push({
        source,
        target,
        href,
      });
    }
  }

  const byTarget = {};
  for (const item of broken) byTarget[item.target] = (byTarget[item.target] ?? 0) + 1;

  const report = {
    generated_at: new Date().toISOString(),
    total_html_files: htmlFiles.length,
    total_anchor_links: totalAnchors,
    total_internal_anchor_links: internalAnchors,
    unresolved_internal_links: broken.length,
    unresolved_by_target: Object.entries(byTarget)
      .sort((a, b) => b[1] - a[1])
      .map(([target, count]) => ({ target, count })),
    unresolved_details: broken,
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Internal link audit written: ${reportPath}`);
  console.log(`Unresolved internal links: ${broken.length}`);
  if (broken.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
