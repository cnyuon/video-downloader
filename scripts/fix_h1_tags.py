import os
import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    changed = False
    
    # Simple state machine to ignore frontmatter
    in_frontmatter = False
    frontmatter_dashes = 0
    
    for line in lines:
        if line.strip() == '---':
            frontmatter_dashes += 1
            if frontmatter_dashes == 1:
                in_frontmatter = True
            elif frontmatter_dashes == 2:
                in_frontmatter = False
                
        # If it's outside frontmatter and starts with `# `, replace with `## `
        if not in_frontmatter and re.match(r'^#\s+', line):
            # Replace exactly the leading `# ` with `## `
            new_line = re.sub(r'^#\s+', '## ', line)
            new_lines.append(new_line)
            changed = True
        else:
            new_lines.append(line)
            
    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        print(f"Fixed H1 in {file_path}")

def main():
    blog_dir = os.path.join('/Users/chioknyuon/Desktop/projects/video-downloader', 'frontend', 'src', 'content', 'blog')
    for root, dirs, files in os.walk(blog_dir):
        for file in files:
            if file.endswith('.md'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
