# Metadata Map (Titles + Descriptions)

Generated on: 2026-04-18

## 1) Global Layout + Meta Tag Wiring
- File: `src/layouts/Layout.astro`
- Controls:
  - `<title>`
  - `<meta name="description">`
  - `og:title`, `og:description`
  - `twitter:title`, `twitter:description`
- Default fallback values live in this file and apply when a page does not pass explicit props.

## 2) Home Page Metadata (Per Locale)
- Route pattern:
  - English: `/`
  - Localized: `/{locale}/`
- Template source:
  - `src/pages/index.astro`
  - `src/pages/{locale}/index.astro`
  - `src/components/HomePage.astro`
- Actual title/description string source:
  - `src/i18n/ui.ts`
  - Keys:
    - `index.meta.title`
    - `index.meta.desc`

## 3) Blog Index Metadata (Per Locale)
- Route pattern:
  - English: `/blog/`
  - Localized: `/{locale}/blog/`
- Template source:
  - `src/pages/blog/index.astro`
  - `src/pages/{locale}/blog/index.astro`
  - `src/components/BlogIndexPage.astro`
- Actual title/description source:
  - `src/i18n/ui.ts`
  - Keys:
    - `blog.title` (title is rendered as `${blog.title} | GetMediaTools`)
    - `blog.desc`

## 4) Blog Cluster Page Metadata
- Route pattern:
  - English: `/blog/{cluster}/`
  - Localized: `/{locale}/blog/{cluster}/`
- Template source:
  - English: `src/pages/blog/[cluster].astro`
  - Localized: `src/pages/[lang]/blog/[cluster].astro`
- String sources:
  - English: `src/lib/blog-taxonomy.ts` (`BLOG_CLUSTERS` title + description)
  - Localized: `src/i18n/phase1-extra.ts`
    - `blog.cluster.{cluster}`
    - `blog.cluster_desc.{cluster}`

## 5) Blog Post Metadata (Main Indexable Content)
- Route pattern:
  - English: `/blog/{slug}/`
  - Localized: `/{locale}/blog/{slug}/`
- Template source:
  - English: `src/pages/blog/[...slug].astro`
  - Localized: `src/pages/{locale}/blog/[...slug].astro`
- Actual title/description source:
  - Frontmatter in markdown files under:
    - `src/content/blog/{locale}/*.md`
  - Required fields (enforced by schema): `title`, `description`
  - Schema file: `src/content/config.ts`

## 6) Other Pages That Still Emit Title/Description
- `src/pages/404.astro`
- `src/pages/erland-test.astro`

## 7) Redirect-Only Templates / Redirect Routes
- Catch-all template:
  - `src/pages/en/[...slug].astro`
  - Title is `"Redirecting..."`
- Programmatic redirect map:
  - `astro.config.mjs` (`redirects` from `REDIRECT_RULES`)
  - Includes tool URLs, legal URLs, and legacy topic URLs.

## 8) Legacy Tool Meta Strings (Present in i18n, not currently tied to page templates)
- File: `src/i18n/ui.ts`
- Keys include:
  - `tt.meta.title`, `tt.meta.desc`
  - `fb.meta.title`, `fb.meta.desc`
  - `tw.meta.title`, `tw.meta.desc`
  - `mp3.meta.title`, `mp3.meta.desc`
  - `ts.meta.title`, `ts.meta.desc`
  - `tg.meta.title`, `tg.meta.desc`

These strings exist and can be reused, but there are no corresponding dedicated route templates in `src/pages/` currently.

## 9) Generated Inventory Files
- Full inventory CSV:
  - `reports/seo/metadata-inventory-2026-04-18.csv`
- Length/outlier summary:
  - `reports/seo/metadata-summary-2026-04-18.md`

## 10) Re-generate Inventory
Run from `frontend/`:

```bash
node scripts/seo-metadata-inventory.mjs
```
