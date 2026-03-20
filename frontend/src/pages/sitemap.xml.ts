import { getCollection } from 'astro:content';

const BASE_URL = 'https://getmediatools.com';
const LOCALES = ['en', 'es', 'tr', 'pt', 'fr', 'de', 'ja', 'ko', 'ar', 'hi'];
const NON_DEFAULT_LOCALES = LOCALES.filter((locale) => locale !== 'en');
const STATIC_BASE_PATHS = [
    '/',
    '/blog/',
    '/tiktok-downloader/',
    '/facebook-downloader/',
    '/twitter-downloader/',
    '/video-to-mp3/',
    '/thumbnail-grabber/',
    '/tiktok-sound-downloader/',
    '/instagram-downloader/',
];

const staticPages = [
    ...STATIC_BASE_PATHS,
    ...NON_DEFAULT_LOCALES.flatMap((locale) =>
        STATIC_BASE_PATHS.map((path) => buildLocalizedPath(path, locale))
    ),
];

function ensureTrailingSlash(path: string): string {
    const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
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

export async function GET() {
    const allPosts = await getCollection('blog');
    const enPosts = allPosts.filter((post: any) => post.slug.startsWith('en/'));

    // Get all baseline "en" posts and form their English URLs with their authentic dates
    const enPostsUrls = enPosts.map((post: any) => ({
            url: `/blog/${post.slug.replace('en/', '')}/`,
            lastmod: (post.data.updatedDate || post.data.pubDate).toISOString(),
            isBlog: true,
        }));

    // All English posts ALSO have localized routes
    const localizedPostsUrls = NON_DEFAULT_LOCALES.flatMap((locale) =>
        enPosts.map((post: any) => ({
                url: `/${locale}/blog/${post.slug.replace('en/', '')}/`,
                lastmod: (post.data.updatedDate || post.data.pubDate).toISOString(),
                isBlog: true,
            }))
    );

    // Use a fixed date for static pages — update this value when tool pages genuinely change
    const staticPagesUrls = staticPages.map(url => ({
        url,
        lastmod: '2026-03-02T00:00:00.000Z',
        isBlog: false,
    }));

    const allUrls = [...staticPagesUrls, ...enPostsUrls, ...localizedPostsUrls];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${allUrls
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
