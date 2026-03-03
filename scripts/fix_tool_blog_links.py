import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace `<a href="/blog/some-slug/"` with `<a href={getHref('/blog/some-slug/')} `
    # Note that the pages have `const getHref = ...` defined already.
    # Let's check if getHref is defined in these pages.
    # index.astro has getHref? No, index.astro usually uses `<a href="/blog/"`. Wait, index.astro doesn't have blog links.
    # Let's just fix `/blog/` links to use ``href={`/${lang}/blog/true-slug/`}`` or similar.

    if "getHref" in content:
        # replace `href="/blog/([^"]+)"` with `href={getHref('/blog/\1')}`
        new_content = re.sub(r'href="/blog/([^"]+)"', r"href={getHref('/blog/\1')}", content)
    else:
        # if getHref is missing, use lang variable if it exists?
        if "const lang =" in content:
            new_content = re.sub(r'href="/blog/([^"]+)"', r"href={lang === 'en' ? '/blog/\1' : `/${lang}/blog/\1`}", content)
        else:
            new_content = content
            
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed blog links in {file_path}")

def main():
    base_dir = '/Users/chioknyuon/Desktop/projects/video-downloader/frontend/src/pages'
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.astro'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
