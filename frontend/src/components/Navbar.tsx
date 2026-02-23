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
        return lang === 'en' ? path : `/${lang}${path === '/' ? '' : path}`;
    };

    const navItems: NavItem[] = [
        { id: 'home', nameKey: 'nav.home', href: '/' },
        { id: 'video', nameKey: 'nav.tiktok', href: '/tiktok-downloader' },
        { id: 'twitter', nameKey: 'nav.twitter', href: '/twitter-downloader' },
        { id: 'facebook', nameKey: 'nav.facebook', href: '/facebook-downloader' },
        { id: 'sound', nameKey: 'nav.sound', href: '/tiktok-sound-downloader' },
        { id: 'audio', nameKey: 'nav.audio', href: '/video-to-mp3' },
        { id: 'thumbnail', nameKey: 'nav.thumbnail', href: '/thumbnail-grabber' },
        { id: 'blog', nameKey: 'nav.blog', href: '/blog' },
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
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between mx-auto px-4 max-w-6xl">
                {/* Logo - Click to go home */}
                <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                    <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <span className="font-bold text-sm sm:text-base">MediaTools</span>
                </a>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
                    {navItems.map((item) => (
                        item.disabled ? (
                            <span
                                key={item.id}
                                className="px-3 py-2 rounded-md text-muted-foreground/50 cursor-not-allowed"
                                title="Coming soon"
                            >
                                {t(item.nameKey)}
                            </span>
                        ) : (
                            <a
                                key={item.id}
                                href={getHref(item.href)}
                                className={`px-3 py-2 rounded-md transition-colors ${currentPage === item.id
                                    ? 'bg-accent text-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    }`}
                            >
                                {t(item.nameKey)}
                            </a>
                        )
                    ))}

                    {/* Language Switcher */}
                    <div className="flex items-center ml-2 pl-4 border-l border-border/50 h-6">
                        <select
                            value={lang}
                            onChange={(e) => {
                                const newLang = e.target.value;
                                const path = window.location.pathname;
                                if (path.startsWith(`/${lang}`)) {
                                    window.location.href = path.replace(`/${lang}`, `/${newLang}`);
                                } else {
                                    window.location.href = `/${newLang}${path === '/' ? '' : path}`;
                                }
                            }}
                            className="bg-transparent text-sm font-semibold text-foreground hover:text-primary cursor-pointer focus:outline-none transition-colors appearance-none pr-4 relative"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '1em' }}
                            aria-label="Select language"
                        >
                            <option value="en" className="bg-background text-foreground">🇺🇸 English</option>
                            <option value="es" className="bg-background text-foreground">🇪🇸 Español</option>
                        </select>
                    </div>

                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="ml-2 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                        aria-label="Toggle dark mode"
                    >
                        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                </nav>

                {/* Mobile: Theme toggle + Menu button */}
                <div className="flex items-center gap-2 md:hidden">
                    <div className="relative border border-border/50 rounded-md bg-accent/30 px-2 py-1">
                        <select
                            value={lang}
                            onChange={(e) => {
                                const newLang = e.target.value;
                                const path = window.location.pathname;
                                if (path.startsWith(`/${lang}`)) {
                                    window.location.href = path.replace(`/${lang}`, `/${newLang}`);
                                } else {
                                    window.location.href = `/${newLang}${path === '/' ? '' : path}`;
                                }
                            }}
                            className="bg-transparent text-sm font-semibold text-foreground focus:outline-none appearance-none pr-4 relative"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '1em' }}
                        >
                            <option value="en" className="bg-background text-foreground">🇺🇸 EN</option>
                            <option value="es" className="bg-background text-foreground">🇪🇸 ES</option>
                        </select>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-md hover:bg-accent"
                        aria-label="Toggle dark mode"
                    >
                        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-md hover:bg-accent"
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
                <div className="md:hidden border-t bg-background">
                    <nav className="container mx-auto px-4 py-3 space-y-1">
                        {navItems.map((item) => (
                            item.disabled ? (
                                <span
                                    key={item.id}
                                    className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                                >
                                    {t(item.nameKey)} (Coming Soon)
                                </span>
                            ) : (
                                <a
                                    key={item.id}
                                    href={getHref(item.href)}
                                    className={`block px-3 py-2 rounded-md text-sm font-medium ${currentPage === item.id
                                        ? 'bg-accent text-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
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
