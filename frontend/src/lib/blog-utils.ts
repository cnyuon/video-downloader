/**
 * Blog utility functions for SEO-optimized post selection.
 * 
 * Provides cluster-aware related post selection that reinforces
 * topical authority by prioritizing posts from the same cluster,
 * then adjacent clusters, before falling back to other content.
 */

import { getPostCluster, ADJACENT_CLUSTERS } from './blog-taxonomy';

interface BlogPost {
    slug: string;
    data: {
        title: string;
        description: string;
        pubDate: Date;
        updatedDate?: Date;
        [key: string]: any;
    };
}

/**
 * Simple string hash that returns a non-negative integer.
 * Used to deterministically offset post selection per page.
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Returns a cluster-aware selection of related blog posts.
 * 
 * Priority order:
 * 1. Posts from the SAME cluster (topical relevance)
 * 2. Posts from ADJACENT clusters (cross-pillar linking)
 * 3. Posts from ANY cluster (fill remaining slots)
 * 
 * Within each priority tier, posts are sorted by recency.
 * Uses a hash of the current slug for deterministic offset
 * so different pages show different posts.
 * 
 * @param posts - All available blog posts (already filtered by locale)
 * @param currentSlug - The slug of the current page (used for hashing & exclusion)
 * @param count - Number of posts to return (default: 4)
 * @param currentCluster - The cluster of the current post (optional but recommended)
 * @returns Cluster-aware array of related posts
 */
export function getDiversePosts(
    posts: BlogPost[],
    currentSlug: string,
    count: number = 4,
    currentCluster?: string
): BlogPost[] {
    // Sort by most recently updated first
    const sorted = [...posts]
        .sort((a, b) => {
            const aDate = a.data.updatedDate || a.data.pubDate;
            const bDate = b.data.updatedDate || b.data.pubDate;
            return bDate.valueOf() - aDate.valueOf();
        })
        // Exclude the current post
        .filter(p => !p.slug.endsWith(currentSlug));

    if (sorted.length <= count) return sorted;

    // If no cluster info, fall back to hash-based diverse selection
    if (!currentCluster) {
        return hashDiverseSelect(sorted, currentSlug, count);
    }

    const result: BlogPost[] = [];

    // Step 1: Same cluster posts (highest priority for topical authority)
    const sameCluster = sorted.filter(p => getPostCluster(p) === currentCluster);
    result.push(...sameCluster.slice(0, count));

    // Step 2: Fill from adjacent clusters if needed
    if (result.length < count) {
        const adjacentIds = ADJACENT_CLUSTERS[currentCluster] || [];
        const adjacentPosts = sorted.filter(p =>
            adjacentIds.includes(getPostCluster(p)) && !result.includes(p)
        );
        result.push(...adjacentPosts.slice(0, count - result.length));
    }

    // Step 3: Fill remaining from any cluster (deterministic offset)
    if (result.length < count) {
        const remaining = sorted.filter(p => !result.includes(p));
        const offset = hashString(currentSlug) % Math.max(1, remaining.length);
        for (let i = 0; i < remaining.length && result.length < count; i++) {
            const index = (offset + i) % remaining.length;
            result.push(remaining[index]);
        }
    }

    return result;
}

/**
 * Hash-based diverse selection (fallback when no cluster is available).
 */
function hashDiverseSelect(sorted: BlogPost[], currentSlug: string, count: number): BlogPost[] {
    const offset = hashString(currentSlug) % sorted.length;
    const result: BlogPost[] = [];
    const step = Math.max(1, Math.floor(sorted.length / count));

    for (let i = 0; i < count && result.length < count; i++) {
        const index = (offset + i * step) % sorted.length;
        const post = sorted[index];
        if (!result.includes(post)) {
            result.push(post);
        }
    }

    // Fill remaining slots if deduplication left gaps
    if (result.length < count) {
        for (const post of sorted) {
            if (result.length >= count) break;
            if (!result.includes(post)) {
                result.push(post);
            }
        }
    }

    return result;
}
