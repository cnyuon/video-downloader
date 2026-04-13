#!/usr/bin/env python3
"""Scaffold EN topical-authority blog posts from topical_authority_publish_queue.csv.

This script uses `topical_authority_publish_queue.csv` as the source of truth for:
- target slug
- pillar/cluster relationships
- required internal links

It creates a markdown draft at:
  frontend/src/content/blog/en/<slug>.md

Behavior:
- EN-only output
- live-link safe: only includes required links that currently resolve
- adds a standardized "Related Guides" block
- includes TODO comments for unresolved queue links to complete in closure pass
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
QUEUE_CSV = ROOT / "topical_authority_publish_queue.csv"
CONTENT_MAP_CSV = ROOT / "GetMediaTools_Merged_Content_Map_Final.csv"
EN_BLOG_DIR = ROOT / "frontend" / "src" / "content" / "blog" / "en"

CLUSTER_IDS = {
    "anonymous-viewing",
    "audio-conversion",
    "downloading-media",
    "social-media-tools",
    "creator-assets",
    "creator-growth",
    "social-commerce",
    "general",
}

VALID_INTENTS = {"informational", "commercial", "transactional", "navigational"}


def slug_from_blog_url(url: str) -> str:
    value = (url or "").strip()
    value = re.sub(r"^https?://[^/]+", "", value)
    value = value.strip()
    if value.startswith("/blog/"):
        return value.strip("/").split("/")[-1]
    if value.startswith("blog/"):
        return value.strip("/").split("/")[-1]
    return value.strip("/").split("/")[-1]


def blog_url_from_slug(slug: str) -> str:
    return f"/blog/{slug}/"


def load_csv_rows(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def slugify(text: str) -> str:
    text = normalize_ws(text).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "general"


def parse_required_links(raw: str) -> List[Tuple[str, str]]:
    out: List[Tuple[str, str]] = []
    for part in (raw or "").split("|"):
        part = part.strip()
        if not part or ":" not in part:
            continue
        key, url = part.split(":", 1)
        key = key.strip()
        url = url.strip()
        if url:
            out.append((key, url))
    return out


def extract_frontmatter_title(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    match = re.search(r'^title:\s*"([^"]+)"\s*$', text, flags=re.MULTILINE)
    return match.group(1).strip() if match else None


def is_live_blog_url(url: str) -> bool:
    slug = slug_from_blog_url(url)
    if slug in CLUSTER_IDS:
        return True
    return (EN_BLOG_DIR / f"{slug}.md").exists()


def yaml_quote(value: str) -> str:
    text = (value or "").replace("\\", "\\\\").replace('"', '\\"')
    return f'"{text}"'


def parse_search_intent(raw: str) -> str:
    value = normalize_ws(raw).lower()
    if not value:
        return "informational"

    # Supports CSV forms like: "Informational,Branded,Non-local"
    first = value.split(",", 1)[0].strip()
    if first in VALID_INTENTS:
        return first

    if "informational" in value:
        return "informational"
    if "commercial" in value:
        return "commercial"
    if "transactional" in value:
        return "transactional"
    if "navigational" in value:
        return "navigational"

    return "informational"


def map_content_rows_by_csv_no(rows: List[Dict[str, str]]) -> Dict[str, Dict[str, str]]:
    mapped: Dict[str, Dict[str, str]] = {}
    for row in rows:
        key = normalize_ws(row.get("#", ""))
        if key:
            mapped[key] = row
    return mapped


def derive_subcluster(row: Dict[str, str]) -> str:
    phase = normalize_ws(row.get("phase", "")).lower()
    if phase == "pillar_page":
        return "pillar-hub"

    cluster_label = normalize_ws(row.get("cluster", ""))
    if ":" in cluster_label:
        cluster_label = cluster_label.split(":", 1)[1]
    if not cluster_label:
        return "general"
    return slugify(cluster_label)


def derive_cluster_id(row: Dict[str, str]) -> str:
    cluster_hub = normalize_ws(row.get("cluster_hub_url", ""))
    cluster_slug = slug_from_blog_url(cluster_hub)
    return cluster_slug if cluster_slug in CLUSTER_IDS else "general"


def derive_primary_tool(row: Dict[str, str], cluster_id: str) -> str:
    # Conservative default. Authors can refine after drafting.
    if cluster_id == "downloading-media":
        return "tiktok-downloader"
    if cluster_id == "audio-conversion":
        return "video-to-mp3"
    return "none"


def build_related_guides_section(
    self_url: str,
    required_links: List[Tuple[str, str]],
    slug_title_lookup: Dict[str, str],
) -> Tuple[str, List[Tuple[str, str]]]:
    live: List[Tuple[str, str]] = []
    unresolved: List[Tuple[str, str]] = []
    seen = set()

    for key, url in required_links:
        if url == self_url:
            continue
        if url in seen:
            continue
        seen.add(url)

        if is_live_blog_url(url):
            live.append((key, url))
        else:
            unresolved.append((key, url))

    lines = ["### Related Guides"]
    if live:
        for _, url in live:
            slug = slug_from_blog_url(url)
            title = slug_title_lookup.get(slug) or slug.replace("-", " ").title()
            lines.append(f"- [{title}]({url})")
    else:
        lines.append("- Related links will be added as this pillar batch is published.")

    return "\n".join(lines), unresolved


def create_slug_title_lookup(queue_rows: List[Dict[str, str]]) -> Dict[str, str]:
    out: Dict[str, str] = {}

    for row in queue_rows:
        slug = slug_from_blog_url(row.get("target_url", ""))
        title = normalize_ws(row.get("title", ""))
        if slug and title:
            out[slug] = title

    for md_path in EN_BLOG_DIR.glob("*.md"):
        slug = md_path.stem
        title = extract_frontmatter_title(md_path)
        if title:
            out[slug] = title

    return out


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scaffold EN topical-authority blog drafts.")
    parser.add_argument("--slug", required=True, help="Target post slug or /blog/<slug>/ URL.")
    parser.add_argument("--pub-date", default=dt.date.today().isoformat(), help="YYYY-MM-DD (default: today)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing target file")
    parser.add_argument("--dry-run", action="store_true", help="Print output without writing file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not QUEUE_CSV.exists():
        print(f"ERROR: Missing queue file: {QUEUE_CSV}", file=sys.stderr)
        return 1

    queue_rows = load_csv_rows(QUEUE_CSV)
    content_rows = load_csv_rows(CONTENT_MAP_CSV) if CONTENT_MAP_CSV.exists() else []
    content_map_by_no = map_content_rows_by_csv_no(content_rows)

    input_slug = slug_from_blog_url(args.slug)

    queue_row = next(
        (row for row in queue_rows if slug_from_blog_url(row.get("target_url", "")) == input_slug),
        None,
    )
    if queue_row is None:
        print(f"ERROR: Slug '{input_slug}' was not found in {QUEUE_CSV.name}", file=sys.stderr)
        return 1

    csv_no = normalize_ws(queue_row.get("csv_no", ""))
    content_row = content_map_by_no.get(csv_no) if csv_no else None

    slug = slug_from_blog_url(queue_row.get("target_url", ""))
    target_url = blog_url_from_slug(slug)
    out_path = EN_BLOG_DIR / f"{slug}.md"

    if out_path.exists() and not args.force:
        print(f"ERROR: Target file already exists: {out_path}", file=sys.stderr)
        print("Use --force to overwrite.", file=sys.stderr)
        return 1

    phase = normalize_ws(queue_row.get("phase", "")).lower()
    is_pillar = phase == "pillar_page"
    cluster_id = derive_cluster_id(queue_row)
    subcluster = derive_subcluster(queue_row)
    pillar_slug = slug_from_blog_url(queue_row.get("pillar_url", ""))
    primary_tool = derive_primary_tool(queue_row, cluster_id)

    title = normalize_ws(queue_row.get("title", ""))
    primary_kw = normalize_ws(queue_row.get("primary_kw", ""))
    if not primary_kw and content_row:
        primary_kw = normalize_ws(content_row.get("Primary KW", ""))

    search_intent_raw = content_row.get("Search Intent", "") if content_row else ""
    search_intent = parse_search_intent(search_intent_raw)

    description = f"Comprehensive guide on {primary_kw or title.lower()} with practical, privacy-safe steps and internal resources."
    hero_image_rel = f"../../../assets/blog-images/{slug}.png"
    hero_alt = f"Hero image for {title}"

    required_links = parse_required_links(queue_row.get("required_links", ""))
    title_lookup = create_slug_title_lookup(queue_rows)
    related_block, unresolved_links = build_related_guides_section(target_url, required_links, title_lookup)

    # Add one natural in-body link when available.
    first_live_url = None
    first_live_title = None
    for _, url in required_links:
        if url == target_url:
            continue
        if is_live_blog_url(url):
            first_live_url = url
            first_live_title = title_lookup.get(slug_from_blog_url(url)) or slug_from_blog_url(url).replace("-", " ").title()
            break

    intro_link_sentence = ""
    if first_live_url and first_live_title:
        intro_link_sentence = f"For a related walkthrough, see [{first_live_title}]({first_live_url})."

    unresolved_todo = ""
    if unresolved_links:
        chunks = [f"{key}:{url}" for key, url in unresolved_links]
        unresolved_todo = "\n" + "\n".join(
            ["", "<!-- TODO(topical-authority-closure): add these links once live -->"]
            + [f"<!-- {chunk} -->" for chunk in chunks]
        )

    keywords_seed = primary_kw or title.lower()
    keywords = [kw for kw in [keywords_seed] if kw]
    keywords_yaml = "[" + ", ".join(yaml_quote(kw) for kw in keywords) + "]"

    frontmatter_lines = [
        "---",
        f"title: {yaml_quote(title)}",
        f"description: {yaml_quote(description)}",
        f"pubDate: {args.pub_date}",
        f"heroImage: {yaml_quote(hero_image_rel)}",
        f"heroAlt: {yaml_quote(hero_alt)}",
        f"keywords: {keywords_yaml}",
        f"cluster: {yaml_quote(cluster_id)}",
        f"subcluster: {yaml_quote(subcluster)}",
        f"primaryTool: {yaml_quote(primary_tool)}",
        f"searchIntent: {yaml_quote(search_intent)}",
        f"isPillar: {'true' if is_pillar else 'false'}",
        f"pillarSlug: {yaml_quote(pillar_slug or slug)}",
        "---",
    ]

    body = f"""
{title} helps readers solve a specific problem with actionable, step-by-step guidance.{(' ' + intro_link_sentence) if intro_link_sentence else ''}

## Why This Matters

- Explain the user problem clearly.
- Define what this guide will help them accomplish.
- Set expectations for the solution path.

## Step-by-Step Guide

1. Add your first actionable step.
2. Add your second actionable step.
3. Add your third actionable step.

## Common Mistakes to Avoid

- Mistake 1 and how to avoid it.
- Mistake 2 and safer alternative.

## FAQ

### Question 1

Provide a direct, concise answer.

### Question 2

Provide a direct, concise answer.

{related_block}
{unresolved_todo}
""".strip() + "\n"

    content = "\n".join(frontmatter_lines) + "\n\n" + body

    if args.dry_run:
        print(content)
    else:
        EN_BLOG_DIR.mkdir(parents=True, exist_ok=True)
        out_path.write_text(content, encoding="utf-8")
        print(f"Created: {out_path}")

    print(f"Slug: {slug}")
    print(f"Phase: {phase}")
    print(f"Live required links included: {len(required_links) - len(unresolved_links)}")
    print(f"Deferred links for closure pass: {len(unresolved_links)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
