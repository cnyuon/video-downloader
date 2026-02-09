import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.date(),
        updatedDate: z.date().optional(),
        heroImage: z.string().optional(),
        // SEO
        keywords: z.array(z.string()).optional(),
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
