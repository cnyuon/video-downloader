import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        old_content = content

    # Fix duplicate frontmatter blocks
    block_regex = r"const allPostsList = await getCollection\('blog'\);\nconst enPosts = allPostsList\.filter\(\(p: any\) => p\.slug\.startsWith\('(?:en|..)/'\)\);\nconst localPosts = allPostsList\.filter\(\(p: any\) => p\.slug\.startsWith\('(?:en|..)/'\)\);\nconst displayPosts = localPosts\.length > 0 \? localPosts : enPosts;\n"
    blocks = re.findall(block_regex, content)
    if len(blocks) > 1:
        # keep only the last one
        content = content.replace(blocks[0], "", len(blocks) - 1)
        
    # Also some tools had `const allPostsList = await getCollection('blog');\nconst enPosts = allPostsList.filter((p: any) => p.slug.startsWith('en/'));` independently.
    # We should just wipe out any `const allPostsList = await getCollection('blog');` that occurs multiple times.
    parts = content.split("const allPostsList = await getCollection('blog');")
    if len(parts) > 2:
        # That means it appears more than once. The last one should be kept.
        # But maybe we just remove ALL declarations and insert a pristine one before the ending ---
        pass
        
    # Let's remove all instances of the declarations
    content = re.sub(r"const allPostsList = await getCollection\('blog'\);\n?", "", content)
    content = re.sub(r"const enPosts = allPostsList\.filter\(\(p: any\) => p\.slug\.startsWith\('en/'\)\);\n?", "", content)
    content = re.sub(r"const localPosts = allPostsList\.filter\(\(p: any\) => p\.slug\.startsWith\('..?'/'\)\);\n?", "", content)
    content = re.sub(r"const localPosts = allPostsList\.filter\(\(p: any\) => p\.slug\.startsWith\('..?'\)\);\n?", "", content)
    content = re.sub(r"const localPosts = allPostsList\.filter\(\(p: any\) => p\.slug\.startsWith\('[^']+'\)\);\n?", "", content)
    content = re.sub(r"const displayPosts = localPosts\.length > 0 \? localPosts : enPosts;\n?", "", content)

    # Re-insert cleanly for tool pages and blog pages
    lang = 'en'
    match = re.search(r"src/pages/([^/]+)/", file_path)
    if match and match.group(1) != 'blog':
        lang = match.group(1)

    injection = f"\nconst allPostsList = await getCollection('blog');\nconst enPosts = allPostsList.filter((p: any) => p.slug.startsWith('en/'));\nconst localPosts = allPostsList.filter((p: any) => p.slug.startsWith('{lang}/'));\nconst displayPosts = localPosts.length > 0 ? localPosts : enPosts;\n"

    # Insert it right before the FIRST occurrence of "\n---" after the first line "---"
    # Actually, the frontmatter splits by '---'
    f_parts = content.split('---')
    if len(f_parts) >= 3:
        f_parts[1] = f_parts[1].rstrip() + injection
        content = '---'.join(f_parts)

    # Fix `import type { ui }`
    content = content.replace("import type { ui }", "import { ui }")
    
    # If `{ ui }` isn't imported from ui, but is used:
    if "ui." in content and "import { ui }" not in content and "import { ui" not in content and "import ui" not in content:
        # find `import` statements
        # inject import { ui } from '../../i18n/ui'; or something
        content = content.replace("---", "---\nimport { ui } from '../../i18n/ui';", 1)
        # Wait, the path might be wrong. Let's dynamically find it.
        depth = file_path.count('/') - 8 # frontend/src/pages = 8 slashes roughly
        
    if content != old_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed build errors in {file_path}")

def main():
    base_dir = '/Users/chioknyuon/Desktop/projects/video-downloader/frontend/src/pages'
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.astro'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
