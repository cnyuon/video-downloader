import { getCollection } from 'astro:content';

const BASE_URL = 'https://getmediatools.com';

const staticPages = [
    '/',
    '/es/',
    '/tiktok-downloader/',
    '/es/tiktok-downloader/',
    '/facebook-downloader/',
    '/es/facebook-downloader/',
    '/twitter-downloader/',
    '/es/twitter-downloader/',
    '/video-to-mp3/',
    '/es/video-to-mp3/',
    '/thumbnail-grabber/',
    '/es/thumbnail-grabber/',
    '/tiktok-sound-downloader/',
    '/es/tiktok-sound-downloader/',
    '/blog/',
    '/es/blog/',
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

    // All English posts ALSO have an expected Spanish route
    const esPostsUrls = allPosts
        .filter((post: any) => post.slug.startsWith('en/'))
        .map((post: any) => ({
            url: `/es/blog/${post.slug.replace('en/', '')}/`,
            lastmod: (post.data.updatedDate || post.data.pubDate).toISOString(),
            isBlog: true
        }));

    // Use a fixed date for static pages — update this value when tool pages genuinely change
    const staticPagesUrls = staticPages.map(url => ({
        url,
        lastmod: '2026-02-24T00:00:00.000Z',
        isBlog: false
    }));

    const allUrls = [...staticPagesUrls, ...enPostsUrls, ...esPostsUrls];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allUrls
            .map(
                (page) => `<url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.url === '/' || page.url === '/es/' ? 'daily' : page.isBlog ? 'monthly' : 'weekly'}</changefreq>
    <priority>${page.url === '/' || page.url === '/es/' ? '1.0' : page.isBlog ? '0.7' : '0.9'}</priority>
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
