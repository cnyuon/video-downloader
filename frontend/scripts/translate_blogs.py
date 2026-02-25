#!/usr/bin/env python3
"""
Translate all EN blog posts to a target language using Google Cloud Translation API.
Preserves markdown structure, Astro components, and internal links.

Usage: python3 scripts/translate_blogs.py <lang_code> <api_key>
Example: python3 scripts/translate_blogs.py pt AIzaSy...

The script:
1. Reads each EN blog post
2. Extracts translatable text blocks (skipping imports, components, links, code)
3. Batch-translates via Google Cloud Translation API v2
4. Reconstructs the markdown with translated text
5. Fixes internal links to use /{lang}/ prefix
6. Writes to src/content/blog/{lang}/
"""
import sys, os, re, json, time
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError

if len(sys.argv) < 3:
    print("Usage: python3 scripts/translate_blogs.py <lang_code> <api_key>")
    sys.exit(1)

LANG = sys.argv[1]
API_KEY = sys.argv[2]
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EN_BLOG = os.path.join(BASE, 'src', 'content', 'blog', 'en')
TARGET_BLOG = os.path.join(BASE, 'src', 'content', 'blog', LANG)
os.makedirs(TARGET_BLOG, exist_ok=True)

TRANSLATE_URL = f"https://translation.googleapis.com/language/translate/v2?key={API_KEY}"

# Internal link patterns that need /{lang}/ prefix
TOOL_PATHS = [
    'tiktok-downloader', 'twitter-downloader', 'facebook-downloader',
    'video-to-mp3', 'tiktok-sound-downloader', 'thumbnail-grabber', 'blog'
]

def google_translate(texts, target_lang, source_lang='en'):
    """Translate a batch of texts using Google Cloud Translation API v2."""
    if not texts:
        return []

    # API has a limit per request, batch in groups of 50
    results = []
    for i in range(0, len(texts), 50):
        batch = texts[i:i+50]
        data = {
            'q': batch,
            'target': target_lang,
            'source': source_lang,
            'format': 'text'
        }
        json_data = json.dumps(data).encode('utf-8')
        req = Request(TRANSLATE_URL, data=json_data, method='POST')
        req.add_header('Content-Type', 'application/json')

        try:
            with urlopen(req) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                for t in result['data']['translations']:
                    results.append(t['translatedText'])
        except HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"  ❌ API Error: {e.code} - {error_body}")
            # Return originals on error
            results.extend(batch)

        # Small delay to avoid rate limiting
        if i + 50 < len(texts):
            time.sleep(0.1)

    return results


def split_content(content):
    """Split markdown content into translatable and non-translatable parts.
    Returns a list of (text, should_translate) tuples."""
    parts = []
    lines = content.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i]

        # Skip empty lines
        if line.strip() == '':
            parts.append((line, False))
            i += 1
            continue

        # Skip import statements
        if line.strip().startswith('import '):
            parts.append((line, False))
            i += 1
            continue

        # Skip Astro component blocks (<InContentCTA ... />)
        if line.strip().startswith('<') and ('InContentCTA' in line or line.strip().startswith('</')):
            # Collect the entire component block
            block = [line]
            while i + 1 < len(lines) and '/>' not in line:
                i += 1
                line = lines[i]
                block.append(line)
            parts.append(('\n'.join(block), False))
            i += 1
            continue

        # Skip frontmatter (already handled separately)
        if line.strip() == '---':
            parts.append((line, False))
            i += 1
            continue

        # Skip horizontal rules
        if line.strip() == '***' or line.strip() == '---':
            parts.append((line, False))
            i += 1
            continue

        # Skip table separator rows
        if re.match(r'^\|[-\s|:]+\|$', line.strip()):
            parts.append((line, False))
            i += 1
            continue

        # Translate everything else
        parts.append((line, True))
        i += 1

    return parts


def protect_markdown(text):
    """Replace markdown elements that shouldn't be translated with placeholders."""
    placeholders = {}
    counter = [0]

    def make_placeholder(match):
        key = f"__PH{counter[0]}__"
        counter[0] += 1
        placeholders[key] = match.group(0)
        return key

    # Protect inline code
    text = re.sub(r'`[^`]+`', make_placeholder, text)

    # Protect markdown links [text](url) - protect just the URL part
    text = re.sub(r'\]\([^)]+\)', make_placeholder, text)

    # Protect image references
    text = re.sub(r'!\[[^\]]*\]\([^)]+\)', make_placeholder, text)

    # Protect bold markers (but keep inner text)
    # We protect ** markers so they don't get separated
    text = re.sub(r'\*\*', make_placeholder, text)

    # Protect URLs
    text = re.sub(r'https?://[^\s)]+', make_placeholder, text)

    return text, placeholders


def restore_markdown(text, placeholders):
    """Restore markdown elements from placeholders."""
    for key, value in placeholders.items():
        text = text.replace(key, value)
    return text


def fix_internal_links(content, lang):
    """Add /{lang}/ prefix to internal links."""
    tool_pattern = '|'.join(TOOL_PATHS)

    # Fix markdown links: [text](/tool-page/) -> [text](/lang/tool-page/)
    content = re.sub(
        rf'\]\(/({tool_pattern})/',
        rf'](/{lang}/\1/',
        content
    )

    # Fix CTA targetUrl
    content = re.sub(
        rf'targetUrl="\/({tool_pattern})/',
        rf'targetUrl="/{lang}/\1/',
        content
    )

    return content


def translate_frontmatter(fm_text, lang):
    """Translate only the title and description in frontmatter."""
    lines = fm_text.split('\n')
    to_translate = []
    translate_indices = []

    for i, line in enumerate(lines):
        if line.startswith('title: "') or line.startswith('description: "'):
            # Extract the quoted value
            match = re.match(r'(\w+): "(.*)"', line)
            if match:
                to_translate.append(match.group(2))
                translate_indices.append((i, match.group(1)))

    if to_translate:
        translated = google_translate(to_translate, lang)
        for (idx, key), trans_text in zip(translate_indices, translated):
            # Unescape HTML entities that Google Translate may add
            trans_text = trans_text.replace('&#39;', "'").replace('&quot;', '"').replace('&amp;', '&')
            # Remove inner double quotes to prevent YAML parse errors
            trans_text = trans_text.replace('"', '')
            lines[idx] = f'{key}: "{trans_text}"'

    return '\n'.join(lines)


def translate_blog_post(filepath, lang):
    """Translate a single blog post."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split frontmatter from body
    fm_match = re.match(r'^---\n(.*?)\n---\n(.*)', content, re.DOTALL)
    if not fm_match:
        return content

    frontmatter = fm_match.group(1)
    body = fm_match.group(2)

    # Translate frontmatter (title + description only)
    translated_fm = translate_frontmatter(frontmatter, lang)

    # Split body into parts
    parts = split_content(body)

    # Collect translatable texts, protecting markdown syntax
    texts_to_translate = []
    placeholder_maps = []
    translate_part_indices = []

    for i, (text, should_translate) in enumerate(parts):
        if should_translate and text.strip():
            protected, placeholders = protect_markdown(text)
            texts_to_translate.append(protected)
            placeholder_maps.append(placeholders)
            translate_part_indices.append(i)

    # Batch translate
    if texts_to_translate:
        translated_texts = google_translate(texts_to_translate, lang)

        # Restore markdown and update parts
        for idx, (trans_text, placeholders) in enumerate(zip(translated_texts, placeholder_maps)):
            part_idx = translate_part_indices[idx]
            # Unescape HTML entities
            trans_text = trans_text.replace('&#39;', "'").replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
            restored = restore_markdown(trans_text, placeholders)
            parts[part_idx] = (restored, True)

    # Reconstruct body
    translated_body = '\n'.join(text for text, _ in parts)

    # Fix internal links
    translated_body = fix_internal_links(translated_body, lang)

    # Reconstruct full content
    result = f"---\n{translated_fm}\n---\n{translated_body}"

    return result


# ───────────────────────────────────────────────────
# Main execution
# ───────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"  Translating blog posts to: {LANG}")
print(f"  Source: {EN_BLOG}")
print(f"  Target: {TARGET_BLOG}")
print(f"{'='*60}\n")

en_files = sorted([f for f in os.listdir(EN_BLOG) if f.endswith('.md')])
total_chars = 0

for filename in en_files:
    en_path = os.path.join(EN_BLOG, filename)
    target_path = os.path.join(TARGET_BLOG, filename)

    print(f"  Translating: {filename}...", end=' ', flush=True)

    with open(en_path, 'r') as f:
        original = f.read()
    total_chars += len(original)

    translated = translate_blog_post(en_path, LANG)

    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(translated)

    print(f"✅ ({len(original)} chars)")

print(f"\n{'='*60}")
print(f"  Done! {len(en_files)} posts translated to {LANG}")
print(f"  Total characters processed: {total_chars:,}")
print(f"  Output: {TARGET_BLOG}")
print(f"{'='*60}\n")
