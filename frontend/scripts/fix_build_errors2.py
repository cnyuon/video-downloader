import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    old_content = content
    
    if "{displayPosts." not in content:
        # We should remove the injected 4 lines explicitly.
        # Since I'm not sure of the exact regex, I'll literally replace them.
        content = re.sub(r"const allPostsList = await getCollection\('blog'\);\s*const enPosts = allPostsList\.filter\(\(p: any\) => p\.slug\.startsWith\('(?:en|..)/'\)\);\s*const localPosts = allPostsList\.filter\(\(p: any\) => p\.slug\.startsWith\('(?:en|..)/'\)\);\s*const displayPosts = localPosts\.length > 0 \? localPosts : enPosts;\s*", "", content)
        
    if content != old_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed unused vars in {file_path}")

def main():
    base_dir = '/Users/chioknyuon/Desktop/projects/video-downloader/frontend/src/pages'
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.astro'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
