import type { ui } from '../i18n/ui';

export type ToolCategoryId = 'video' | 'audio' | 'image';

export interface ToolLink {
    id: string;
    href: string;
    labelKey: keyof typeof ui['en'];
    descriptionKey?: keyof typeof ui['en'];
    fallbackDescription?: string;
}

export interface ToolCategory {
    id: ToolCategoryId;
    titleKey: keyof typeof ui['en'];
    tools: ToolLink[];
}

export const TOOL_CATEGORIES: ToolCategory[] = [
    {
        id: 'video',
        titleKey: 'tools.category.video',
        tools: [
            { id: 'tiktok', href: '/tiktok-downloader/', labelKey: 'nav.tiktok', descriptionKey: 'index.tools.tt.desc' },
            { id: 'twitter', href: '/twitter-downloader/', labelKey: 'nav.twitter', descriptionKey: 'index.tools.tw.desc' },
            { id: 'facebook', href: '/facebook-downloader/', labelKey: 'nav.facebook', descriptionKey: 'index.tools.fb.desc' },
            { id: 'instagram', href: '/instagram-downloader/', labelKey: 'nav.instagram', fallbackDescription: 'Download Instagram Reels and videos from public links.' },
        ],
    },
    {
        id: 'audio',
        titleKey: 'tools.category.audio',
        tools: [
            { id: 'sound', href: '/tiktok-sound-downloader/', labelKey: 'nav.sound', descriptionKey: 'ts.hero.desc' },
            { id: 'audio', href: '/video-to-mp3/', labelKey: 'nav.audio', descriptionKey: 'index.tools.mp3.desc' },
        ],
    },
    {
        id: 'image',
        titleKey: 'tools.category.image',
        tools: [
            { id: 'thumbnail', href: '/thumbnail-grabber/', labelKey: 'nav.thumbnail', descriptionKey: 'index.tools.thumbnail.desc' },
        ],
    },
];

export const TOOL_CATEGORY_IDS: ToolCategoryId[] = TOOL_CATEGORIES.map((category) => category.id);

export function getToolCategory(id: string): ToolCategory | undefined {
    return TOOL_CATEGORIES.find((category) => category.id === id);
}
