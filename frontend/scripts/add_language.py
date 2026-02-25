#!/usr/bin/env python3
"""
Reusable script to add a new language to the video-downloader site.
Handles all infrastructure: config, navbar, pages, sitemap, footer, ui.ts languages, blog dir.

Usage: python3 scripts/add_language.py <lang_code> <lang_name> <flag_emoji>
Example: python3 scripts/add_language.py de Deutsch 🇩🇪
"""
import sys, os, re, shutil

if len(sys.argv) < 4:
    print("Usage: python3 scripts/add_language.py <lang_code> <lang_name> <flag_emoji>")
    print("Example: python3 scripts/add_language.py de Deutsch 🇩🇪")
    sys.exit(1)

LANG = sys.argv[1]
LANG_NAME = sys.argv[2]
FLAG = sys.argv[3]
LANG_CODE_UPPER = LANG.upper()
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

print(f"\n{'='*60}")
print(f"  Adding language: {FLAG} {LANG} ({LANG_NAME})")
print(f"  Base: {BASE}")
print(f"{'='*60}\n")

# ───────────────────────────────────────────────────
# 1. astro.config.mjs — add locale
# ───────────────────────────────────────────────────
config_path = os.path.join(BASE, 'astro.config.mjs')
with open(config_path, 'r') as f:
    config = f.read()

if f'"{LANG}"' not in config:
    config = re.sub(
        r'(locales:\s*\[.*?)(])',
        rf'\1, "{LANG}"\2',
        config
    )
    with open(config_path, 'w') as f:
        f.write(config)
    print(f"✅ Added '{LANG}' to astro.config.mjs locales")
else:
    print(f"⏭️  '{LANG}' already in astro.config.mjs")

# ───────────────────────────────────────────────────
# 2. Navbar.tsx — add language option with flag
# ───────────────────────────────────────────────────
navbar_path = os.path.join(BASE, 'src', 'components', 'Navbar.tsx')
with open(navbar_path, 'r') as f:
    navbar = f.read()

if f'value="{LANG}"' not in navbar:
    # Desktop dropdown - full name
    desktop_option = f'                            <option value="{LANG}" className="bg-background text-foreground">{FLAG} {LANG_NAME}</option>\n                        </select>'
    # Mobile dropdown - code
    mobile_option = f'                            <option value="{LANG}" className="bg-background text-foreground">{FLAG} {LANG_CODE_UPPER}</option>\n                        </select>'

    # Replace first </select> with desktop option, second with mobile option
    parts = navbar.split('</select>')
    if len(parts) >= 3:
        navbar = parts[0] + desktop_option + parts[1] + mobile_option
        # Join remaining parts
        for i in range(2, len(parts)):
            navbar += '</select>' + parts[i]
    with open(navbar_path, 'w') as f:
        f.write(navbar)
    print(f"✅ Added {FLAG} {LANG_NAME} to Navbar.tsx (desktop + mobile)")
else:
    print(f"⏭️  {LANG_NAME} already in Navbar.tsx")

# ───────────────────────────────────────────────────
# 3. Create tool pages by copying from es/
# ───────────────────────────────────────────────────
pages_dir = os.path.join(BASE, 'src', 'pages')
lang_dir = os.path.join(pages_dir, LANG)
os.makedirs(lang_dir, exist_ok=True)

tool_pages = [
    'tiktok-downloader.astro',
    'twitter-downloader.astro',
    'facebook-downloader.astro',
    'video-to-mp3.astro',
    'thumbnail-grabber.astro',
    'tiktok-sound-downloader.astro',
    'index.astro',
]

es_dir = os.path.join(pages_dir, 'es')
pages_created = 0
for page in tool_pages:
    src = os.path.join(es_dir, page)
    dst = os.path.join(lang_dir, page)
    if os.path.exists(dst):
        continue
    if not os.path.exists(src):
        print(f"⚠️  Source es/{page} not found, skipping")
        continue
    with open(src, 'r') as f:
        content = f.read()
    content = content.replace("'es'", f"'{LANG}'")
    content = content.replace('"es"', f'"{LANG}"')
    content = re.sub(r'/es/', f'/{LANG}/', content)
    content = content.replace("ui.es", f"ui.{LANG}")
    with open(dst, 'w') as f:
        f.write(content)
    pages_created += 1
print(f"✅ Created {pages_created} tool pages in {LANG}/")

# ───────────────────────────────────────────────────
# 4. Create blog pages
# ───────────────────────────────────────────────────
blog_dir = os.path.join(lang_dir, 'blog')
os.makedirs(blog_dir, exist_ok=True)

es_blog_dir = os.path.join(es_dir, 'blog')
for blog_page in ['index.astro', '[...slug].astro']:
    src = os.path.join(es_blog_dir, blog_page)
    dst = os.path.join(blog_dir, blog_page)
    if os.path.exists(dst):
        continue
    if not os.path.exists(src):
        continue
    with open(src, 'r') as f:
        content = f.read()
    content = content.replace("'es'", f"'{LANG}'")
    content = content.replace('"es"', f'"{LANG}"')
    content = re.sub(r'/es/', f'/{LANG}/', content)
    content = content.replace("ui.es", f"ui.{LANG}")
    content = re.sub(r"p\.slug === `es/", f"p.slug === `{LANG}/", content)
    with open(dst, 'w') as f:
        f.write(content)
print(f"✅ Created {LANG}/blog/ pages")

# ───────────────────────────────────────────────────
# 5. Update sitemap.xml.ts — add to LANGS array
# ───────────────────────────────────────────────────
sitemap_path = os.path.join(pages_dir, 'sitemap.xml.ts')
with open(sitemap_path, 'r') as f:
    sitemap = f.read()

if f"'{LANG}'" not in sitemap:
    sitemap = re.sub(
        r"(const LANGS = \[.*?)(];)",
        rf"\1, '{LANG}'\2",
        sitemap
    )
    # Also add to changefreq/priority checks
    sitemap = re.sub(
        r"(page\.url === '/fr/')",
        rf"\1 || page.url === '/{LANG}/'",
        sitemap
    )
    with open(sitemap_path, 'w') as f:
        f.write(sitemap)
    print(f"✅ Updated sitemap.xml.ts LANGS array")
else:
    print(f"⏭️  '{LANG}' already in sitemap")

# ───────────────────────────────────────────────────
# 6. Update Footer.astro regex
# ───────────────────────────────────────────────────
footer_path = os.path.join(BASE, 'src', 'components', 'Footer.astro')
with open(footer_path, 'r') as f:
    footer = f.read()

if LANG not in footer:
    # Add lang to the slug-stripping regex: (en|es|tr|pt|fr) -> add |LANG
    footer = re.sub(
        r'\(en\|es\|([^)]+)\)',
        rf'(en|es|\1|{LANG})',
        footer
    )
    with open(footer_path, 'w') as f:
        f.write(footer)
    print(f"✅ Updated Footer.astro regex")
else:
    print(f"⏭️  '{LANG}' already in Footer regex")

# ───────────────────────────────────────────────────
# 7. Create blog content directory
# ───────────────────────────────────────────────────
blog_content_dir = os.path.join(BASE, 'src', 'content', 'blog', LANG)
os.makedirs(blog_content_dir, exist_ok=True)
print(f"✅ Created blog content directory")

# ───────────────────────────────────────────────────
# 8. Add language to ui.ts languages object
# ───────────────────────────────────────────────────
ui_path = os.path.join(BASE, 'src', 'i18n', 'ui.ts')
with open(ui_path, 'r') as f:
    ui = f.read()

if f"  {LANG}:" not in ui.split('} as const')[0].split('export const ui')[0]:
    ui = re.sub(
        r"(export const languages = \{[^}]*)(})",
        rf"\1  {LANG}: '{LANG_NAME}',\n\2",
        ui
    )
    with open(ui_path, 'w') as f:
        f.write(ui)
    print(f"✅ Added {LANG}: '{LANG_NAME}' to ui.ts languages")
else:
    print(f"⏭️  '{LANG}' already in ui.ts languages")

print(f"\n✅ Infrastructure complete for {FLAG} {LANG} ({LANG_NAME})!\n")
