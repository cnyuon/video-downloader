# I18n / Translation Architecture Guide

This document breaks down the structure, logic, and flow of language support (i18n) currently implemented in the Astro project. You can use this guide as a blueprint for your AI agent to replicate the exact same internationalization setup in your other project.

## 1. Top-Level Astro Configuration
**File:** `astro.config.mjs`

Astro's built-in i18n routing is configured within the main configuration block setting up the fundamentals for building localized pages:
- **`defaultLocale: "en"`**: Sets English as the base language.
- **`locales`**: An array of supported locale codes (e.g., `["en", "es", "tr", "pt", "fr", "de", "ja", "ko", "ar", "hi"]`).
- **`routing.prefixDefaultLocale: false`**: A critical setting. It means the default language (English) URLs stay at the root domain (e.g., `/tiktok-downloader`), while all other language versions get a path prefix (e.g., `/es/tiktok-downloader`).

## 2. Translation Dictionaries and Setup
**File:** `src/i18n/ui.ts`

This is the single source of truth for your translation strings globally.
- **`languages` object**: Maps language codes to human-readable labels (e.g., `{ en: 'English', es: 'Español' }`). This fuels the Language Picker UI and the hreflang SEO loop.
- **`defaultLang`**: Explicitly exported as `'en'`.
- **`ui` constant**: A deeply nested JavaScript object where top-level keys map to language codes (`en`, `es`, etc.), and the values are dictionaries containing key-value pairs for string translations (e.g., `'nav.home': 'Herramientas'`).

## 3. Core Helper Functions
**File:** `src/i18n/utils.ts`

This file provides the engine mapping URLs to appropriate languages safely. It exposes two essential functions:
- **`getLangFromUrl(url: URL)`**: Grabs the current URL, extracts the first path segment (e.g., `es`), and checks if it exists in the `ui` object. If not, it falls back to the `defaultLang` (`en`).
- **`useTranslations(lang)`**: Takes the active language code and returns a translation function (`t`). The `t` function looks up translation keys. **Crucially, it acts as a safeguard by falling back to the English dictionary if a specific string is missing in the locale dictionary.**

## 4. Routing and Page Directory Structure
**Location:** `src/pages/`

This project uses explicit folders for localization routing instead of relying heavily on `[lang].astro` dynamic catch-all route files.
- **Default Routes:** Main language pages live strictly at the root of `src/pages/` (e.g., `src/pages/tiktok-downloader.astro`).
- **Localized Routes:** Sub-folders map to language codes (`src/pages/es/`, `src/pages/fr/`). Each sub-folder contains clones of the pages found in the root.
- **Inside the Component:** Each page imports `getLangFromUrl` and `useTranslations`. It calls `const lang = getLangFromUrl(Astro.url)` and `const t = useTranslations(lang)`, and then heavily passes translated strings via `t('key')` into child components and HTML layouts.

## 5. Blog and Content Collections
**Location:** `src/content/blog/`

Markdown content uses subdirectories corresponding to language codes:
- **Content Organization:** `/en/`, `/es/`, `/tr/` inside `src/content/blog/` house the `.md` content items.
- **Blog Listing Pages (`index.astro`):** It fetches all posts utilizing `getCollection('blog')`. It isolates English baseline posts with `post.slug.startsWith('en/')` and dynamically overwrites the slug variables to route URLs appropriately towards their matching locale (`/es/blog/<true-slug>`).
- **Blog Post Render Pages (`[...slug].astro`):** Trims the original English prefix off incoming collections utilizing `replace('en/', '')` when setting `params`, ensuring slugs are mapped cleanly and uniformly across all versions.

## 6. Internal Linking (Navbar, Footer, In-Content)
**Files:** `src/components/Footer.astro`, `src/components/Navbar.tsx`

Internal links dynamically prepend the language context ensuring users are not accidentally dropped out of their preferred language.
- **`getHref(path)` Helper:**
  Evaluates if the path needs a prefix. If `lang === 'en'`, links output raw (`/blog`). If localized, the prefix is injected (`/es/blog`).
- **Implementation:** Components receive `lang` as a React/Astro prop. This ensures the Navigation bar builds the URLs properly so user session flows natively inside `/es/...` environments. 

## 7. SEO and Hreflang Tags
**File:** `src/components/i18n/HreflangTags.astro`

SEO architecture requires broadcasting to Google what translated variations exist for any given page to correctly funnel regional search traffic.
- Rendered exclusively inside the `<head>` of `Layout.astro`.
- Reconstructs what a page URL looks like completely stripped of its language prefix.
- Interates over the core `languages` dictionary to mass-generate `<link rel="alternate" hreflang="xx" href="..." />` tags representing every translated equivalent standing.
- Mandates output of an **`x-default`** flag routing generic users towards the English variant.

## 8. Language Switcher (UI)
**File:** `src/components/i18n/LanguagePicker.astro`

Provides the GUI dropdown user-experience.
- Strips the active language snippet off `Astro.url.pathname`.
- Iterates natively across the `languages` variable array mounting anchor tags pointing back directly to the same page but forcibly appended with the target tongue flag (e.g., `href={'/es' + currentPath}`).
