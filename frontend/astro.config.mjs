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
        sitemap(),
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
