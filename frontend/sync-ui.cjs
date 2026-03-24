const fs = require('fs');
const path = require('path');

const locales = ['es', 'fr', 'de', 'ja', 'ko', 'ar', 'hi', 'pt', 'tr'];
const pagesDir = path.join(__dirname, 'src/pages');

// Helper to extract Layout block
function extractLayout(content) {
    const layoutStart = content.indexOf('<Layout');
    if (layoutStart === -1) return null;
    return content.substring(layoutStart);
}

// Helper to inject translation boilerplate
function ensureTranslationsBuiltIn(content) {
    let newContent = content;
    // Ensure `t` is defined in frontmatter if not present
    if (!newContent.includes('const t = useTranslations')) {
        // Find const lang = 'xx';
        newContent = newContent.replace(
            /const lang = '([a-z]+)';/g, 
            `const lang = '$1';\nconst t = useTranslations(lang);`
        );
    }
    
    // also ensure useTranslations is imported
    if (!newContent.includes('import { useTranslations }') && !newContent.includes('import { getLangFromUrl, useTranslations }')) {
        newContent = newContent.replace(
            "import { ui } from '../../../i18n/ui';",
            "import { useTranslations } from '../../../i18n/utils';\nimport { ui } from '../../../i18n/ui';"
        );
        newContent = newContent.replace(
            "import { ui } from '../../i18n/ui';",
            "import { useTranslations } from '../../i18n/utils';\nimport { ui } from '../../i18n/ui';"
        );
    }
    return newContent;
}

// 1. Sync [...slug].astro
const enSlugPath = path.join(pagesDir, 'blog/[...slug].astro');
const enSlugLayout = extractLayout(fs.readFileSync(enSlugPath, 'utf8'));

locales.forEach(locale => {
    const tgtPath = path.join(pagesDir, `${locale}/blog/[...slug].astro`);
    if (fs.existsSync(tgtPath)) {
        let content = fs.readFileSync(tgtPath, 'utf8');
        content = ensureTranslationsBuiltIn(content);

        // Ensure `headings` is imported from post.render()
        if (!content.includes('Content, headings')) {
            content = content.replace(
                /const { Content } = await post\.render\(\);/g,
                `const { Content, headings } = await post.render();`
            );
        }

        const tgtLayoutStart = content.indexOf('<Layout');
        if (tgtLayoutStart !== -1) {
            fs.writeFileSync(tgtPath, content.substring(0, tgtLayoutStart) + enSlugLayout);
            console.log(`Synced Layout for ${locale}/blog/[...slug].astro`);
        }
    }
});

// 2. Sync index.astro
const enHomePath = path.join(pagesDir, 'index.astro');
const enHomeLayout = extractLayout(fs.readFileSync(enHomePath, 'utf8'));

locales.forEach(locale => {
    const tgtPath = path.join(pagesDir, `${locale}/index.astro`);
    if (fs.existsSync(tgtPath)) {
        let content = fs.readFileSync(tgtPath, 'utf8');
        // index.astro often gets lang via Astro.url, let's keep it robust
        if (!content.includes('const t = useTranslations')) {
            if (content.match(/const lang = getLangFromUrl/)) {
                content = content.replace(
                    /const lang = getLangFromUrl\(Astro\.url\);/g,
                    `const lang = getLangFromUrl(Astro.url);\nconst t = useTranslations(lang);`
                );
            } else {
                content = content.replace(
                    /const lang = '([a-z]+)';/g, 
                    `const lang = '$1';\nconst t = useTranslations(lang);`
                );
            }
        }
        
        const tgtLayoutStart = content.indexOf('<Layout');
        if (tgtLayoutStart !== -1) {
            fs.writeFileSync(tgtPath, content.substring(0, tgtLayoutStart) + enHomeLayout);
            console.log(`Synced Layout for ${locale}/index.astro`);
        }
    }
});

// 3. Sync blog/index.astro
const enBlogHomePath = path.join(pagesDir, 'blog/index.astro');
const enBlogHomeLayout = extractLayout(fs.readFileSync(enBlogHomePath, 'utf8'));

locales.forEach(locale => {
    const tgtPath = path.join(pagesDir, `${locale}/blog/index.astro`);
    if (fs.existsSync(tgtPath)) {
        let content = fs.readFileSync(tgtPath, 'utf8');
        content = ensureTranslationsBuiltIn(content);
        
        // Ensure jsonLd is defined for Layout, since EN uses it
        if (!content.includes('const jsonLd =')) {
            const jsonLdCode = `
const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "MediaTools Blog",
    "url": \`https://getmediatools.com/\${lang}/blog/\`
};
`;
            const lastDashIndex = content.lastIndexOf('---');
            if (lastDashIndex !== -1) {
                content = content.slice(0, lastDashIndex) + jsonLdCode + content.slice(lastDashIndex);
            }
        }

        const tgtLayoutStart = content.indexOf('<Layout');
        if (tgtLayoutStart !== -1) {
            fs.writeFileSync(tgtPath, content.substring(0, tgtLayoutStart) + enBlogHomeLayout);
            console.log(`Synced Layout for ${locale}/blog/index.astro`);
        }
    }
});

console.log('UI Sync complete!');
