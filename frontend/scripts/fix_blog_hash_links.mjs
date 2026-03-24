import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import GithubSlugger from 'github-slugger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const blogRoot = path.resolve(__dirname, '../src/content/blog');
const reportPath = path.resolve(__dirname, '../reports/blog-hash-link-fix-report.json');

const STOP_TOKENS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'for',
  'of',
  'in',
  'on',
  'with',
  'without',
  'best',
  'top',
  'quick',
  'comparison',
  'method',
  'part',
  'step',
  'guide',
  'faq',
  'frequently',
  'asked',
  'questions',
  'how',
  'why',
]);

function normalizeSlug(value) {
  return value.replace(/^-+/, '').replace(/-+$/, '');
}

function splitFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return { frontmatter: '', body: raw };
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: '', body: raw };
  return {
    frontmatter: raw.slice(0, end + 5),
    body: raw.slice(end + 5),
  };
}

function stripInlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, ' and ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function slugifyHeading(text) {
  const clean = stripInlineMarkdown(text);
  if (!clean) return '';
  return normalizeSlug(new GithubSlugger().slug(clean));
}

function extractHeadings(body) {
  const lines = body.split(/\r?\n/);
  let inCodeBlock = false;
  const slugger = new GithubSlugger();
  const headings = [];

  for (const line of lines) {
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,6})\s+(.+)$/);
    if (!match) continue;

    const depth = match[1].length;
    const text = match[2].trim();
    const base = stripInlineMarkdown(text);
    let slug = normalizeSlug(slugger.slug(base));
    if (!slug) continue;

    headings.push({ depth, text, slug });
  }

  return headings;
}

function tokenList(value) {
  return value
    .toLowerCase()
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((token) => token.length > 2 && !STOP_TOKENS.has(token));
}

function chooseBestByTokenOverlap(candidates, tokens) {
  if (tokens.length === 0) return null;

  const ranked = candidates
    .map((candidate) => ({
      slug: candidate.slug,
      score: tokens.reduce((sum, token) => sum + (candidate.slug.includes(token) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  if (ranked[0].score <= 0) return null;
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) return null;
  return ranked[0].slug;
}

function resolveHashTarget(oldHash, linkText, headings) {
  const headingSet = new Set(headings.map((heading) => heading.slug));
  const decodedHash = decodeURIComponent(oldHash);

  if (headingSet.has(oldHash)) return oldHash;
  if (headingSet.has(decodedHash)) return decodedHash;

  const textSlug = slugifyHeading(linkText);
  if (textSlug && headingSet.has(textSlug)) return textSlug;

  const hashWithText = `${linkText} ${oldHash}`;
  const numberMatch = hashWithText.match(/#?(\d{1,2})/);
  if (numberMatch) {
    const numberPrefix = `${numberMatch[1]}-`;
    const byNumber = headings.filter(
      (heading) => heading.slug.startsWith(numberPrefix) || heading.text.startsWith(`#${numberMatch[1]}`),
    );
    if (byNumber.length === 1) return byNumber[0].slug;

    const byNumberTokens = tokenList(hashWithText);
    const byNumberBest = chooseBestByTokenOverlap(byNumber, byNumberTokens);
    if (byNumberBest) return byNumberBest;
  }

  const allTokens = tokenList(hashWithText);
  const bestGlobal = chooseBestByTokenOverlap(headings, allTokens);
  if (bestGlobal) return bestGlobal;

  return null;
}

async function walkMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkMarkdownFiles(full)));
      continue;
    }
    if (entry.isFile() && full.endsWith('.md')) out.push(full);
  }

  return out;
}

function replaceHashLinks(body, headings) {
  const replacements = [];
  const hashLinkRegex = /\[([^\]]+)\]\(#([^) \t]+)\)/g;
  const updatedBody = body.replace(hashLinkRegex, (match, linkText, oldHash) => {
    const target = resolveHashTarget(oldHash, linkText, headings);
    if (!target || target === oldHash) return match;

    replacements.push({ from: oldHash, to: target, text: linkText });
    return `[${linkText}](#${target})`;
  });

  return { updatedBody, replacements };
}

async function main() {
  const files = await walkMarkdownFiles(blogRoot);
  const report = {
    generatedAt: new Date().toISOString(),
    totalFiles: files.length,
    touchedFiles: 0,
    totalReplacements: 0,
    files: [],
  };

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { frontmatter, body } = splitFrontmatter(raw);
    const headings = extractHeadings(body);
    const { updatedBody, replacements } = replaceHashLinks(body, headings);

    if (replacements.length === 0) continue;

    report.touchedFiles += 1;
    report.totalReplacements += replacements.length;
    report.files.push({
      file: path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/'),
      replacements,
    });

    await fs.writeFile(file, `${frontmatter}${updatedBody}`, 'utf8');
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Blog hash-link fix report: ${reportPath}`);
  console.log(`Files updated: ${report.touchedFiles}`);
  console.log(`Links rewritten: ${report.totalReplacements}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
