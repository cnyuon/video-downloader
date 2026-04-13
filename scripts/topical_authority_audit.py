#!/usr/bin/env python3
"""Audit topical-authority blog integration for EN content.

Checks:
- required frontmatter fields + enum validity
- hero image exists + 16:9 ratio check
- all /blog/... markdown links resolve
- required queue links are present, with mode-aware rules:
  - prepublish: require only links that are currently live
  - pillar-closure: require all required links

Optional reports:
- --report-csv <path>
- --report-md <path>
"""

from __future__ import annotations

import argparse
import csv
import re
import struct
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
QUEUE_CSV = ROOT / "topical_authority_publish_queue.csv"
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

VALID_SEARCH_INTENTS = {"informational", "commercial", "transactional", "navigational"}

REQUIRED_FRONTMATTER_FIELDS = [
    "title",
    "description",
    "pubDate",
    "heroImage",
    "cluster",
    "subcluster",
    "primaryTool",
    "searchIntent",
]


@dataclass
class Finding:
    severity: str  # error | warn
    code: str
    pillar: str
    slug: str
    message: str


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def slug_from_blog_url(url: str) -> str:
    value = normalize_ws(url)
    value = re.sub(r"^https?://[^/]+", "", value)
    return value.strip("/").split("/")[-1] if value else ""


def blog_url_from_slug(slug: str) -> str:
    return f"/blog/{slug}/"


def load_queue_rows(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def split_frontmatter(content: str) -> Tuple[Dict[str, str], str]:
    if not content.startswith("---\n"):
        return {}, content

    end = content.find("\n---\n", 4)
    if end == -1:
        return {}, content

    raw = content[4:end]
    body = content[end + 5 :]
    parsed: Dict[str, str] = {}

    for line in raw.splitlines():
        if not line or line.startswith(" ") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        if value.startswith('"') and value.endswith('"') and len(value) >= 2:
            value = value[1:-1]
        parsed[key] = value

    return parsed, body


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


def is_live_blog_url(url: str, available_post_slugs: set[str]) -> bool:
    slug = slug_from_blog_url(url)
    return slug in CLUSTER_IDS or slug in available_post_slugs


def read_png_size(path: Path) -> Optional[Tuple[int, int]]:
    with path.open("rb") as f:
        sig = f.read(8)
        if sig != b"\x89PNG\r\n\x1a\n":
            return None
        length = f.read(4)
        chunk_type = f.read(4)
        if len(length) != 4 or chunk_type != b"IHDR":
            return None
        data = f.read(8)
        if len(data) != 8:
            return None
        width, height = struct.unpack(">II", data)
        return int(width), int(height)


def get_image_size(path: Path) -> Optional[Tuple[int, int]]:
    suffix = path.suffix.lower()
    if suffix == ".png":
        size = read_png_size(path)
        if size is not None:
            return size

    # Best-effort fallback to Pillow for non-PNG assets.
    try:
        from PIL import Image  # type: ignore

        with Image.open(path) as img:
            return int(img.width), int(img.height)
    except Exception:
        return None


def is_ratio_16_9(width: int, height: int, tolerance: float = 0.03) -> bool:
    if width <= 0 or height <= 0:
        return False
    ratio = width / height
    return abs(ratio - (16 / 9)) <= tolerance


def extract_blog_links(body: str) -> List[str]:
    # markdown links like [text](/blog/slug/)
    return [m.group(1) for m in re.finditer(r"\]\((/blog/[^)\s]+)\)", body)]


def write_csv_report(path: Path, findings: List[Finding]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["severity", "code", "pillar", "slug", "message"])
        for item in findings:
            writer.writerow([item.severity, item.code, item.pillar, item.slug, item.message])


def write_markdown_report(path: Path, findings: List[Finding], mode: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    grouped: Dict[str, List[Finding]] = defaultdict(list)
    for item in findings:
        grouped[item.pillar].append(item)

    lines: List[str] = []
    lines.append("# Topical Authority Audit Report")
    lines.append("")
    lines.append(f"Mode: `{mode}`")
    lines.append("")
    lines.append(f"Total findings: **{len(findings)}**")
    lines.append("")

    if not findings:
        lines.append("No findings.")
    else:
        for pillar in sorted(grouped.keys()):
            lines.append(f"## {pillar}")
            lines.append("")
            for item in sorted(grouped[pillar], key=lambda x: (x.slug, x.severity, x.code)):
                lines.append(f"- `{item.severity}` `{item.slug}` `{item.code}`: {item.message}")
            lines.append("")

    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit EN topical authority content + links.")
    parser.add_argument("--mode", choices=["prepublish", "pillar-closure"], default="prepublish")
    parser.add_argument("--slug", help="Check a specific slug or /blog/<slug>/ URL")
    parser.add_argument("--pillar", help="Filter by exact or partial pillar label from queue")
    parser.add_argument("--report-csv", help="Optional CSV report output path")
    parser.add_argument("--report-md", help="Optional Markdown report output path")
    parser.add_argument("--allow-warnings", action="store_true", help="Do not fail on warning-only output")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not QUEUE_CSV.exists():
        print(f"ERROR: Missing queue file: {QUEUE_CSV}", file=sys.stderr)
        return 1

    queue_rows = load_queue_rows(QUEUE_CSV)
    available_post_slugs = {path.stem for path in EN_BLOG_DIR.glob("*.md")}

    # Scope selection
    scoped_rows = queue_rows
    if args.slug:
        target_slug = slug_from_blog_url(args.slug)
        scoped_rows = [r for r in scoped_rows if slug_from_blog_url(r.get("target_url", "")) == target_slug]
    if args.pillar:
        needle = args.pillar.lower()
        scoped_rows = [r for r in scoped_rows if needle in normalize_ws(r.get("pillar", "")).lower()]

    if not scoped_rows:
        print("No queue rows matched scope.")
        return 1

    findings: List[Finding] = []

    for row in scoped_rows:
        pillar = normalize_ws(row.get("pillar", "")) or "(unknown pillar)"
        phase = normalize_ws(row.get("phase", "")).lower()
        slug = slug_from_blog_url(row.get("target_url", ""))
        target_file = EN_BLOG_DIR / f"{slug}.md"

        if not target_file.exists():
            findings.append(Finding("error", "missing-post-file", pillar, slug, f"Missing post file: {target_file}"))
            continue

        raw = target_file.read_text(encoding="utf-8")
        frontmatter, body = split_frontmatter(raw)

        # Frontmatter required keys
        for field in REQUIRED_FRONTMATTER_FIELDS:
            if not normalize_ws(frontmatter.get(field, "")):
                findings.append(Finding("error", "missing-frontmatter", pillar, slug, f"Missing required frontmatter: `{field}`"))

        # Enum checks
        cluster_value = normalize_ws(frontmatter.get("cluster", ""))
        if cluster_value and cluster_value not in CLUSTER_IDS:
            findings.append(Finding("error", "invalid-cluster", pillar, slug, f"Invalid cluster value: `{cluster_value}`"))

        intent_value = normalize_ws(frontmatter.get("searchIntent", "")).lower()
        if intent_value and intent_value not in VALID_SEARCH_INTENTS:
            findings.append(Finding("error", "invalid-search-intent", pillar, slug, f"Invalid searchIntent value: `{intent_value}`"))

        # New pillar fields
        pillar_slug_expected = slug_from_blog_url(row.get("pillar_url", "")) or slug
        pillar_slug_actual = normalize_ws(frontmatter.get("pillarSlug", ""))
        if not pillar_slug_actual:
            findings.append(Finding("warn", "missing-pillar-slug", pillar, slug, "Missing `pillarSlug` frontmatter."))
        elif pillar_slug_actual != pillar_slug_expected:
            findings.append(
                Finding(
                    "warn",
                    "pillar-slug-mismatch",
                    pillar,
                    slug,
                    f"pillarSlug `{pillar_slug_actual}` does not match expected `{pillar_slug_expected}`.",
                )
            )

        is_pillar_raw = normalize_ws(frontmatter.get("isPillar", "")).lower()
        if phase == "pillar_page" and is_pillar_raw != "true":
            findings.append(Finding("error", "pillar-flag-missing", pillar, slug, "Pillar page must set `isPillar: true`."))

        # Hero image file + ratio checks
        hero_image_value = normalize_ws(frontmatter.get("heroImage", ""))
        if hero_image_value:
            hero_path = (target_file.parent / hero_image_value).resolve()
            if not hero_path.exists():
                findings.append(
                    Finding("error", "missing-hero-image", pillar, slug, f"heroImage file does not exist: {hero_image_value}")
                )
            else:
                size = get_image_size(hero_path)
                if size is None:
                    findings.append(
                        Finding(
                            "warn",
                            "hero-size-unreadable",
                            pillar,
                            slug,
                            f"Could not read image dimensions for: {hero_path.name}",
                        )
                    )
                else:
                    width, height = size
                    if not is_ratio_16_9(width, height):
                        findings.append(
                            Finding(
                                "error",
                                "hero-ratio-invalid",
                                pillar,
                                slug,
                                f"Hero image is {width}x{height}; expected ~16:9.",
                            )
                        )

        # Required related section standard
        if "### Related Guides" not in body:
            findings.append(
                Finding("warn", "missing-related-guides-block", pillar, slug, "Missing standardized `### Related Guides` section.")
            )

        # Resolve all /blog/... markdown links
        body_links = extract_blog_links(body)
        for url in body_links:
            if not is_live_blog_url(url, available_post_slugs):
                findings.append(
                    Finding("error", "broken-blog-link", pillar, slug, f"Unresolved internal blog link: {url}")
                )

        # Queue-required links with mode-aware policy
        required_links = parse_required_links(row.get("required_links", ""))
        for key, url in required_links:
            should_require = args.mode == "pillar-closure" or is_live_blog_url(url, available_post_slugs)
            if not should_require:
                continue

            if url not in raw:
                findings.append(
                    Finding(
                        "error",
                        "required-link-missing",
                        pillar,
                        slug,
                        f"Missing required link `{key}` -> {url}",
                    )
                )

    # Report + terminal summary
    error_count = sum(1 for f in findings if f.severity == "error")
    warn_count = sum(1 for f in findings if f.severity == "warn")

    print(f"Audit mode: {args.mode}")
    print(f"Rows checked: {len(scoped_rows)}")
    print(f"Errors: {error_count}")
    print(f"Warnings: {warn_count}")

    for item in findings:
        print(f"[{item.severity.upper()}] {item.slug} :: {item.code} :: {item.message}")

    if args.report_csv:
        write_csv_report(Path(args.report_csv), findings)
        print(f"CSV report: {args.report_csv}")
    if args.report_md:
        write_markdown_report(Path(args.report_md), findings, args.mode)
        print(f"Markdown report: {args.report_md}")

    if error_count > 0:
        return 1
    if warn_count > 0 and not args.allow_warnings:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
