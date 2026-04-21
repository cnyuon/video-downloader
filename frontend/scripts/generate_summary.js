const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'src/content/blog/');
const locales = fs.readdirSync(blogDir).filter(f => fs.statSync(path.join(blogDir, f)).isDirectory());

const enDir = path.join(blogDir, 'en');
const files = fs.readdirSync(enDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

let mdOutput = `# Comprehensive Blog Posts Summary\n\n`;
mdOutput += `This document contains a detailed overview of all blog posts, their descriptions, available translations, and all internal/external links included on each page.\n\n`;
mdOutput += `---\n\n`;

for (const file of files) {
  const content = fs.readFileSync(path.join(enDir, file), 'utf-8');
  
  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let title = file;
  let description = "No description available.";
  let cluster = "None";
  let searchIntent = "None";
  
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    const titleMatch = fm.match(/title:\s*["']?([^"'\n]+)["']?/);
    if (titleMatch) title = titleMatch[1].trim();
    
    const descMatch = fm.match(/description:\s*["']?([^"'\n]+)["']?/);
    if (descMatch) description = descMatch[1].trim();
    
    const clusterMatch = fm.match(/cluster:\s*["']?([^"'\n]+)["']?/);
    if (clusterMatch) cluster = clusterMatch[1].trim();

    const searchIntentMatch = fm.match(/searchIntent:\s*["']?([^"'\n]+)["']?/);
    if (searchIntentMatch) searchIntent = searchIntentMatch[1].trim();
  }
  
  // Try to snag the first actual content paragraph for extra detail
  let contentNoFm = content;
  if(frontmatterMatch) {
      contentNoFm = content.slice(frontmatterMatch[0].length).trim();
  }
  
  // Remove markdown headers and grab the first alphabet-starting line
  const textLines = contentNoFm.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('#'));
  let excerpt = "";
  if (textLines.length > 0) {
      excerpt = textLines[0].trim().substring(0, 300);
      if(excerpt.length === 300) excerpt += "...";
  }
  
  // Check available languages
  const availableLocales = locales.filter(loc => {
    return fs.existsSync(path.join(blogDir, loc, file));
  });
  
  // Find all links (skipping images, ensuring we capture Markdown and basic HTML a tags if any)
  const regex = /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g;
  let links = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push({text: match[1], url: match[2]});
  }
  
  mdOutput += `## ${title}\n\n`;
  mdOutput += `- **Filename**: \`${file}\`\n`;
  mdOutput += `- **Cluster**: ${cluster}\n`;
  mdOutput += `- **Translations (\`${availableLocales.length}\`)**: ${availableLocales.join(', ')}\n`;
  mdOutput += `- **Summary**: ${description} ${excerpt ? excerpt : ''}\n\n`;
  
  mdOutput += `### Links Included:\n`;
  if (links.length > 0) {
    for (const link of links) {
      mdOutput += `- **${link.text}**: ${link.url}\n`;
    }
  } else {
    mdOutput += `- *No links found*\n`;
  }
  mdOutput += `\n---\n\n`;
}

fs.writeFileSync(path.join(__dirname, 'blog_posts_summary.md'), mdOutput);
console.log('Successfully generated blog_posts_summary.md!');
