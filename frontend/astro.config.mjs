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

const INTERNAL_HOSTS = new Set(['getmediatools.com', 'www.getmediatools.com']);

function isExternalHref(href) {
    if (typeof href !== 'string' || href.length === 0) return false;
    if (href.startsWith('#') || href.startsWith('/')) return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (!/^https?:\/\//i.test(href) && !href.startsWith('//')) return false;

    try {
        const parsed = new URL(href, 'https://getmediatools.com');
        return !INTERNAL_HOSTS.has(parsed.hostname);
    } catch {
        return false;
    }
}

function rehypeNofollowExternalLinks() {
    return (tree) => {
        const visit = (node) => {
            if (!node || typeof node !== 'object') return;

            if (node.type === 'element' && node.tagName === 'a') {
                const props = node.properties ?? (node.properties = {});
                const href = Array.isArray(props.href) ? props.href[0] : props.href;

                if (isExternalHref(href)) {
                    const rel = new Set();
                    const existing = props.rel;

                    if (Array.isArray(existing)) {
                        for (const value of existing) {
                            String(value)
                                .split(/\s+/)
                                .filter(Boolean)
                                .forEach((token) => rel.add(token));
                        }
                    } else if (typeof existing === 'string') {
                        existing
                            .split(/\s+/)
                            .filter(Boolean)
                            .forEach((token) => rel.add(token));
                    }

                    rel.add('nofollow');
                    rel.add('noopener');
                    rel.add('noreferrer');
                    props.rel = Array.from(rel).join(' ');
                }
            }

            if (Array.isArray(node.children)) {
                for (const child of node.children) visit(child);
            }
        };

        visit(tree);
    };
}

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
    markdown: {
        rehypePlugins: [rehypeNofollowExternalLinks],
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
