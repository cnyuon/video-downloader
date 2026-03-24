#!/usr/bin/env python3
"""
One-time taxonomy sync:
- Reads EN blog frontmatter taxonomy fields
- Mirrors them into locale-matched slug files for all non-EN locales

Fields synced:
  cluster
  subcluster
  primaryTool
  searchIntent

Usage:
  python3 scripts/sync_blog_taxonomy.py
"""
from __future__ import annotations

import os
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BLOG_ROOT = ROOT / "src" / "content" / "blog"
EN_ROOT = BLOG_ROOT / "en"
LOCALES = ["es", "tr", "pt", "fr", "de", "ja", "ko", "ar", "hi"]
FIELDS = ["cluster", "subcluster", "primaryTool", "searchIntent"]

DEFAULT_TAXONOMY_BY_SLUG = {
    "how-to-download-tiktok-without-watermark.md": ("tiktok", "download-basics", "tiktok-downloader", "informational"),
    "how-to-download-tiktok-thumbnails.md": ("tiktok", "thumbnails", "thumbnail-grabber", "informational"),
    "how-to-download-tiktok-iphone-no-app.md": ("tiktok", "mobile-workflow", "tiktok-downloader", "informational"),
    "best-tiktok-downloaders-2026.md": ("tiktok", "tool-comparisons", "tiktok-downloader", "commercial"),
    "bulk-download-tiktok-videos.md": ("tiktok", "bulk-download", "tiktok-downloader", "informational"),
    "watch-tiktok-without-app.md": ("tiktok", "viewer-workflow", "none", "informational"),
    "anonymous-tiktok-story-viewer.md": ("tiktok", "privacy", "none", "informational"),
    "download-instagram-reels-without-watermark.md": ("instagram", "reels", "instagram-downloader", "informational"),
    "5-best-ways-to-save-twitter-videos.md": ("twitter", "download-basics", "twitter-downloader", "informational"),
    "download-facebook-reels-to-phone.md": ("facebook", "reels", "facebook-downloader", "informational"),
    "how-to-download-tiktok-sounds-mp3.md": ("audio", "tiktok-audio", "tiktok-sound-downloader", "informational"),
    "mp3-juice-free-music-downloaders-safe.md": ("audio", "music-download", "video-to-mp3", "commercial"),
    "how-to-download-reddit-videos-with-audio.md": ("audio", "reddit-audio", "video-to-mp3", "informational"),
    "how-to-become-a-content-creator.md": ("creator-growth", "beginner-guides", "none", "informational"),
    "successful-faceless-youtube-channels.md": ("creator-growth", "channel-strategy", "none", "informational"),
    "10-tiktok-editing-tips-viral-2026.md": ("creator-growth", "editing", "none", "informational"),
    "best-free-video-editors-tiktok.md": ("creator-growth", "editing-tools", "none", "commercial"),
    "tiktok-banned-how-to-access-download.md": ("privacy-security", "access-restrictions", "none", "informational"),
}


def split_frontmatter(content: str) -> tuple[str, str]:
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", content, flags=re.DOTALL)
    if not match:
        return "", content
    return match.group(1), match.group(2)


def extract_fields(frontmatter: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for field in FIELDS:
        m = re.search(rf"^{re.escape(field)}:\s*\"?(.+?)\"?\s*$", frontmatter, flags=re.MULTILINE)
        if m:
            out[field] = m.group(1).strip()
    return out


def infer_taxonomy(slug_filename: str) -> dict[str, str]:
    if slug_filename not in DEFAULT_TAXONOMY_BY_SLUG:
        return {
            "cluster": "general",
            "subcluster": "general",
            "primaryTool": "none",
            "searchIntent": "informational",
        }
    cluster, subcluster, primary_tool, search_intent = DEFAULT_TAXONOMY_BY_SLUG[slug_filename]
    return {
        "cluster": cluster,
        "subcluster": subcluster,
        "primaryTool": primary_tool,
        "searchIntent": search_intent,
    }


def upsert_field(frontmatter: str, field: str, value: str) -> str:
    pattern = re.compile(rf"^{re.escape(field)}:\s*.*$", flags=re.MULTILINE)
    line = f'{field}: "{value}"'
    if pattern.search(frontmatter):
        return pattern.sub(line, frontmatter)
    return f"{frontmatter}\n{line}".strip()


def sync_locale_file(locale_file: Path, taxonomy: dict[str, str]) -> bool:
    if not locale_file.exists():
        return False
    original = locale_file.read_text(encoding="utf-8")
    frontmatter, body = split_frontmatter(original)
    if not frontmatter:
        return False

    updated = frontmatter
    for field, value in taxonomy.items():
        updated = upsert_field(updated, field, value)

    new_content = f"---\n{updated}\n---\n{body}"
    if new_content == original:
        return False

    locale_file.write_text(new_content, encoding="utf-8")
    return True


def main() -> None:
    changed = 0
    scanned = 0

    for en_file in sorted(EN_ROOT.glob("*.md")):
        scanned += 1
        slug = en_file.name
        content = en_file.read_text(encoding="utf-8")
        frontmatter, _ = split_frontmatter(content)
        if not frontmatter:
            continue
        taxonomy = extract_fields(frontmatter)
        inferred = infer_taxonomy(slug)
        for field, value in inferred.items():
            if field not in taxonomy:
                taxonomy[field] = value

        # Ensure EN source has taxonomy too
        en_updated = frontmatter
        for field, value in taxonomy.items():
            en_updated = upsert_field(en_updated, field, value)
        if en_updated != frontmatter:
            _, body = split_frontmatter(content)
            en_file.write_text(f"---\n{en_updated}\n---\n{body}", encoding="utf-8")
            changed += 1

        for locale in LOCALES:
            locale_file = BLOG_ROOT / locale / slug
            if sync_locale_file(locale_file, taxonomy):
                changed += 1

    print(f"Scanned EN posts: {scanned}")
    print(f"Locale files updated: {changed}")


if __name__ == "__main__":
    main()
