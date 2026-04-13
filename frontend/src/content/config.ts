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
            'anonymous-viewing',
            'audio-conversion',
            'downloading-media',
            'social-media-tools',
            'creator-assets',
            'creator-growth',
            'social-commerce',
            'general'
        ]).optional(),
        subcluster: z.string().optional(),
        primaryTool: z.string().optional(),
        searchIntent: z.enum(['informational', 'commercial', 'transactional', 'navigational']).optional(),
        // Explicit pillar relationship metadata for topical authority workflows
        isPillar: z.boolean().optional(),
        pillarSlug: z.string().optional(),
        // Monetization Tags
        monetization: z.object({
            primary_category: z.enum(['none', 'vpn', 'software', 'hosting', 'storage', 'creator-tools']),
            secondary_categories: z.array(z.string()).optional(),
            affiliate_potential: z.enum(['low', 'medium', 'high']),
            geo_restrictions: z.boolean().default(false),
        }).optional(),
    }),
});

export const collections = { blog: blogCollection };
