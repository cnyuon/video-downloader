/**
 * Blog utility functions for SEO-optimized post selection.
 * 
 * Provides deterministic, diversified post picking so different pages
 * show different related posts — spreading internal link equity evenly.
 */

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
 * Returns a diversified selection of blog posts for internal linking.
 * 
 * Instead of always showing the same top-N posts, this function uses
 * a hash of the current page slug to pick a different starting offset,
 * ensuring different pages link to different posts.
 * 
 * @param posts - All available blog posts (already filtered by locale)
 * @param currentSlug - The slug of the current page (used for hashing & exclusion)
 * @param count - Number of posts to return (default: 4)
 * @returns Diversified array of posts
 */
export function getDiversePosts(
    posts: BlogPost[],
    currentSlug: string,
    count: number = 4
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

    // Use hash to determine starting offset
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
