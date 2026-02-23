import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
    site: 'https://getmediatools.com',
    i18n: {
        defaultLocale: "en",
        locales: ["en", "es"],
        routing: {
            prefixDefaultLocale: false
        }
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
