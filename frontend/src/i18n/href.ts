import { ui } from './ui';

/**
 * Centralized locale-aware URL builder. 
 * SINGLE SOURCE OF TRUTH for all internal links across the entire site.
 * 
 * @param path - The locale-agnostic path (e.g., '/tiktok-downloader/', '/blog/')
 * @param lang - The current locale code (e.g., 'en', 'es', 'ja')
 * @returns The correctly prefixed URL with trailing slash
 * 
 * Examples:
 *   getLocalizedHref('/', 'en')               → '/'
 *   getLocalizedHref('/', 'es')               → '/es/'
 *   getLocalizedHref('/tiktok-downloader/', 'en')  → '/tiktok-downloader/'
 *   getLocalizedHref('/tiktok-downloader/', 'es')  → '/es/tiktok-downloader/'
 *   getLocalizedHref('/blog/my-post/', 'ja')       → '/ja/blog/my-post/'
 */
export function getLocalizedHref(path: string, lang: keyof typeof ui): string {
    // Normalize: strip leading/trailing slashes, then re-add
    const stripped = path.replace(/^\/|\/$/g, '');
    const normalized = stripped ? `/${stripped}/` : '/';

    // English = default locale, no prefix
    if (lang === 'en') return normalized;

    // Other locales get /{lang}/ prefix
    if (normalized === '/') return `/${lang}/`;
    return `/${lang}${normalized}`;
}
