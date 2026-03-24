export const LEGAL_SLUGS = [
    'privacy-policy',
    'terms-of-service',
    'about-us',
    'contact-us',
    'refund-policy',
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const LEGAL_SLUG_SET = new Set<string>(LEGAL_SLUGS);

export function isLegalSlug(slug: string): slug is LegalSlug {
    return LEGAL_SLUG_SET.has(slug);
}
