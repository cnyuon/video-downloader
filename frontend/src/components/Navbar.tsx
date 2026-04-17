/**
 * Navbar - Editorial blog navigation with topics + locale/theme controls.
 */
import { useEffect, useRef, useState } from 'react';

import { getPhase1Text } from '../i18n/phase1-extra';
import { BLOG_CLUSTERS } from '../lib/blog-taxonomy';

interface NavbarProps {
    currentPage: string;
    lang: string;
}

const LOCALES = ['en', 'es', 'tr', 'pt', 'fr', 'de', 'ja', 'ko', 'ar', 'hi'] as const;
type LocaleCode = (typeof LOCALES)[number];

interface IconProps {
    className?: string;
}

function IconChevronDown({ className }: IconProps) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function IconSun({ className }: IconProps) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
        </svg>
    );
}

function IconMoon({ className }: IconProps) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" />
        </svg>
    );
}

function IconMenu({ className }: IconProps) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
    );
}

function IconX({ className }: IconProps) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

export default function Navbar({ currentPage, lang }: NavbarProps) {
    const locale = LOCALES.includes(lang as LocaleCode) ? (lang as LocaleCode) : 'en';
    const tx = (key: Parameters<typeof getPhase1Text>[1]) => getPhase1Text(locale, key);
    const readStoredTheme = (): string | null => {
        if (typeof window === 'undefined') return null;
        const storage = window.localStorage as Partial<Storage> | undefined;
        if (!storage || typeof storage.getItem !== 'function') return null;
        try {
            return storage.getItem('theme');
        } catch {
            return null;
        }
    };
    const persistTheme = (value: 'dark' | 'light') => {
        if (typeof window === 'undefined') return;
        const storage = window.localStorage as Partial<Storage> | undefined;
        if (!storage || typeof storage.setItem !== 'function') return;
        try {
            storage.setItem('theme', value);
        } catch {
            // Ignore storage failures in restricted contexts.
        }
    };

    const getHref = (path: string) => {
        const normalized = path === '/' ? '/' : (path.endsWith('/') ? path : `${path}/`);
        return locale === 'en' ? normalized : `/${locale}${normalized === '/' ? '/' : normalized}`;
    };

    const BLOG_CLUSTER_IDS = new Set(BLOG_CLUSTERS.map((cluster) => cluster.id));

    const isBlogPostPath = (localeAgnosticPath: string) => {
        const match = /^\/blog\/([^/]+)\/$/.exec(localeAgnosticPath);
        if (!match) return false;
        const slug = match[1];
        return !BLOG_CLUSTER_IDS.has(slug as (typeof BLOG_CLUSTERS)[number]['id']);
    };

    const routeExists = async (pathToCheck: string) => {
        const checkPath = pathToCheck.endsWith('/') ? pathToCheck : `${pathToCheck}/`;

        try {
            const headRes = await fetch(checkPath, {
                method: 'HEAD',
                cache: 'no-store',
                credentials: 'same-origin',
            });

            if (headRes.ok) return true;
            if (headRes.status !== 405 && headRes.status !== 501) return false;
        } catch {
            // Fallback to GET below.
        }

        try {
            const getRes = await fetch(checkPath, {
                method: 'GET',
                cache: 'no-store',
                credentials: 'same-origin',
            });
            if (!getRes.ok) return false;

            const finalPath = new URL(getRes.url, window.location.origin).pathname;
            return !/^\/404(?:\.html)?\/?$/.test(finalPath);
        } catch {
            return false;
        }
    };

    const switchLanguage = async (nextLang: string) => {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);

        let localeAgnosticPath = path;
        if (segments.length > 0 && LOCALES.includes(segments[0] as any)) {
            localeAgnosticPath = `/${segments.slice(1).join('/')}`;
        }
        if (!localeAgnosticPath || localeAgnosticPath === '//') localeAgnosticPath = '/';
        if (!localeAgnosticPath.endsWith('/')) localeAgnosticPath += '/';

        const target = nextLang === 'en'
            ? localeAgnosticPath
            : `/${nextLang}${localeAgnosticPath === '/' ? '/' : localeAgnosticPath}`;

        // For blog post detail pages, only navigate to translated slug if it exists.
        // Otherwise, fall back to the selected locale's blog index to avoid 404s
        // for new English-only posts.
        if (nextLang !== 'en' && isBlogPostPath(localeAgnosticPath)) {
            const exists = await routeExists(target);
            const fallback = `/${nextLang}/blog/`;
            window.location.href = exists ? target : fallback;
            return;
        }

        window.location.href = target;
    };

    const isBlogActive = currentPage === 'blog';
    const isHomeActive = currentPage === 'home';

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [desktopTopicsOpen, setDesktopTopicsOpen] = useState(false);
    const closeMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const stored = readStoredTheme();
        if (stored === 'dark') {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    useEffect(() => {
        return () => {
            if (closeMenuTimerRef.current) {
                clearTimeout(closeMenuTimerRef.current);
            }
        };
    }, []);

    const openTopicsMenu = () => {
        if (closeMenuTimerRef.current) {
            clearTimeout(closeMenuTimerRef.current);
            closeMenuTimerRef.current = null;
        }
        setDesktopTopicsOpen(true);
    };

    const closeTopicsMenu = () => {
        if (closeMenuTimerRef.current) {
            clearTimeout(closeMenuTimerRef.current);
        }
        closeMenuTimerRef.current = setTimeout(() => {
            setDesktopTopicsOpen(false);
            closeMenuTimerRef.current = null;
        }, 120);
    };

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
            persistTheme('dark');
        } else {
            document.documentElement.classList.remove('dark');
            persistTheme('light');
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full transition-all duration-300 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800/80">
            <div className="container flex h-16 items-center justify-between mx-auto px-4 max-w-5xl">
                <a href={getHref('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <img src="/logo.png" alt="GetMediaTools Logo" className="h-8 w-auto rounded-sm" />
                    <span className="font-garet font-black text-lg tracking-tight text-slate-900 dark:text-white hidden sm:block">GetMediaTools</span>
                </a>

                <nav className="hidden lg:flex items-center justify-end space-x-6 text-[13px] font-medium tracking-wide uppercase flex-1 ml-8 font-sans">
                    <a
                        href={getHref('/')}
                        className={`transition-colors duration-200 ${isHomeActive
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        Home
                    </a>

                    <a
                        href={getHref('/blog/')}
                        className={`transition-colors duration-200 ${isBlogActive
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        Blog
                    </a>

                    <div className="relative" onMouseEnter={openTopicsMenu} onMouseLeave={closeTopicsMenu}>
                        <button
                            type="button"
                            onFocus={openTopicsMenu}
                            onBlur={closeTopicsMenu}
                            aria-haspopup="menu"
                            aria-expanded={desktopTopicsOpen}
                            className={`inline-flex items-center gap-1 transition-colors duration-200 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase`}
                        >
                            TOPICS
                            <IconChevronDown className="h-3 w-3" />
                        </button>

                        <div
                            className={`absolute right-0 top-full pt-4 w-[240px] max-w-[calc(100vw-2rem)] transition-all duration-200 ${desktopTopicsOpen
                                ? 'opacity-100 pointer-events-auto translate-y-0'
                                : 'opacity-0 pointer-events-none translate-y-1'
                                }`}
                        >
                            <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg p-2">
                                <div className="flex flex-col">
                                    {BLOG_CLUSTERS.filter(c => c.id !== 'general').map((cluster) => (
                                        <a
                                            key={cluster.id}
                                            href={getHref(`/blog/${cluster.id}/`)}
                                            className="px-3 py-2 rounded text-[11px] font-bold tracking-widest uppercase font-sans text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white transition-colors"
                                        >
                                            {cluster.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center pl-6 ml-2 border-l border-slate-200 dark:border-slate-800 gap-3">
                        <div className="relative">
                            <select
                                value={locale}
                                onChange={(e) => switchLanguage(e.target.value)}
                                className="bg-transparent text-[13px] font-medium tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer focus:outline-none transition-colors appearance-none pr-4 uppercase relative z-10"
                                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '0.8em' }}
                                aria-label="Select language"
                            >
                                <option value="en" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">EN</option>
                                <option value="es" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">ES</option>
                                <option value="tr" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">TR</option>
                                <option value="pt" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">PT</option>
                                <option value="fr" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">FR</option>
                                <option value="de" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">DE</option>
                                <option value="ja" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">JA</option>
                                <option value="ko" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">KO</option>
                                <option value="ar" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">AR</option>
                                <option value="hi" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">HI</option>
                            </select>
                        </div>

                        <button
                            onClick={toggleDarkMode}
                            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? <IconSun className="h-[15px] w-[15px]" /> : <IconMoon className="h-[15px] w-[15px]" />}
                        </button>
                    </div>
                </nav>

                <div className="flex items-center gap-1 lg:hidden">
                    <div className="relative border border-slate-200 dark:border-slate-800 rounded-full bg-slate-50 dark:bg-slate-900 px-3 py-1.5 mr-1">
                        <select
                            value={locale}
                            onChange={(e) => switchLanguage(e.target.value)}
                            className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none appearance-none pr-4 relative uppercase tracking-wider"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '0.9em' }}
                        >
                            <option value="en" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">EN</option>
                            <option value="es" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">ES</option>
                            <option value="tr" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">TR</option>
                            <option value="pt" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">PT</option>
                            <option value="fr" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">FR</option>
                            <option value="de" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">DE</option>
                            <option value="ja" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">JA</option>
                            <option value="ko" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">KO</option>
                            <option value="ar" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">AR</option>
                            <option value="hi" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">HI</option>
                        </select>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        aria-label="Toggle dark mode"
                    >
                        {darkMode ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 ml-1"
                    >
                        {mobileMenuOpen ? <IconX className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl absolute w-full left-0">
                    <nav className="container mx-auto px-4 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
                        <a
                            href={getHref('/')}
                            className={`block px-2 py-3 text-lg transition-colors ${isHomeActive
                                ? 'text-slate-900 dark:text-white font-black'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Home
                        </a>

                        <a
                            href={getHref('/blog/')}
                            className={`block px-2 py-3 text-lg transition-colors ${isBlogActive
                                ? 'text-slate-900 dark:text-white font-black'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Blog
                        </a>

                        <div className="px-4 pt-2">
                            <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">Topics</p>
                            <div className="space-y-1">
                                {BLOG_CLUSTERS.map((cluster) => (
                                    <a key={cluster.id} href={getHref(`/blog/${cluster.id}/`)} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white">
                                        <span className="text-base">{(cluster as any).icon || '📚'}</span>
                                        {cluster.title}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
