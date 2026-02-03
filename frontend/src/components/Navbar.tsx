/**
 * Navbar - Main navigation with dropdown for tools (mobile-responsive)
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

interface NavbarProps {
    activeTool: string;
    onToolChange: (tool: string) => void;
}

const otherTools = [
    { id: 'audio', name: 'Video to MP3', desc: 'Extract audio from any video' },
    { id: 'thumbnail', name: 'Thumbnail Grabber', desc: 'Download video thumbnails' },
    { id: 'transcript', name: 'Video Transcript', desc: 'Extract YouTube captions' },
];

export default function Navbar({ activeTool, onToolChange }: NavbarProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeOtherTool = otherTools.find(t => t.id === activeTool);

    const handleToolSelect = (tool: string) => {
        onToolChange(tool);
        setDropdownOpen(false);
        setMobileMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between mx-auto px-4 max-w-6xl">
                {/* Logo */}
                <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <span className="font-bold text-sm sm:text-base">MediaTools</span>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden sm:flex items-center space-x-1 text-sm font-medium">
                    {/* Video Downloader - Main tab */}
                    <button
                        onClick={() => handleToolSelect('video')}
                        className={`px-3 py-2 rounded-md transition-colors ${activeTool === 'video'
                                ? 'bg-accent text-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                            }`}
                    >
                        Video Downloader
                    </button>

                    {/* Other Tools - Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1 ${activeOtherTool
                                    ? 'bg-accent text-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                }`}
                        >
                            {activeOtherTool ? activeOtherTool.name : 'Other Tools'}
                            <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute top-full right-0 mt-1 w-64 rounded-md border bg-popover shadow-lg">
                                <div className="py-1">
                                    {otherTools.map((tool) => (
                                        <button
                                            key={tool.id}
                                            onClick={() => handleToolSelect(tool.id)}
                                            className={`w-full px-4 py-2 text-left hover:bg-accent/50 ${activeTool === tool.id ? 'bg-accent' : ''
                                                }`}
                                        >
                                            <div className="font-medium text-sm">{tool.name}</div>
                                            <div className="text-xs text-muted-foreground">{tool.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="sm:hidden p-2 rounded-md hover:bg-accent"
                >
                    {mobileMenuOpen ? (
                        <X className="h-5 w-5" />
                    ) : (
                        <Menu className="h-5 w-5" />
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="sm:hidden border-t bg-background">
                    <div className="py-2 px-4 space-y-1">
                        <button
                            onClick={() => handleToolSelect('video')}
                            className={`w-full text-left px-3 py-2 rounded-md ${activeTool === 'video'
                                    ? 'bg-accent text-foreground font-medium'
                                    : 'text-muted-foreground'
                                }`}
                        >
                            Video Downloader
                        </button>

                        <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground px-3 py-1">Other Tools</p>
                            {otherTools.map((tool) => (
                                <button
                                    key={tool.id}
                                    onClick={() => handleToolSelect(tool.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md ${activeTool === tool.id
                                            ? 'bg-accent text-foreground font-medium'
                                            : 'text-muted-foreground'
                                        }`}
                                >
                                    {tool.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
