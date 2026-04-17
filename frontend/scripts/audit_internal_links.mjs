import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const distDir = path.join(frontendRoot, 'dist');
const reportDir = path.join(frontendRoot, 'reports');
const reportPath = path.join(reportDir, 'internal-link-audit.json');
const blogContentDir = path.join(frontendRoot, 'src', 'content', 'blog');

const INTENTIONAL_UNRESOLVED_TARGETS = new Set([
  '/blog/how-to-view-social-media-anonymously-complete-privacy-guide/',
  '/blog/mp3-juice-free-music-downloaders-are-they-safe/',
  '/blog/youtube-to-webm-converter/',
  '/blog/youtube-playlist-to-mp3-download-entire-playlists/',
  '/blog/how-to-download-beats-from-youtube/',
].map((target) => normalizePath(target)));

const MALFORMED_MARKDOWN_PATTERNS = [
  {
    id: 'extra_closing_bracket_after_link',
    regex: /\]\([^\n)]*\)\]/g,
  },
];

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

async function walkFilesByExtensions(dir, extensions) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkFilesByExtensions(full, extensions));
      continue;
    }
    if (!entry.isFile()) continue;
    if (extensions.some((ext) => entry.name.endsWith(ext))) out.push(full);
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

function countByTarget(items) {
  const byTarget = {};
  for (const item of items) byTarget[item.target] = (byTarget[item.target] ?? 0) + 1;
  return Object.entries(byTarget)
    .sort((a, b) => b[1] - a[1])
    .map(([target, count]) => ({ target, count }));
}

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

async function findMalformedMarkdownLinks() {
  const files = await walkFilesByExtensions(blogContentDir, ['.md', '.mdx']);
  const issues = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    for (const pattern of MALFORMED_MARKDOWN_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      while ((match = regex.exec(raw)) !== null) {
        issues.push({
          file: path.relative(frontendRoot, file).replace(/\\/g, '/'),
          line: getLineNumber(raw, match.index),
          pattern: pattern.id,
          snippet: match[0],
        });
      }
    }
  }

  return issues;
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

  const intentionalBroken = [];
  const unexpectedBroken = [];
  for (const item of broken) {
    if (INTENTIONAL_UNRESOLVED_TARGETS.has(item.target)) {
      intentionalBroken.push(item);
      continue;
    }
    unexpectedBroken.push(item);
  }

  const malformedMarkdownLinks = await findMalformedMarkdownLinks();

  const report = {
    generated_at: new Date().toISOString(),
    total_html_files: htmlFiles.length,
    total_anchor_links: totalAnchors,
    total_internal_anchor_links: internalAnchors,
    unresolved_internal_links: broken.length,
    intentional_unresolved_internal_links: intentionalBroken.length,
    unexpected_unresolved_internal_links: unexpectedBroken.length,
    unresolved_by_target: countByTarget(broken),
    intentional_unresolved_by_target: countByTarget(intentionalBroken),
    unexpected_unresolved_by_target: countByTarget(unexpectedBroken),
    unresolved_details: broken,
    intentional_unresolved_details: intentionalBroken,
    unexpected_unresolved_details: unexpectedBroken,
    expected_unresolved_targets: Array.from(INTENTIONAL_UNRESOLVED_TARGETS).sort(),
    malformed_markdown_links: malformedMarkdownLinks.length,
    malformed_markdown_details: malformedMarkdownLinks,
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Internal link audit written: ${reportPath}`);
  console.log(`Unresolved internal links (total): ${broken.length}`);
  console.log(`Intentional unresolved links: ${intentionalBroken.length}`);
  console.log(`Unexpected unresolved links: ${unexpectedBroken.length}`);
  console.log(`Malformed markdown links: ${malformedMarkdownLinks.length}`);

  if (unexpectedBroken.length > 0 || malformedMarkdownLinks.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
