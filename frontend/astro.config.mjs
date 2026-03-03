import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// Generate redirect rules for all locales programmatically
const REDIRECT_LOCALES = ['es', 'tr', 'pt', 'fr', 'de', 'ja', 'ko', 'ar', 'hi'];
const REDIRECT_RULES = {
    // Twitter GIF Consolidation
    '/blog/how-to-download-twitter-gifs-2026/': '/blog/5-best-ways-to-save-twitter-videos/',
    '/blog/how-to-download-twitter-gifs/': '/blog/5-best-ways-to-save-twitter-videos/',
    // TikTok Thumbnail Consolidation
    '/blog/tiktok-thumbnail-download/': '/blog/how-to-download-tiktok-thumbnails/',
};

// Build the full redirects map: English root + all locales
const allRedirects = { ...REDIRECT_RULES };
for (const locale of REDIRECT_LOCALES) {
    for (const [from, to] of Object.entries(REDIRECT_RULES)) {
        allRedirects[`/${locale}${from}`] = `/${locale}${to}`;
    }
}

export default defineConfig({
    site: 'https://getmediatools.com',
    trailingSlash: 'always',
    i18n: {
        defaultLocale: "en",
        locales: ["en", "es", "tr", "pt", "fr", "de", "ja", "ko", "ar", "hi"],
        routing: {
            prefixDefaultLocale: false
        }
    },
    redirects: allRedirects,
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
