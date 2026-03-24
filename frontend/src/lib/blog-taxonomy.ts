export type BlogClusterId =
    | 'tiktok'
    | 'instagram'
    | 'twitter'
    | 'facebook'
    | 'audio'
    | 'creator-growth'
    | 'privacy-security'
    | 'general';

export interface BlogClusterMeta {
    id: BlogClusterId;
    title: string;
    description: string;
}

export const BLOG_CLUSTERS: BlogClusterMeta[] = [
    {
        id: 'tiktok',
        title: 'TikTok Guides',
        description: 'Download workflows, no-watermark methods, and practical TikTok tutorials.',
    },
    {
        id: 'instagram',
        title: 'Instagram Guides',
        description: 'Reels-focused tips and save workflows for Instagram public content.',
    },
    {
        id: 'twitter',
        title: 'Twitter/X Guides',
        description: 'Save Twitter/X videos and GIFs with quality and compatibility best practices.',
    },
    {
        id: 'facebook',
        title: 'Facebook Guides',
        description: 'How to download Facebook videos and Reels on mobile and desktop.',
    },
    {
        id: 'audio',
        title: 'Audio & MP3',
        description: 'Audio extraction, TikTok sound workflows, and MP3 conversion resources.',
    },
    {
        id: 'creator-growth',
        title: 'Creator Growth',
        description: 'Creator strategy, editing guides, and audience growth playbooks.',
    },
    {
        id: 'privacy-security',
        title: 'Privacy & Security',
        description: 'Safety, restrictions, and privacy-first downloading guidance.',
    },
    {
        id: 'general',
        title: 'General Guides',
        description: 'Broad social media and download workflows across platforms.',
    },
];

const SLUG_CLUSTER_MAP: Record<string, BlogClusterId> = {
    'how-to-download-tiktok-without-watermark': 'tiktok',
    'how-to-download-tiktok-thumbnails': 'tiktok',
    'how-to-download-tiktok-iphone-no-app': 'tiktok',
    'best-tiktok-downloaders-2026': 'tiktok',
    'bulk-download-tiktok-videos': 'tiktok',
    'watch-tiktok-without-app': 'tiktok',
    'anonymous-tiktok-story-viewer': 'tiktok',
    'download-instagram-reels-without-watermark': 'instagram',
    '5-best-ways-to-save-twitter-videos': 'twitter',
    'download-facebook-reels-to-phone': 'facebook',
    'how-to-download-tiktok-sounds-mp3': 'audio',
    'mp3-juice-free-music-downloaders-safe': 'audio',
    'how-to-download-reddit-videos-with-audio': 'audio',
    'how-to-become-a-content-creator': 'creator-growth',
    'successful-faceless-youtube-channels': 'creator-growth',
    '10-tiktok-editing-tips-viral-2026': 'creator-growth',
    'best-free-video-editors-tiktok': 'creator-growth',
    'tiktok-banned-how-to-access-download': 'privacy-security',
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
