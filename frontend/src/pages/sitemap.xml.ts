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

    // Get all baseline "en" posts and form their English URLs
    const enPostsUrls = allPosts
        .filter((post: any) => post.slug.startsWith('en/'))
        .map((post: any) => `/blog/${post.slug.replace('en/', '')}/`);

    // All English posts ALSO have an expected Spanish route (due to fallback or native translation)
    const esPostsUrls = allPosts
        .filter((post: any) => post.slug.startsWith('en/'))
        .map((post: any) => `/es/blog/${post.slug.replace('en/', '')}/`);

    const allUrls = [...staticPages, ...enPostsUrls, ...esPostsUrls];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allUrls
            .map(
                (url) => `<url>
    <loc>${BASE_URL}${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${url === '/' || url === '/es/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${url === '/' || url === '/es/' ? '1.0' : '0.8'}</priority>
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
