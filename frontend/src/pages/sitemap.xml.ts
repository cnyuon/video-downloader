import { getCollection } from 'astro:content';

const BASE_URL = 'https://getmediatools.com';

// All supported languages (add new ones here)
const LANGS = ['es', 'tr', 'pt', 'fr', 'de', 'ja', 'ko', 'ar', 'hi'];

const staticPages = [
    '/',
    '/blog/',
    '/tiktok-downloader/',
    '/facebook-downloader/',
    '/twitter-downloader/',
    '/video-to-mp3/',
    '/thumbnail-grabber/',
    '/tiktok-sound-downloader/',
    // Generate all localized static pages
    ...LANGS.flatMap(lang => [
        `/${lang}/`,
        `/${lang}/tiktok-downloader/`,
        `/${lang}/facebook-downloader/`,
        `/${lang}/twitter-downloader/`,
        `/${lang}/video-to-mp3/`,
        `/${lang}/thumbnail-grabber/`,
        `/${lang}/tiktok-sound-downloader/`,
        `/${lang}/blog/`,
    ]),
];

export async function GET() {
    const allPosts = await getCollection('blog');

    // Get all baseline "en" posts and form their English URLs with their authentic dates
    const enPostsUrls = allPosts
        .filter((post: any) => post.slug.startsWith('en/'))
        .map((post: any) => ({
            url: `/blog/${post.slug.replace('en/', '')}/`,
            lastmod: (post.data.updatedDate || post.data.pubDate).toISOString(),
            isBlog: true
        }));

    // All English posts ALSO have localized routes
    const localizedPostsUrls = LANGS.flatMap(lang =>
        allPosts
            .filter((post: any) => post.slug.startsWith('en/'))
            .map((post: any) => ({
                url: `/${lang}/blog/${post.slug.replace('en/', '')}/`,
                lastmod: (post.data.updatedDate || post.data.pubDate).toISOString(),
                isBlog: true
            }))
    );

    // Use a fixed date for static pages — update this value when tool pages genuinely change
    const staticPagesUrls = staticPages.map(url => ({
        url,
        lastmod: '2026-02-24T00:00:00.000Z',
        isBlog: false
    }));

    const allUrls = [...staticPagesUrls, ...enPostsUrls, ...localizedPostsUrls];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allUrls
            .map(
                (page) => `<url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.url === '/' || page.url === '/es/' || page.url === '/tr/' || page.url === '/fr/' || page.url === '/hi/' || page.url === '/ar/' || page.url === '/ko/' || page.url === '/ja/' || page.url === '/de/' || page.url === '/pt/' ? 'daily' : page.isBlog ? 'monthly' : 'weekly'}</changefreq>
    <priority>${page.url === '/' || page.url === '/es/' || page.url === '/tr/' || page.url === '/fr/' || page.url === '/hi/' || page.url === '/ar/' || page.url === '/ko/' || page.url === '/ja/' || page.url === '/de/' || page.url === '/pt/' ? '1.0' : page.isBlog ? '0.7' : '0.9'}</priority>
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
