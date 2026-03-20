/**
 * Navbar - Main navigation with all features visible (desktop) and hamburger menu (mobile)
 * Includes dark/light mode toggle
 */
import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';

import { useTranslations } from '../i18n/utils';
import type { ui } from '../i18n/ui';

interface NavbarProps {
    currentPage: string;
    lang: keyof typeof ui;
}

interface NavItem {
    id: string;
    nameKey: keyof typeof ui['en'];
    href: string;
    disabled?: boolean;
}

export default function Navbar({ currentPage, lang }: NavbarProps) {
    const t = useTranslations(lang);

    // Always prefix hrefs with /lang so the router works consistently
    const getHref = (path: string) => {
        let href = lang === 'en' ? path : `/${lang}${path === '/' ? '/' : path}`;
        if (href.length > 1 && !href.endsWith('/')) {
            href += '/';
        }
        return href;
    };

    const navItems: NavItem[] = [
        { id: 'home', nameKey: 'nav.home', href: '/' },
        { id: 'video', nameKey: 'nav.tiktok', href: '/tiktok-downloader/' },
        { id: 'twitter', nameKey: 'nav.twitter', href: '/twitter-downloader/' },
        { id: 'facebook', nameKey: 'nav.facebook', href: '/facebook-downloader/' },
        { id: 'sound', nameKey: 'nav.sound', href: '/tiktok-sound-downloader/' },
        { id: 'audio', nameKey: 'nav.audio', href: '/video-to-mp3/' },
        { id: 'thumbnail', nameKey: 'nav.thumbnail', href: '/thumbnail-grabber/' },
        { id: 'blog', nameKey: 'nav.blog', href: '/blog/' },
    ];
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    // Initialize dark mode from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark') {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full transition-all duration-300 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50">
            <div className="container flex h-20 items-center justify-between mx-auto px-4 max-w-7xl">
                {/* Logo - Click to go home */}
                <a href={getHref('/')} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#405EDB] to-blue-600 flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">GetMediaTools</span>
                </a>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center justify-end space-x-1 text-sm font-bold flex-1 ml-8">
                    {navItems.map((item) => (
                        item.disabled ? (
                            <span
                                key={item.id}
                                className="px-4 py-2.5 rounded-full text-slate-400 cursor-not-allowed"
                                title="Coming soon"
                            >
                                {t(item.nameKey)}
                            </span>
                        ) : (
                            <a
                                key={item.id}
                                href={getHref(item.href)}
                                className={`px-4 py-2.5 rounded-full transition-all duration-300 ${currentPage === item.id
                                    ? 'bg-[#405EDB]/10 text-[#405EDB]'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                {t(item.nameKey)}
                            </a>
                        )
                    ))}

                    <div className="flex items-center pl-4 ml-2 border-l border-slate-200 dark:border-slate-800 gap-1">
                        {/* Language Switcher */}
                        <div className="relative">
                            <select
                                value={lang}
                                onChange={(e) => {
                                    const newLang = e.target.value;
                                    const path = window.location.pathname;
                                    let newPath = '';
                                    if (path.startsWith(`/${lang}`)) {
                                        newPath = `/${newLang}${path.substring(lang.length + 1)}`;
                                    } else {
                                        newPath = `/${newLang}${path === '/' ? '/' : path}`;
                                    }
                                    if (newPath.length > 1 && !newPath.endsWith('/')) {
                                        newPath += '/';
                                    }
                                    window.location.href = newPath;
                                }}
                                className="bg-transparent text-[13px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer focus:outline-none transition-colors appearance-none pr-5 py-2 uppercase tracking-widest relative z-10"
                                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 2px center', backgroundSize: '0.8em' }}
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

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                        </button>
                    </div>
                </nav>

                {/* Mobile: Theme toggle + Menu button */}
                <div className="flex items-center gap-1 lg:hidden">
                    <div className="relative border border-slate-200 dark:border-slate-800 rounded-full bg-slate-50 dark:bg-slate-900 px-3 py-1.5 mr-1">
                        <select
                            value={lang}
                            onChange={(e) => {
                                const newLang = e.target.value;
                                const path = window.location.pathname;
                                let newPath = '';
                                if (path.startsWith(`/${lang}`)) {
                                    newPath = `/${newLang}${path.substring(lang.length + 1)}`;
                                } else {
                                    newPath = `/${newLang}${path === '/' ? '/' : path}`;
                                }
                                if (newPath.length > 1 && !newPath.endsWith('/')) {
                                    newPath += '/';
                                }
                                window.location.href = newPath;
                            }}
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
                        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 ml-1"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl absolute w-full left-0">
                    <nav className="container mx-auto px-4 py-4 space-y-2 max-h-[70vh] overflow-y-auto">
                        {navItems.map((item) => (
                            item.disabled ? (
                                <span
                                    key={item.id}
                                    className="block px-4 py-3 rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed"
                                >
                                    {t(item.nameKey)} (Coming Soon)
                                </span>
                            ) : (
                                <a
                                    key={item.id}
                                    href={getHref(item.href)}
                                    className={`block px-4 py-3 rounded-xl text-base font-bold transition-colors ${currentPage === item.id
                                        ? 'bg-[#405EDB]/10 text-[#405EDB]'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {t(item.nameKey)}
                                </a>
                            )
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}
