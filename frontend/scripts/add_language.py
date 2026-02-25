#!/usr/bin/env python3
"""
Reusable script to add a new language to the video-downloader site.
Handles all infrastructure: config, navbar, pages, sitemap, footer.

Usage: python3 scripts/add_language.py <lang_code> <lang_name>
Example: python3 scripts/add_language.py pt Português
"""
import sys, os, re, shutil

if len(sys.argv) < 3:
    print("Usage: python3 scripts/add_language.py <lang_code> <lang_name>")
    print("Example: python3 scripts/add_language.py pt Português")
    sys.exit(1)

LANG = sys.argv[1]
LANG_NAME = sys.argv[2]
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

print(f"\n{'='*60}")
print(f"  Adding language: {LANG} ({LANG_NAME})")
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
# 2. Navbar.tsx — add language option
# ───────────────────────────────────────────────────
navbar_path = os.path.join(BASE, 'src', 'components', 'Navbar.tsx')
with open(navbar_path, 'r') as f:
    navbar = f.read()

option_tag = f'<option value="{LANG}">{LANG_NAME}</option>'
if f'value="{LANG}"' not in navbar:
    # Add to both desktop and mobile selects (after the last existing option)
    # Find all </select> and insert before them
    navbar = navbar.replace(
        '</select>',
        f'              {option_tag}\n            </select>',
        2  # Replace in both desktop and mobile
    )
    with open(navbar_path, 'w') as f:
        f.write(navbar)
    print(f"✅ Added {LANG_NAME} to Navbar.tsx (desktop + mobile)")
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
for page in tool_pages:
    src = os.path.join(es_dir, page)
    dst = os.path.join(lang_dir, page)
    if os.path.exists(dst):
        print(f"⏭️  {LANG}/{page} already exists")
        continue
    if not os.path.exists(src):
        print(f"⚠️  Source es/{page} not found, skipping")
        continue
    with open(src, 'r') as f:
        content = f.read()
    # Replace 'es' language references with new lang
    content = content.replace("'es'", f"'{LANG}'")
    content = content.replace('"es"', f'"{LANG}"')
    content = re.sub(r'/es/', f'/{LANG}/', content)
    content = content.replace("ui.es", f"ui.{LANG}")
    with open(dst, 'w') as f:
        f.write(content)
    print(f"✅ Created {LANG}/{page}")

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
        print(f"⏭️  {LANG}/blog/{blog_page} already exists")
        continue
    if not os.path.exists(src):
        print(f"⚠️  Source es/blog/{blog_page} not found, skipping")
        continue
    with open(src, 'r') as f:
        content = f.read()
    content = content.replace("'es'", f"'{LANG}'")
    content = content.replace('"es"', f'"{LANG}"')
    content = re.sub(r'/es/', f'/{LANG}/', content)
    content = content.replace("ui.es", f"ui.{LANG}")
    # Fix the nativePost slug lookup
    content = re.sub(
        r"p\.slug === `es/",
        f"p.slug === `{LANG}/",
        content
    )
    with open(dst, 'w') as f:
        f.write(content)
    print(f"✅ Created {LANG}/blog/{blog_page}")

# ───────────────────────────────────────────────────
# 5. Update sitemap.xml.ts
# ───────────────────────────────────────────────────
sitemap_path = os.path.join(pages_dir, 'sitemap.xml.ts')
with open(sitemap_path, 'r') as f:
    sitemap = f.read()

if f"'/{LANG}/'" not in sitemap:
    # Add static pages after the last /tr/ or /es/ block
    new_pages = f"""    '/{LANG}/',
    '/{LANG}/tiktok-downloader/',
    '/{LANG}/facebook-downloader/',
    '/{LANG}/twitter-downloader/',
    '/{LANG}/video-to-mp3/',
    '/{LANG}/thumbnail-grabber/',
    '/{LANG}/tiktok-sound-downloader/',
    '/{LANG}/blog/',"""

    # Insert before the closing bracket of staticPages
    sitemap = sitemap.replace(
        "  ];",
        f"{new_pages}\n  ];",
        1
    )

    # Add to localized blog posts array if 'es', 'tr' pattern exists
    if "['es', 'tr']" in sitemap:
        sitemap = sitemap.replace("['es', 'tr']", f"['es', 'tr', '{LANG}']")
    elif "['es']" in sitemap:
        sitemap = sitemap.replace("['es']", f"['es', '{LANG}']")

    # Add to changefreq/priority checks
    sitemap = re.sub(
        r"(page\.url === '/tr/')",
        rf"\1 || page.url === '/{LANG}/'",
        sitemap
    )

    with open(sitemap_path, 'w') as f:
        f.write(sitemap)
    print(f"✅ Updated sitemap.xml.ts with /{LANG}/ pages")
else:
    print(f"⏭️  /{LANG}/ already in sitemap")

# ───────────────────────────────────────────────────
# 6. Update Footer.astro regex
# ───────────────────────────────────────────────────
footer_path = os.path.join(BASE, 'src', 'components', 'Footer.astro')
with open(footer_path, 'r') as f:
    footer = f.read()

# Add lang to the slug-stripping regex
if LANG not in re.findall(r'\^\\?\(([^)]+)\)', footer)[0] if re.findall(r'\^\\?\(([^)]+)\)', footer) else '':
    footer = re.sub(
        r'\(en\|es\|([^)]+)\)',
        rf'(en|es|\1|{LANG})',
        footer
    )
    with open(footer_path, 'w') as f:
        f.write(footer)
    print(f"✅ Updated Footer.astro regex with '{LANG}'")
else:
    print(f"⏭️  '{LANG}' already in Footer regex")

# ───────────────────────────────────────────────────
# 7. Create blog content directory
# ───────────────────────────────────────────────────
blog_content_dir = os.path.join(BASE, 'src', 'content', 'blog', LANG)
os.makedirs(blog_content_dir, exist_ok=True)
print(f"✅ Created blog content directory: src/content/blog/{LANG}/")

# ───────────────────────────────────────────────────
# 8. Add language to ui.ts languages object
# ───────────────────────────────────────────────────
ui_path = os.path.join(BASE, 'src', 'i18n', 'ui.ts')
with open(ui_path, 'r') as f:
    ui = f.read()

if f"  {LANG}:" not in ui.split('} as const')[0]:
    # Add to languages object
    ui = re.sub(
        r"(export const languages = \{[^}]*)(})",
        rf"\1  {LANG}: '{LANG_NAME}',\n\2",
        ui
    )
    with open(ui_path, 'w') as f:
        f.write(ui)
    print(f"✅ Added {LANG}: '{LANG_NAME}' to ui.ts languages object")
else:
    print(f"⏭️  '{LANG}' already in ui.ts languages")

print(f"\n{'='*60}")
print(f"  Infrastructure complete for {LANG} ({LANG_NAME})!")
print(f"  Remaining manual steps:")
print(f"    1. Add {LANG} translations to ui.ts (324 keys)")
print(f"    2. Run translate_blogs.py for blog content")
print(f"    3. Build and verify")
print(f"{'='*60}\n")
