import os
import re

def process_file(file_path, lang):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The block we want to add:
    block = """
        <!-- Recent Posts Section -->
        <div class="mt-20 pt-12 border-t max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold mb-6">{ui.%s['nav.blog']}</h2>
            <div class="grid gap-4 sm:grid-cols-2">
                {enPosts.filter(p => p.slug !== originalSlug).slice(0, 4).map(p => {
                    const postLang = '%s';
                    const trueSlug = p.slug.replace('en/', '');
                    return (
                        <a href={`/${postLang === 'en' ? '' : postLang + '/'}blog/${trueSlug}/`} class="group block p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all">
                            <h3 class="font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">{p.data.title}</h3>
                            <p class="text-sm text-muted-foreground line-clamp-2">{p.data.description}</p>
                        </a>
                    );
                })}
            </div>
        </div>
""" % (lang, lang)

    # We need to insert this right before the Related Tools Section
    if "<!-- Related Tools Section -->" in content and "<!-- Recent Posts Section -->" not in content:
        content = content.replace("<!-- Related Tools Section -->", block + "\n        <!-- Related Tools Section -->")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Added block to {file_path}")

def main():
    base_dir = '/Users/chioknyuon/Desktop/projects/video-downloader/frontend/src/pages'
    
    # Do english first
    en_file = os.path.join(base_dir, 'blog', '[...slug].astro')
    if os.path.exists(en_file):
        process_file(en_file, 'en')

    # Now all other langs
    for d in os.listdir(base_dir):
        lang_dir = os.path.join(base_dir, d, 'blog')
        if os.path.isdir(lang_dir) and d != 'blog':
            lang_file = os.path.join(lang_dir, '[...slug].astro')
            if os.path.exists(lang_file):
                process_file(lang_file, d)

if __name__ == '__main__':
    main()
