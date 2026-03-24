# GetMediaTools Editorial Image Spec

Last updated: 2026-03-24

## Core Ratios

- Blog hero images: `16:9`
- In-article primary visuals: `4:3`
- In-article wide walkthrough visuals: `16:9`

## Recommended Export Sizes

- Blog hero (standard): `1600x900`
- Blog hero (retina): `2400x1350`
- In-article primary: `1200x900`
- In-article wide: `1600x900`

## Safe Area Rules

- Keep critical text/logos inside the center `80%` width and `70%` height area.
- Avoid placing key text within outer `10%` margins.
- Prefer center composition for compatibility across card/detail contexts.

## Compression and Format

- Preferred format: WebP for rendered pages.
- Keep exported source images under ~450 KB when practical.
- Avoid aggressive compression on screenshots containing UI text.

## Legacy Asset Compatibility

- Existing square assets are currently rendered with `object-contain` in `16:9` wrappers.
- This prevents hard cropping while migration to native `16:9` assets is in progress.

## Naming Convention

- Use lowercase kebab-case file names.
- Include purpose in name when possible (for example, `tiktok-watermark-workflow-hero.png`).
