import os

def process_file(file_path, lang):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The issue: "This comparison appears to be unintentional because the types '"tr"' and '"en"' have no overlap."
    # Because `const postLang = 'tr';` is assigned as a literal string in the generated code, 
    # doing `postLang === 'en'` causes a TS error.
    
    # We will just rewrite the href dynamically in python so there's no ts error.
    prefix = f"/{lang}/" if lang != 'en' else "/"
    # Change `href={`/${postLang === 'en' ? '' : postLang + '/'}blog/${trueSlug}/`}` 
    # To `href={`{prefix}blog/${trueSlug}/`}`
    
    search_str = r"`/${postLang === 'en' ? '' : postLang + '/'}blog/${trueSlug}/`"
    replace_str = f"`{prefix}blog/${{trueSlug}}/`"
    
    content = content.replace(search_str, replace_str)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed TS Error in {file_path}")

def main():
    base_dir = '/Users/chioknyuon/Desktop/projects/video-downloader/frontend/src/pages'
    
    en_file = os.path.join(base_dir, 'blog', '[...slug].astro')
    if os.path.exists(en_file):
        process_file(en_file, 'en')

    for d in os.listdir(base_dir):
        lang_dir = os.path.join(base_dir, d, 'blog')
        if os.path.isdir(lang_dir) and d != 'blog':
            lang_file = os.path.join(lang_dir, '[...slug].astro')
            if os.path.exists(lang_file):
                process_file(lang_file, d)

if __name__ == '__main__':
    main()
