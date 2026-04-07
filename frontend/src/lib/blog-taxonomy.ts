export type BlogClusterId =
    | 'anonymous-viewing'
    | 'audio-conversion'
    | 'downloading-media'
    | 'social-media-tools'
    | 'creator-assets'
    | 'creator-growth'
    | 'social-commerce'
    | 'general';

export interface BlogClusterMeta {
    id: BlogClusterId;
    title: string;
    description: string;
    icon: string;
}

export const BLOG_CLUSTERS: BlogClusterMeta[] = [
    {
        id: 'anonymous-viewing',
        title: 'Anonymous Viewing & Privacy',
        description: 'View TikTok stories anonymously, access social media without accounts, and protect your privacy online.',
        icon: '🔒',
    },
    {
        id: 'audio-conversion',
        title: 'Audio & Format Conversion',
        description: 'Convert YouTube to WAV, OGG, MP3 and more. Extract audio from any social media platform.',
        icon: '🎵',
    },
    {
        id: 'downloading-media',
        title: 'Downloading & Saving Media',
        description: 'Download videos, photos, and media from TikTok, YouTube, Instagram, and other platforms.',
        icon: '📥',
    },
    {
        id: 'social-media-tools',
        title: 'Social Media Tools',
        description: 'Comment finders, follower trackers, shadowban checkers, and essential social media utilities.',
        icon: '🛠️',
    },
    {
        id: 'creator-assets',
        title: 'Creator Assets & Templates',
        description: 'TikTok emojis, safe zone templates, Instagram captions, fonts, and creative resources.',
        icon: '🎨',
    },
    {
        id: 'creator-growth',
        title: 'Creator Growth & Marketing',
        description: 'Content strategy, editing guides, SEO tools, and audience growth playbooks for creators.',
        icon: '📈',
    },
    {
        id: 'social-commerce',
        title: 'Social Commerce & Monetization',
        description: 'TikTok coins, account trading, mod APKs, and social media monetization strategies.',
        icon: '💰',
    },
    {
        id: 'general',
        title: 'General Guides',
        description: 'Broad social media tutorials, productivity tips, and evergreen guides.',
        icon: '📚',
    },
];

/**
 * Cross-pillar adjacency map for related post fallback.
 * When a cluster has too few posts, we pull from adjacent clusters first
 * before falling back to random posts. This preserves topical relevance.
 */
export const ADJACENT_CLUSTERS: Record<string, string[]> = {
    'anonymous-viewing': ['downloading-media', 'social-media-tools'],
    'audio-conversion': ['downloading-media'],
    'downloading-media': ['anonymous-viewing', 'audio-conversion'],
    'social-media-tools': ['anonymous-viewing', 'creator-assets'],
    'creator-assets': ['social-media-tools', 'creator-growth'],
    'creator-growth': ['creator-assets', 'social-media-tools'],
    'social-commerce': ['creator-growth'],
    'general': [],
};

const SLUG_CLUSTER_MAP: Record<string, BlogClusterId> = {
    // Anonymous Viewing & Privacy
    'anonymous-tiktok-story-viewer': 'anonymous-viewing',
    'watch-tiktok-without-app': 'anonymous-viewing',
    'tiktok-banned-how-to-access-download': 'anonymous-viewing',

    // Audio & Format Conversion
    'how-to-download-tiktok-sounds-mp3': 'audio-conversion',
    'mp3-juice-free-music-downloaders-safe': 'audio-conversion',

    // Downloading & Saving Media
    'how-to-download-tiktok-without-watermark': 'downloading-media',
    'best-tiktok-downloaders-2026': 'downloading-media',
    'bulk-download-tiktok-videos': 'downloading-media',
    'how-to-download-tiktok-iphone-no-app': 'downloading-media',
    'how-to-download-tiktok-thumbnails': 'downloading-media',
    'download-instagram-reels-without-watermark': 'downloading-media',
    'download-facebook-reels-to-phone': 'downloading-media',
    '5-best-ways-to-save-twitter-videos': 'downloading-media',
    'how-to-download-reddit-videos-with-audio': 'downloading-media',

    // Creator Growth & Marketing
    'how-to-become-a-content-creator': 'creator-growth',
    'successful-faceless-youtube-channels': 'creator-growth',
    '10-tiktok-editing-tips-viral-2026': 'creator-growth',
    'best-free-video-editors-tiktok': 'creator-growth',
};

export function getClusterMeta(cluster: BlogClusterId): BlogClusterMeta {
    return BLOG_CLUSTERS.find((c) => c.id === cluster) || BLOG_CLUSTERS.find((c) => c.id === 'general')!;
}

export function normalizeBaseSlug(slug: string): string {
    return slug.replace(/^[a-z]{2}\//, '').replace(/^blog\//, '').replace(/\/$/, '');
}

export function inferClusterFromSlug(slug: string): BlogClusterId {
    const normalized = normalizeBaseSlug(slug);
    return SLUG_CLUSTER_MAP[normalized] || 'general';
}

export function getPostCluster(post: any): BlogClusterId {
    return (post?.data?.cluster as BlogClusterId | undefined) || inferClusterFromSlug(post?.slug || '');
}
