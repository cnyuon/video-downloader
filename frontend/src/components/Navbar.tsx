/**
 * Navbar - Main navigation with all features visible (desktop) and hamburger menu (mobile)
 * Includes dark/light mode toggle
 */
import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';

interface NavbarProps {
    currentPage: string;
}

const navItems = [
    { id: 'home', name: 'All Tools', href: '/' },
    { id: 'video', name: 'TikTok', href: '/tiktok-downloader' },
    { id: 'instagram', name: 'Instagram', href: '/instagram-downloader' },
    { id: 'twitter', name: 'Twitter/X', href: '/twitter-downloader' },
    { id: 'facebook', name: 'Facebook', href: '/facebook-downloader' },
    { id: 'audio', name: 'Video to MP3', href: '/video-to-mp3' },
    { id: 'blog', name: 'Blog', href: '/blog' },
];

export default function Navbar({ currentPage }: NavbarProps) {
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
                                {item.name}
                            </span>
                        ) : (
                            <a
                                key={item.id}
                                href={item.href}
                                className={`px-3 py-2 rounded-md transition-colors ${currentPage === item.id
                                    ? 'bg-accent text-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    }`}
                            >
                                {item.name}
                            </a>
                        )
                    ))}

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
                                    {item.name} (Coming Soon)
                                </span>
                            ) : (
                                <a
                                    key={item.id}
                                    href={item.href}
                                    className={`block px-3 py-2 rounded-md text-sm font-medium ${currentPage === item.id
                                        ? 'bg-accent text-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.name}
                                </a>
                            )
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}
