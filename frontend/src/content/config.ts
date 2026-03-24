import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
    type: 'content',
    schema: ({ image }) => z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        updatedDate: z.date().optional(),
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        // SEO
        keywords: z.array(z.string()).optional(),
        // SEO topical clustering taxonomy
        cluster: z.enum([
            'tiktok',
            'instagram',
            'twitter',
            'facebook',
            'audio',
            'creator-growth',
            'privacy-security',
            'general'
        ]).optional(),
        subcluster: z.string().optional(),
        primaryTool: z.enum([
            'tiktok-downloader',
            'twitter-downloader',
            'facebook-downloader',
            'video-to-mp3',
            'tiktok-sound-downloader',
            'thumbnail-grabber',
            'instagram-downloader',
            'none'
        ]).optional(),
        searchIntent: z.enum(['informational', 'commercial', 'transactional', 'navigational']).optional(),
        // Monetization Tags
        monetization: z.object({
            primary_category: z.enum(['none', 'vpn', 'software', 'hosting', 'storage', 'creator-tools']),
            secondary_categories: z.array(z.string()).optional(),
            affiliate_potential: z.enum(['low', 'medium', 'high']),
            geo_restrictions: z.boolean().default(false),
        }).optional(),
    }),
});

const legalCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        lastUpdated: z.date(),
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
    }),
});

export const collections = { blog: blogCollection, legal: legalCollection };
