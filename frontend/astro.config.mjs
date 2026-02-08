import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://getmediatools.com',
    integrations: [
        react(),
        tailwind({
            applyBaseStyles: false,
        }),
        sitemap({
            // Explicitly list all pages to avoid undefined routes issue
            customPages: [
                'https://getmediatools.com/',
                'https://getmediatools.com/tiktok-downloader',
                'https://getmediatools.com/twitter-downloader',
                'https://getmediatools.com/instagram-downloader',
                'https://getmediatools.com/video-to-mp3',
                'https://getmediatools.com/thumbnail-grabber',
                'https://getmediatools.com/transcript',
                'https://getmediatools.com/blog',
            ],
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
