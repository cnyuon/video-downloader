import os
import re

def fix_blog_slugs(file_path, lang):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The current block uses `enPosts.filter(...)`
    # We want to change it to use a localized list.
    
    # Let's inject `const localPosts = allPostsList.filter((p: any) => p.slug.startsWith('${lang}/'));`
    # `const displayPosts = localPosts.length > 0 ? localPosts : enPosts;`
    
    if "const displayPosts" not in content:
        injection = f"\nconst localPosts = allPostsList.filter((p: any) => p.slug.startsWith('{lang}/'));\nconst displayPosts = localPosts.length > 0 ? localPosts : enPosts;\n"
        content = content.replace("const enPosts = allPostsList.filter((p: any) => p.slug.startsWith('en/'));", 
                                  "const enPosts = allPostsList.filter((p: any) => p.slug.startsWith('en/'));" + injection)
                                  
    # Now replace `{enPosts.filter` with `{displayPosts.filter`
    content = content.replace("{enPosts.filter((p: any) => p.slug !== originalSlug)", "{displayPosts.filter((p: any) => !p.slug.endsWith(originalSlug))")
    
    # Also fix the URL. Currently it says `<a href={`/es/blog/${trueSlug}/`}`
    # Wait, `p.slug` is `es/some-slug`. So `p.slug.replace('en/', '')` won't work if it's `es/`!
    # Let's change `const trueSlug = p.slug.replace('en/', '');` 
    # To `const trueSlug = p.slug.split('/').pop();`
    content = content.replace("const trueSlug = p.slug.replace('en/', '');", "const trueSlug = p.slug.split('/').pop();")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def add_recent_posts_to_tools(file_path, lang):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Is it already there?
    if "Recent Posts Section" in content:
        return
        
    # Inject frontmatter dependencies
    if "from 'astro:content'" not in content:
        content = content.replace("---", "---\nimport { getCollection } from 'astro:content';", 1)

    frontmatter_injection = f"""
const allPostsList = await getCollection('blog');
const enPosts = allPostsList.filter((p: any) => p.slug.startsWith('en/'));
const localPosts = allPostsList.filter((p: any) => p.slug.startsWith('{lang}/'));
const displayPosts = localPosts.length > 0 ? localPosts : enPosts;
"""
    if "const displayPosts" not in content:
        # insert at the end of frontmatter
        content = content.replace("\n---", frontmatter_injection + "\n---", 1) # Note: replaces first match, but we want the closing ---. Let's do it right before `---` that ends frontmatter.
        
        # better way to find the end of frontmatter:
        parts = content.split('---')
        if len(parts) >= 3:
            parts[1] = parts[1] + frontmatter_injection
            content = '---'.join(parts)

    prefix = f"/{lang}/" if lang != 'en' else "/"
    block = f"""
        <!-- Recent Posts Section -->
        <div class="mt-20 pt-12 border-t max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold mb-6">{{ui.{lang}['nav.blog'] || "Blog"}}</h2>
            <div class="grid gap-4 sm:grid-cols-2">
                {{displayPosts.slice(0, 4).map((p: any) => {{
                    const trueSlug = p.slug.split('/').pop();
                    return (
                        <a href={{`{prefix}blog/${{trueSlug}}/`}} class="group block p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all">
                            <h3 class="font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">{{p.data.title}}</h3>
                            <p class="text-sm text-muted-foreground line-clamp-2">{{p.data.description}}</p>
                        </a>
                    );
                }})}}
            </div>
            <div class="mt-6 text-center">
                <a href={{`{prefix}blog/`}} class="inline-flex items-center text-sm font-medium text-primary hover:underline">
                    {{ui.{lang}['btn.back_to_blog'] || "View all posts"}}
                    <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>
"""

    # We want to insert this before `</main>`
    content = content.replace("</main>", block + "\n    </main>")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Added recent posts to tool {file_path}")


def main():
    base_dir = '/Users/chioknyuon/Desktop/projects/video-downloader/frontend/src/pages'
    
    # 1. Fix blog slugs
    en_file = os.path.join(base_dir, 'blog', '[...slug].astro')
    if os.path.exists(en_file):
        fix_blog_slugs(en_file, 'en')

    for d in os.listdir(base_dir):
        lang_dir = os.path.join(base_dir, d, 'blog')
        if os.path.isdir(lang_dir) and d != 'blog':
            lang_file = os.path.join(lang_dir, '[...slug].astro')
            if os.path.exists(lang_file):
                fix_blog_slugs(lang_file, d)

    # 2. Add Recent Posts to tools: tiktok-downloader, twitter-downloader, facebook-downloader, tiktok-sound-downloader, video-to-mp3, thumbnail-grabber
    tools = ['tiktok-downloader.astro', 'twitter-downloader.astro', 'facebook-downloader.astro', 'tiktok-sound-downloader.astro', 'video-to-mp3.astro', 'thumbnail-grabber.astro']
    
    # English
    for tool in tools:
        f = os.path.join(base_dir, tool)
        if os.path.exists(f):
            add_recent_posts_to_tools(f, 'en')

    # other langs
    for d in os.listdir(base_dir):
        lang_dir = os.path.join(base_dir, d)
        if os.path.isdir(lang_dir) and d != 'blog':
            for tool in tools:
                f = os.path.join(lang_dir, tool)
                if os.path.exists(f):
                    add_recent_posts_to_tools(f, d)

if __name__ == '__main__':
    main()
