import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The issue is that the translated blog pages don't export `enPosts` explicitly from the getStaticPaths
    # OR the `enPosts` variable is not available in the template scope.
    # Looking at tr/blog/[...slug].astro:
    # `enPosts` is defined *inside* `getStaticPaths()`, so it's not available in the main template body.
    # We need to fetch it in the frontmatter scope.

    # We need to add `const allPosts = await getCollection('blog');` and `const enPosts = allPosts.filter(p => p.slug.startsWith('en/'));`
    # to the top-level frontmatter if it's not there, but `allPosts` and `enPosts` are already inside `getStaticPaths`.
    # Actually, we can just grab it at the top level of the frontmatter:

    injection = """
const allPostsList = await getCollection('blog');
const enPosts = allPostsList.filter((p: any) => p.slug.startsWith('en/'));
"""
    
    # We should also fix the map implicitly any type by doing (p: any)
    
    if "const enPosts = allPostsList" not in content:
        # Insert after `const { post, originalSlug } = Astro.props;`
        content = content.replace("const { post, originalSlug } = Astro.props;", 
                                  "const { post, originalSlug } = Astro.props;\n" + injection)
                                  
    # Fix the map type: `enPosts.filter(p => p.slug !== originalSlug).slice(0, 4).map(p => {`
    # Replace with `enPosts.filter((p: any) => p.slug !== originalSlug).slice(0, 4).map((p: any) => {`
    content = content.replace("enPosts.filter(p =>", "enPosts.filter((p: any) =>")
    content = content.replace(".map(p => {", ".map((p: any) => {")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {file_path}")

def main():
    base_dir = '/Users/chioknyuon/Desktop/projects/video-downloader/frontend/src/pages'
    
    # Handle all blog slug files
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file == '[...slug].astro' and 'blog' in root:
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
