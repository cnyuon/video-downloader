#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const REPORT_DIR = path.join(ROOT, 'reports', 'seo');
const TODAY = new Date().toISOString().slice(0, 10);

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function decodeTsString(value) {
  return value
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

function parseLocaleStringMap(tsText) {
  const map = {};
  let currentLocale = null;
  const lines = tsText.split('\n');

  for (const line of lines) {
    const localeMatch = line.match(/^\s{4}([a-z]{2}):\s*\{\s*$/);
    if (localeMatch) {
      currentLocale = localeMatch[1];
      map[currentLocale] = map[currentLocale] || {};
      continue;
    }

    if (currentLocale && /^\s{4}\},?\s*$/.test(line)) {
      currentLocale = null;
      continue;
    }

    if (!currentLocale) continue;

    const kv = line.match(/^\s{8}'([^']+)':\s*'((?:\\'|[^'])*)',?\s*$/);
    if (!kv) continue;
    map[currentLocale][kv[1]] = decodeTsString(kv[2]);
  }

  return map;
}

function parseBlogClusters(tsText) {
  const clusters = [];
  const arrayStart = tsText.indexOf('export const BLOG_CLUSTERS');
  if (arrayStart === -1) return clusters;
  const slice = tsText.slice(arrayStart);

  const regex = /\{\s*id:\s*'([^']+)',[\s\S]*?title:\s*'([^']+)',[\s\S]*?description:\s*'([^']+)',[\s\S]*?icon:\s*'[^']+'[\s\S]*?\},/g;
  let match;
  while ((match = regex.exec(slice)) !== null) {
    clusters.push({
      id: match[1],
      title: decodeTsString(match[2]),
      description: decodeTsString(match[3]),
    });
  }
  return clusters;
}

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(content) {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return {};
  const out = {};
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.+)\s*$/);
    if (!m) continue;
    out[m[1]] = stripWrappingQuotes(m[2]);
  }
  return out;
}

function collectBlogRows() {
  const blogRoot = path.join(SRC, 'content', 'blog');
  const rows = [];

  const locales = fs
    .readdirSync(blogRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const locale of locales) {
    const dir = path.join(blogRoot, locale);
    const files = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith('.md'))
      .map((d) => d.name)
      .sort();

    for (const file of files) {
      const slug = file.replace(/\.md$/, '');
      const fullPath = path.join(dir, file);
      const frontmatter = parseFrontmatter(readFile(fullPath));
      const title = frontmatter.title || '';
      const description = frontmatter.description || '';
      const route = locale === 'en' ? `/blog/${slug}/` : `/${locale}/blog/${slug}/`;
      rows.push({
        type: 'blog_post',
        locale,
        route,
        title,
        description,
        source: path.relative(ROOT, fullPath),
      });
    }
  }
  return rows;
}

function lenStatus(length, min, max) {
  if (length < min) return 'short';
  if (length > max) return 'long';
  return 'ok';
}

function withMetrics(row) {
  const titleLength = row.title.length;
  const descriptionLength = row.description.length;
  return {
    ...row,
    title_length: titleLength,
    description_length: descriptionLength,
    title_status: lenStatus(titleLength, 45, 60),
    description_status: lenStatus(descriptionLength, 130, 160),
  };
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(filePath, rows) {
  const headers = [
    'type',
    'locale',
    'route',
    'title',
    'description',
    'title_length',
    'description_length',
    'title_status',
    'description_status',
    'source',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function groupCount(rows, key) {
  const out = new Map();
  for (const row of rows) {
    const k = row[key];
    out.set(k, (out.get(k) || 0) + 1);
  }
  return [...out.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function findOutliers(rows, predicate, limit = 25) {
  return rows.filter(predicate).slice(0, limit);
}

function writeSummary(filePath, rows) {
  const total = rows.length;
  const byType = groupCount(rows, 'type');
  const byLocale = groupCount(rows, 'locale');

  const badTitle = rows.filter((r) => r.title_status !== 'ok').length;
  const badDesc = rows.filter((r) => r.description_status !== 'ok').length;
  const bothBad = rows.filter((r) => r.title_status !== 'ok' && r.description_status !== 'ok').length;

  const longTitles = findOutliers(rows, (r) => r.title_status === 'long');
  const shortTitles = findOutliers(rows, (r) => r.title_status === 'short');
  const longDescs = findOutliers(rows, (r) => r.description_status === 'long');
  const shortDescs = findOutliers(rows, (r) => r.description_status === 'short');

  const lines = [];
  lines.push('# SEO Metadata Inventory Summary');
  lines.push('');
  lines.push(`Generated: ${TODAY}`);
  lines.push(`Total rows: ${total}`);
  lines.push('');
  lines.push('## Counts by Type');
  for (const [type, count] of byType) lines.push(`- ${type}: ${count}`);
  lines.push('');
  lines.push('## Counts by Locale');
  for (const [locale, count] of byLocale) lines.push(`- ${locale}: ${count}`);
  lines.push('');
  lines.push('## Length Health (Heuristic)');
  lines.push('- Title target: 45–60 chars');
  lines.push('- Description target: 130–160 chars');
  lines.push(`- Titles out of range: ${badTitle}`);
  lines.push(`- Descriptions out of range: ${badDesc}`);
  lines.push(`- Both out of range: ${bothBad}`);
  lines.push('');

  function appendRows(label, outRows) {
    lines.push(`## ${label}`);
    if (outRows.length === 0) {
      lines.push('- none');
    } else {
      for (const row of outRows) {
        lines.push(
          `- [${row.locale}] ${row.route} (title:${row.title_length}, desc:${row.description_length})`
        );
      }
    }
    lines.push('');
  }

  appendRows('Long Titles (sample)', longTitles);
  appendRows('Short Titles (sample)', shortTitles);
  appendRows('Long Descriptions (sample)', longDescs);
  appendRows('Short Descriptions (sample)', shortDescs);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

function main() {
  const uiText = readFile(path.join(SRC, 'i18n', 'ui.ts'));
  const phase1Text = readFile(path.join(SRC, 'i18n', 'phase1-extra.ts'));
  const layoutText = readFile(path.join(SRC, 'layouts', 'Layout.astro'));
  const clusterText = readFile(path.join(SRC, 'lib', 'blog-taxonomy.ts'));

  const ui = parseLocaleStringMap(uiText);
  const phase1 = parseLocaleStringMap(phase1Text);
  const clusters = parseBlogClusters(clusterText);
  const rows = [];

  // Layout fallback defaults
  const defaultTitle = (layoutText.match(/title\s*=\s*"([^"]+)"/) || [])[1] || '';
  const defaultDescription = (layoutText.match(/description\s*=\s*"([^"]+)"/) || [])[1] || '';
  rows.push(
    withMetrics({
      type: 'layout_default',
      locale: 'all',
      route: '(fallback)',
      title: defaultTitle,
      description: defaultDescription,
      source: 'src/layouts/Layout.astro',
    })
  );

  // Per-locale homepage + blog index
  for (const locale of Object.keys(ui).sort()) {
    const homeRoute = locale === 'en' ? '/' : `/${locale}/`;
    const blogRoute = locale === 'en' ? '/blog/' : `/${locale}/blog/`;
    const homeTitle = ui[locale]['index.meta.title'] || '';
    const homeDesc = ui[locale]['index.meta.desc'] || '';
    const blogTitleBase = ui[locale]['blog.title'] || '';
    const blogDesc = ui[locale]['blog.desc'] || '';

    rows.push(
      withMetrics({
        type: 'home_page',
        locale,
        route: homeRoute,
        title: homeTitle,
        description: homeDesc,
        source: 'src/components/HomePage.astro + src/i18n/ui.ts',
      })
    );

    rows.push(
      withMetrics({
        type: 'blog_index',
        locale,
        route: blogRoute,
        title: blogTitleBase ? `${blogTitleBase} | GetMediaTools` : '',
        description: blogDesc,
        source: 'src/components/BlogIndexPage.astro + src/i18n/ui.ts',
      })
    );
  }

  // English cluster pages (from taxonomy constants)
  for (const cluster of clusters) {
    rows.push(
      withMetrics({
        type: 'blog_cluster',
        locale: 'en',
        route: `/blog/${cluster.id}/`,
        title: `${cluster.title} | GetMediaTools Blog`,
        description: cluster.description,
        source: 'src/pages/blog/[cluster].astro + src/lib/blog-taxonomy.ts',
      })
    );
  }

  // Localized cluster pages (from phase1-extra)
  const clusterIds = [
    'anonymous-viewing',
    'audio-conversion',
    'downloading-media',
    'social-media-tools',
    'creator-assets',
    'creator-growth',
    'social-commerce',
    'general',
  ];
  for (const locale of Object.keys(phase1).sort()) {
    if (locale === 'en') continue;
    for (const clusterId of clusterIds) {
      const clusterName = phase1[locale][`blog.cluster.${clusterId}`] || '';
      const clusterDesc = phase1[locale][`blog.cluster_desc.${clusterId}`] || '';
      rows.push(
        withMetrics({
          type: 'blog_cluster',
          locale,
          route: `/${locale}/blog/${clusterId}/`,
          title: clusterName ? `${clusterName} | GetMediaTools Blog` : '',
          description: clusterDesc,
          source: 'src/pages/[lang]/blog/[cluster].astro + src/i18n/phase1-extra.ts',
        })
      );
    }
  }

  // Blog post rows from markdown frontmatter
  for (const row of collectBlogRows()) {
    rows.push(withMetrics(row));
  }

  // 404 page + test page + redirect template page
  rows.push(
    withMetrics({
      type: 'static_page',
      locale: 'en',
      route: '/404/',
      title: 'Page Not Found | MediaTools',
      description:
        "The page you're looking for doesn't exist. Browse our free tools for downloading videos, extracting audio, and more.",
      source: 'src/pages/404.astro',
    })
  );

  rows.push(
    withMetrics({
      type: 'static_page',
      locale: 'en',
      route: '/erland-test/',
      title: 'Erland UI Test',
      description: 'Testing the Erland UI blocks.',
      source: 'src/pages/erland-test.astro',
    })
  );

  rows.push(
    withMetrics({
      type: 'redirect_template',
      locale: 'en',
      route: '/en/*',
      title: 'Redirecting...',
      description: '(none)',
      source: 'src/pages/en/[...slug].astro',
    })
  );

  // Legacy tool meta strings in i18n (currently not tied to route templates in src/pages)
  const legacyPrefixToRoute = {
    tt: '/tiktok-downloader/',
    fb: '/facebook-downloader/',
    tw: '/twitter-downloader/',
    mp3: '/video-to-mp3/',
    ts: '/tiktok-sound-downloader/',
    tg: '/thumbnail-grabber/',
  };
  for (const locale of Object.keys(ui).sort()) {
    for (const [prefix, route] of Object.entries(legacyPrefixToRoute)) {
      const title = ui[locale][`${prefix}.meta.title`] || '';
      const description = ui[locale][`${prefix}.meta.desc`] || '';
      if (!title && !description) continue;
      const localizedRoute = locale === 'en' ? route : `/${locale}${route}`;
      rows.push(
        withMetrics({
          type: 'legacy_tool_meta_string',
          locale,
          route: localizedRoute,
          title,
          description,
          source: 'src/i18n/ui.ts (legacy tool meta key)',
        })
      );
    }
  }

  const finalRows = rows.sort((a, b) =>
    [a.type, a.locale, a.route].join('|').localeCompare([b.type, b.locale, b.route].join('|'))
  );

  ensureDir(REPORT_DIR);
  const csvPath = path.join(REPORT_DIR, `metadata-inventory-${TODAY}.csv`);
  const summaryPath = path.join(REPORT_DIR, `metadata-summary-${TODAY}.md`);
  writeCsv(csvPath, finalRows);
  writeSummary(summaryPath, finalRows);

  console.log(`Wrote ${finalRows.length} rows`);
  console.log(`CSV: ${path.relative(ROOT, csvPath)}`);
  console.log(`Summary: ${path.relative(ROOT, summaryPath)}`);
}

main();
