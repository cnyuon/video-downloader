import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const reportDir = path.join(frontendRoot, 'reports');

const inputPath = process.argv[2] || path.join(reportDir, 'gsc_urls_input.txt');
const baseOrigin = process.argv[3] || 'http://127.0.0.1:4321';
const jsonOut = path.join(reportDir, 'gsc-url-verification.json');
const mdOut = path.join(reportDir, 'gsc-url-verification.md');

function parseUrls(text) {
  const lines = text.split(/\r?\n/);
  const urls = [];
  const seen = new Set();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('http')) continue;
    if (!line.includes('getmediatools.com')) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    urls.push(line);
  }
  return urls;
}

function extractMeta(content) {
  const robotsMatch = content.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
  const canonicalMatch = content.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const hreflangCount = (content.match(/<link[^>]+rel=["']alternate["'][^>]+hreflang=/gi) || []).length;
  return {
    robots: robotsMatch ? robotsMatch[1].trim().toLowerCase() : null,
    canonical: canonicalMatch ? canonicalMatch[1].trim() : null,
    hreflang_count: hreflangCount,
  };
}

function toLocalUrl(prodUrl) {
  const u = new URL(prodUrl);
  return `${baseOrigin}${u.pathname}${u.search}`;
}

function expectedNoindex(prodUrl) {
  return /\/instagram-downloader\/$/i.test(new URL(prodUrl).pathname);
}

async function checkUrl(prodUrl) {
  const localUrl = toLocalUrl(prodUrl);
  let status = 0;
  let finalUrl = localUrl;
  let robots = null;
  let canonical = null;
  let hreflangCount = 0;
  let error = null;

  try {
    const res = await fetch(localUrl, { redirect: 'follow' });
    status = res.status;
    finalUrl = res.url;
    const text = await res.text();
    const meta = extractMeta(text);
    robots = meta.robots;
    canonical = meta.canonical;
    hreflangCount = meta.hreflang_count;
  } catch (err) {
    error = String(err);
  }

  const needsNoindex = expectedNoindex(prodUrl);
  const passStatus = status === 200;
  const passRobots = needsNoindex
    ? !!robots && robots.includes('noindex') && robots.includes('follow')
    : !!robots && !robots.includes('noindex');
  const passCanonical = !!canonical;
  const passHreflang = hreflangCount > 0;

  return {
    prod_url: prodUrl,
    local_url: localUrl,
    final_url: finalUrl,
    status,
    robots,
    canonical,
    hreflang_count: hreflangCount,
    expected_noindex: needsNoindex,
    pass_status: passStatus,
    pass_robots: passRobots,
    pass_canonical: passCanonical,
    pass_hreflang: passHreflang,
    pass: passStatus && passRobots && passCanonical && passHreflang,
    error,
  };
}

async function main() {
  const inputText = await fs.readFile(inputPath, 'utf8');
  const urls = parseUrls(inputText);
  if (urls.length === 0) {
    throw new Error(`No URLs found in ${inputPath}`);
  }

  const results = [];
  for (const url of urls) {
    results.push(await checkUrl(url));
  }

  const summary = {
    generated_at: new Date().toISOString(),
    checked_urls: results.length,
    passed_urls: results.filter((r) => r.pass).length,
    failed_urls: results.filter((r) => !r.pass).length,
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonOut, `${JSON.stringify({ summary, results }, null, 2)}\n`, 'utf8');

  const mdLines = [];
  mdLines.push('# GSC URL Verification');
  mdLines.push('');
  mdLines.push(`- Generated: ${summary.generated_at}`);
  mdLines.push(`- Checked URLs: ${summary.checked_urls}`);
  mdLines.push(`- Passed: ${summary.passed_urls}`);
  mdLines.push(`- Failed: ${summary.failed_urls}`);
  mdLines.push('');
  mdLines.push('| URL | Status | Robots | Canonical | Hreflang | Pass |');
  mdLines.push('|---|---:|---|---|---:|---|');
  for (const r of results) {
    mdLines.push(`| ${r.prod_url} | ${r.status} | ${r.robots ?? 'missing'} | ${r.pass_canonical ? 'yes' : 'no'} | ${r.hreflang_count} | ${r.pass ? 'yes' : 'no'} |`);
  }
  await fs.writeFile(mdOut, `${mdLines.join('\n')}\n`, 'utf8');

  console.log(`GSC URL verification written: ${jsonOut}`);
  console.log(`Markdown summary written: ${mdOut}`);
  console.log(`Passed ${summary.passed_urls}/${summary.checked_urls}`);
  if (summary.failed_urls > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
