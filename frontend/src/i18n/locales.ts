export const DEFAULT_LOCALE = 'en' as const;
export const NON_DEFAULT_LOCALES = ['es', 'tr', 'pt', 'fr', 'de', 'ja', 'ko', 'ar', 'hi'] as const;
export const ALL_LOCALES = [DEFAULT_LOCALE, ...NON_DEFAULT_LOCALES] as const;

export type Locale = (typeof ALL_LOCALES)[number];
