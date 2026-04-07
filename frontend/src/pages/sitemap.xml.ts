import { getCollection } from 'astro:content';
import fs from 'fs/promises';
import path from 'path';
import { BLOG_CLUSTERS } from '../lib/blog-taxonomy';

const BASE_URL = 'https://getmediatools.com';
const LOCALES = ['en', 'es', 'tr', 'pt', 'fr', 'de', 'ja', 'ko', 'ar', 'hi'];
const NON_DEFAULT_LOCALES = LOCALES.filter((locale) => locale !== 'en');
const BUILD_FALLBACK_LASTMOD = new Date().toISOString();
const SOURCE_CACHE = new Map<string, string>();

const STATIC_BASE_PATHS = [
    '/',
    '/blog/',
];

const CLUSTER_BASE_PATHS = BLOG_CLUSTERS.map((cluster) => `/blog/${cluster.id}/`);

const staticPages = [
    ...STATIC_BASE_PATHS,
    ...CLUSTER_BASE_PATHS,
    ...NON_DEFAULT_LOCALES.flatMap((locale) =>
        [...STATIC_BASE_PATHS, ...CLUSTER_BASE_PATHS].map((path) => buildLocalizedPath(path, locale))
    ),
];

function ensureTrailingSlash(path: string): string {
    const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function toIsoDate(date: Date): string {
    return date.toISOString();
}

function extractLocaleAndBasePath(urlPath: string): { locale: string; basePath: string } {
    const normalizedPath = ensureTrailingSlash(urlPath);
    const pathSegments = normalizedPath.split('/').filter(Boolean);
    const maybeLocale = pathSegments[0];

    if (maybeLocale && NON_DEFAULT_LOCALES.includes(maybeLocale)) {
        const base = pathSegments.slice(1).join('/');
        return { locale: maybeLocale, basePath: base ? `/${base}/` : '/' };
    }

    return { locale: 'en', basePath: normalizedPath };
}

function buildLocalizedPath(basePath: string, locale: string): string {
    const normalizedBasePath = ensureTrailingSlash(basePath);
    if (locale === 'en') return normalizedBasePath;
    if (normalizedBasePath === '/') return `/${locale}/`;
    return `/${locale}${normalizedBasePath}`;
}

function stripLocalePrefix(path: string): string {
    const normalizedPath = ensureTrailingSlash(path);
    const pathSegments = normalizedPath.split('/').filter(Boolean);
    const maybeLocale = pathSegments[0];

    if (maybeLocale && NON_DEFAULT_LOCALES.includes(maybeLocale)) {
        const localeAgnosticPath = pathSegments.slice(1).join('/');
        return localeAgnosticPath ? `/${localeAgnosticPath}/` : '/';
    }

    return normalizedPath;
}

function buildAlternateLinks(url: string): string {
    const basePath = stripLocalePrefix(url);
    const localeAlternates = LOCALES.map((locale) => {
        const href = `${BASE_URL}${buildLocalizedPath(basePath, locale)}`;
        return `    <xhtml:link rel="alternate" hreflang="${locale}" href="${href}" />`;
    });

    const xDefaultHref = `${BASE_URL}${buildLocalizedPath(basePath, 'en')}`;
    localeAlternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultHref}" />`
    );

    return localeAlternates.join('\n');
}

function isLocaleHomepage(url: string): boolean {
    const localeHomepages = ['/', ...NON_DEFAULT_LOCALES.map((locale) => `/${locale}/`)];
    return localeHomepages.includes(url);
}

const SRC_ROOT = path.resolve('src');
const CLUSTER_IDS = new Set(BLOG_CLUSTERS.map((cluster) => cluster.id));

function getSourceCandidatesForRoute(urlPath: string): string[] {
    const { locale, basePath } = extractLocaleAndBasePath(urlPath);
    const common = ['components/Navbar.tsx', 'components/Footer.astro', 'layouts/Layout.astro'];

    if (basePath === '/') {
        return [
            locale === 'en' ? 'pages/index.astro' : `pages/${locale}/index.astro`,
            'components/HomePage.astro',
            'i18n/ui.ts',
            ...common,
        ];
    }

    if (basePath === '/blog/') {
        return [
            locale === 'en' ? 'pages/blog/index.astro' : `pages/${locale}/blog/index.astro`,
            'components/BlogIndexPage.astro',
            'lib/blog-taxonomy.ts',
            'i18n/ui.ts',
            'i18n/phase1-extra.ts',
            ...common,
        ];
    }

    const clusterMatch = basePath.replace(/^\/blog\/|\/$/, '');
    if (CLUSTER_IDS.has(clusterMatch as any)) {
        return [
            locale === 'en' ? 'pages/blog/[cluster].astro' : 'pages/[lang]/blog/[cluster].astro',
            'lib/blog-taxonomy.ts',
            'i18n/phase1-extra.ts',
            ...common,
        ];
    }

    return common;
}

async function getLatestMtimeIso(relativePaths: string[]): Promise<string | null> {
    let maxMtimeMs = 0;

    for (const relPath of relativePaths) {
        const absPath = path.join(SRC_ROOT, relPath);
        try {
            const stats = await fs.stat(absPath);
            if (stats.mtimeMs > maxMtimeMs) {
                maxMtimeMs = stats.mtimeMs;
            }
        } catch {
            // Ignore missing candidates; templates like [lang] may be dynamic route holders.
        }
    }

    return maxMtimeMs > 0 ? new Date(maxMtimeMs).toISOString() : null;
}

async function getRouteLastmodIso(urlPath: string): Promise<string> {
    if (SOURCE_CACHE.has(urlPath)) {
        return SOURCE_CACHE.get(urlPath)!;
    }

    const candidates = getSourceCandidatesForRoute(urlPath);
    const lastmod = await getLatestMtimeIso(candidates);

    const resolved = lastmod || BUILD_FALLBACK_LASTMOD;
    SOURCE_CACHE.set(urlPath, resolved);
    return resolved;
}

export async function GET() {
    const allPosts = await getCollection('blog');

    const enPosts = allPosts.filter((post: any) => post.slug.startsWith('en/'));
    const postBySlug = new Map(allPosts.map((post: any) => [post.slug, post]));

    const enPostsUrls = enPosts.map((post: any) => ({
            url: `/blog/${post.slug.replace('en/', '')}/`,
            lastmod: toIsoDate(post.data.updatedDate || post.data.pubDate),
            isBlog: true,
        }));

    const localizedPostsUrls = NON_DEFAULT_LOCALES.flatMap((locale) =>
        enPosts.map((enPost: any) => {
            const normalizedSlug = enPost.slug.replace(/^en\//, '');
            const localizedPost = postBySlug.get(`${locale}/${normalizedSlug}`);
            const sourcePost = localizedPost || enPost;

            return {
                url: `/${locale}/blog/${normalizedSlug}/`,
                lastmod: toIsoDate(sourcePost.data.updatedDate || sourcePost.data.pubDate),
                isBlog: true,
            };
        })
    );

    const staticPagesUrls = await Promise.all(staticPages.map(async (url) => ({
        url,
        lastmod: await getRouteLastmodIso(url),
        isBlog: false,
    })));

    const allUrls = [...staticPagesUrls, ...enPostsUrls, ...localizedPostsUrls];
    const uniqueUrls = Array.from(new Map(allUrls.map((entry) => [entry.url, entry])).values());

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${uniqueUrls
            .map(
                (page) => `<url>
    <loc>${BASE_URL}${page.url}</loc>
${buildAlternateLinks(page.url)}
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${isLocaleHomepage(page.url) ? 'daily' : page.isBlog ? 'monthly' : 'weekly'}</changefreq>
    <priority>${isLocaleHomepage(page.url) ? '1.0' : page.isBlog ? '0.7' : '0.9'}</priority>
  </url>`
            )
            .join('\n')}
</urlset>`;

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}
