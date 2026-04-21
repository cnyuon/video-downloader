const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const workspaceDir = '/Users/chioknyuon/Desktop/projects/video-downloader';
const contentDir = path.join(workspaceDir, 'frontend/src/content/blog');

// Get all git tracked files
let gitFiles = [];
try {
  const output = execSync('git ls-files frontend/src/assets/blog-images', { cwd: workspaceDir }).toString();
  gitFiles = output.split('\n').filter(Boolean);
} catch (e) {
  console.error('Failed to get git ls-files', e);
  process.exit(1);
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const mdFiles = [];
walkDir(contentDir, filePath => {
  if (filePath.endsWith('.md') || filePath.endsWith('.mdx')) {
    mdFiles.push(filePath);
  }
});

let errors = [];

mdFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const match = content.match(/heroImage:\s*["']([^"']+)["']/);
  if (match) {
    const rawPath = match[1];
    
    // Resolve relative to markdown file directory
    const resolvedPath = path.resolve(path.dirname(file), rawPath);
    
    // Make path relative to workspace root
    const rootRelativePath = path.relative(workspaceDir, resolvedPath);
    
    // Check if it's in git exactly as cased
    if (!gitFiles.includes(rootRelativePath)) {
      // It's not in git exactly as is. Let's see if there's a case mismatch
      const caseMismatch = gitFiles.find(g => g.toLowerCase() === rootRelativePath.toLowerCase());
      if (caseMismatch) {
        errors.push(`CASE MISMATCH: ${path.relative(workspaceDir, file)} points to ${rootRelativePath} but git has ${caseMismatch}`);
      } else {
        // Maybe it exists on disk but not in git?
        if (fs.existsSync(resolvedPath)) {
          errors.push(`UNTRACKED/IGNORED: ${path.relative(workspaceDir, file)} points to ${rootRelativePath} which exists locally but NOT in git ls-files!`);
        } else {
          errors.push(`MISSING FILE: ${path.relative(workspaceDir, file)} points to ${rootRelativePath} which does not exist locally either.`);
        }
      }
    }
  } else {
    // maybe no heroImage, remember heroImage is optional
  }
});

if (errors.length > 0) {
  console.log("Errors Found:");
  errors.forEach(e => console.log(e));
} else {
  console.log("All heroImages match tracked git files correctly.");
}
