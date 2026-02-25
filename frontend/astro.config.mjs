import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
    site: 'https://getmediatools.com',
    i18n: {
        defaultLocale: "en",
        locales: ["en", "es", "tr"],
        routing: {
            prefixDefaultLocale: false
        }
    },
    redirects: {
        // Twitter GIF Consolidation
        '/blog/how-to-download-twitter-gifs-2026/': '/blog/5-best-ways-to-save-twitter-videos/',
        '/blog/how-to-download-twitter-gifs/': '/blog/5-best-ways-to-save-twitter-videos/',
        '/es/blog/how-to-download-twitter-gifs-2026/': '/es/blog/5-best-ways-to-save-twitter-videos/',
        '/es/blog/how-to-download-twitter-gifs/': '/es/blog/5-best-ways-to-save-twitter-videos/',

        // TikTok Thumbnail Consolidation
        '/blog/tiktok-thumbnail-download/': '/blog/how-to-download-tiktok-thumbnails/',
        '/es/blog/tiktok-thumbnail-download/': '/es/blog/how-to-download-tiktok-thumbnails/',
    },
    integrations: [
        react(),
        tailwind({
            applyBaseStyles: false,
        }),
    ],
    output: 'static',
    vite: {
        server: {
            fs: {
                strict: false,
            },
        },
    },
});
