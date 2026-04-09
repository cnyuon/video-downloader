# GetMediaTools Editorial Image Spec

Last updated: 2026-04-09

## Core Ratios

- Blog hero images (homepage cards, `/blog` cards, cluster cards, article hero): `16:9`
- In-article visuals (default): `16:9`
- In-article UI step/screenshot visuals (optional): `4:3`

## Recommended Export Sizes

- Blog hero (standard): `1600x900`
- Blog hero (retina): `2400x1350`
- In-article default: `1600x900`
- In-article UI screenshot fallback: `1440x1080`

## Safe Area Rules

- Keep critical text/logos inside the center `80%` width and `70%` height area.
- Avoid placing key text within outer `10%` margins.
- Prefer center composition for compatibility across card/detail contexts.

## Compression and Format

- Preferred format: WebP for rendered pages.
- Keep exported source images under ~450 KB when practical.
- Avoid aggressive compression on screenshots containing UI text.

## Legacy Asset Compatibility

- Existing square assets can still render, but they may crop in list/card contexts.
- For predictable cross-page composition, migrate legacy square files to `16:9` canvases.

## Naming Convention

- Use lowercase kebab-case file names.
- Include purpose in name when possible (for example, `tiktok-watermark-workflow-hero.png`).
