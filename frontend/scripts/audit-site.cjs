#!/usr/bin/env node
/**
 * Site Audit Script — Phase 1: Discovery & Documentation
 * 
 * Produces:
 * 1. Full URL inventory (every page, locale, type)
 * 2. Internal link graph (source → target, flags cross-locale bleeding)
 * 3. Issue report (broken links, orphan pages, redirect links, language bleeding)
 * 
 * Usage: node scripts/audit-site.js
 * Prerequisite: Run `npm run build` first so dist/ exists
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const SITE_URL = 'https://getmediatools.com';
const LOCALES = ['en', 'es', 'tr', 'pt', 'fr', 'de', 'ja', 'ko', 'ar', 'hi'];
const NON_DEFAULT_LOCALES = LOCALES.filter(l => l !== 'en');

// ─── 1. URL Inventory ───────────────────────────────────────────────

function walkHtmlFiles(dir, base = '') {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = path.join(base, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkHtmlFiles(path.join(dir, entry.name), rel));
        } else if (entry.name === 'index.html') {
            // Convert file path to URL path
            const urlPath = '/' + base.replace(/\\/g, '/') + '/';
            results.push(urlPath.replace(/\/+/g, '/'));
        }
    }
    return results;
}

function classifyUrl(urlPath) {
    const segments = urlPath.split('/').filter(Boolean);
    let locale = 'en';
    let cleanPath = urlPath;

    if (segments.length > 0 && NON_DEFAULT_LOCALES.includes(segments[0])) {
        locale = segments[0];
        cleanPath = '/' + segments.slice(1).join('/') + '/';
        if (cleanPath === '//') cleanPath = '/';
    }

    let type = 'static';
    if (cleanPath.startsWith('/blog/') && cleanPath !== '/blog/') {
        type = 'blog-post';
    } else if (cleanPath === '/blog/') {
        type = 'blog-index';
    } else if (cleanPath === '/') {
        type = 'homepage';
    } else if ([
        '/tiktok-downloader/', '/twitter-downloader/', '/facebook-downloader/',
        '/video-to-mp3/', '/thumbnail-grabber/', '/tiktok-sound-downloader/'
    ].includes(cleanPath)) {
        type = 'tool';
    }

    return { urlPath, locale, cleanPath, type };
}

// ─── 2. Internal Link Graph ─────────────────────────────────────────

function extractLinks(htmlContent) {
    const links = [];
    // Match all href attributes in anchor tags
    const regex = /<a\s[^>]*href=["']([^"'#][^"']*?)["'][^>]*>/gi;
    let match;
    while ((match = regex.exec(htmlContent)) !== null) {
        const href = match[1];
        // Only internal links
        if (href.startsWith('/') && !href.startsWith('//')) {
            links.push(href);
        } else if (href.startsWith(SITE_URL)) {
            links.push(href.replace(SITE_URL, ''));
        }
    }
    return links;
}

function extractImages(htmlContent) {
    const issues = [];
    const imgRegex = /<img\s([^>]*?)>/gi;
    let match;
    while ((match = imgRegex.exec(htmlContent)) !== null) {
        const attrs = match[1];
        const srcMatch = attrs.match(/src=["']([^"']+)["']/);
        const altMatch = attrs.match(/alt=["']([^"']*)["']/);
        const src = srcMatch ? srcMatch[1] : 'unknown';

        if (!altMatch || altMatch[1].trim() === '') {
            issues.push({ src, issue: 'missing_alt' });
        }
    }
    return issues;
}

function extractHeadings(htmlContent) {
    const h1s = [];
    const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
    let match;
    while ((match = h1Regex.exec(htmlContent)) !== null) {
        h1s.push(match[1].replace(/<[^>]+>/g, '').trim());
    }
    return h1s;
}

function extractMeta(htmlContent) {
    const titleMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = htmlContent.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
    const canonicalMatch = htmlContent.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);

    return {
        title: titleMatch ? titleMatch[1].trim() : null,
        titleLength: titleMatch ? titleMatch[1].trim().length : 0,
        description: descMatch ? descMatch[1].trim() : null,
        descriptionLength: descMatch ? descMatch[1].trim().length : 0,
        canonical: canonicalMatch ? canonicalMatch[1].trim() : null,
    };
}

function getLocaleFromPath(urlPath) {
    const segments = urlPath.split('/').filter(Boolean);
    if (segments.length > 0 && NON_DEFAULT_LOCALES.includes(segments[0])) {
        return segments[0];
    }
    return 'en';
}

// ─── 3. Main Audit ──────────────────────────────────────────────────

function runAudit() {
    if (!fs.existsSync(DIST_DIR)) {
        console.error('❌ dist/ directory not found. Run `npm run build` first.');
        process.exit(1);
    }

    console.log('🔍 Phase 1: Discovery & Documentation Audit\n');
    console.log('═'.repeat(60));

    // Step 1: URL Inventory
    const allUrls = walkHtmlFiles(DIST_DIR);
    const classified = allUrls.map(classifyUrl);

    console.log('\n📋 URL INVENTORY');
    console.log('─'.repeat(60));

    const byType = {};
    const byLocale = {};
    for (const page of classified) {
        byType[page.type] = (byType[page.type] || 0) + 1;
        byLocale[page.locale] = (byLocale[page.locale] || 0) + 1;
    }

    console.log(`  Total URLs: ${allUrls.length}`);
    console.log('\n  By Type:');
    for (const [type, count] of Object.entries(byType).sort()) {
        console.log(`    ${type}: ${count}`);
    }
    console.log('\n  By Locale:');
    for (const locale of LOCALES) {
        console.log(`    ${locale}: ${byLocale[locale] || 0}`);
    }

    // Step 2: Internal Link Graph + Issues
    const linkGraph = [];         // { source, target }
    const issues = [];
    const incomingLinks = {};     // target → count
    const imageIssues = [];
    const metaIssues = [];
    const h1Issues = [];

    const allUrlSet = new Set(allUrls.map(u => u.endsWith('/') ? u : u + '/'));

    for (const urlPath of allUrls) {
        const htmlFile = path.join(DIST_DIR, urlPath, 'index.html').replace(/\/\//g, '/');
        // Handle root case
        const actualFile = urlPath === '/'
            ? path.join(DIST_DIR, 'index.html')
            : path.join(DIST_DIR, urlPath.replace(/^\//, ''), 'index.html');

        if (!fs.existsSync(actualFile)) continue;

        const html = fs.readFileSync(actualFile, 'utf-8');
        const sourceLocale = getLocaleFromPath(urlPath);

        // Extract links
        const links = extractLinks(html);
        for (const target of links) {
            const normalizedTarget = target.endsWith('/') ? target : target + '/';
            linkGraph.push({ source: urlPath, target: normalizedTarget });
            incomingLinks[normalizedTarget] = (incomingLinks[normalizedTarget] || 0) + 1;

            const targetLocale = getLocaleFromPath(normalizedTarget);

            // Check: broken link
            if (!allUrlSet.has(normalizedTarget)) {
                issues.push({
                    type: 'BROKEN_LINK',
                    severity: '🔴',
                    source: urlPath,
                    target: normalizedTarget,
                    detail: 'Target URL does not exist in build output'
                });
            }

            // Check: language bleeding (cross-locale internal link)
            if (sourceLocale !== targetLocale) {
                issues.push({
                    type: 'LANGUAGE_BLEEDING',
                    severity: '🔴',
                    source: urlPath,
                    target: normalizedTarget,
                    detail: `Link from ${sourceLocale} page to ${targetLocale} page`
                });
            }
        }

        // Extract image issues
        const imgIssues = extractImages(html);
        for (const img of imgIssues) {
            imageIssues.push({ page: urlPath, ...img });
        }

        // Extract meta issues
        const meta = extractMeta(html);
        if (meta.titleLength > 60) {
            metaIssues.push({ page: urlPath, issue: 'title_too_long', length: meta.titleLength, value: meta.title });
        }
        if (meta.descriptionLength > 160) {
            metaIssues.push({ page: urlPath, issue: 'description_too_long', length: meta.descriptionLength });
        } else if (meta.descriptionLength > 0 && meta.descriptionLength < 120) {
            metaIssues.push({ page: urlPath, issue: 'description_too_short', length: meta.descriptionLength });
        } else if (!meta.description) {
            metaIssues.push({ page: urlPath, issue: 'description_missing' });
        }

        // Extract H1 issues
        const h1s = extractHeadings(html);
        if (h1s.length === 0) {
            h1Issues.push({ page: urlPath, issue: 'no_h1', count: 0 });
        } else if (h1s.length > 1) {
            h1Issues.push({ page: urlPath, issue: 'multiple_h1', count: h1s.length, h1s });
        }
    }

    // Step 3: Orphan pages (< 2 incoming links)
    const lowLinkPages = allUrls.filter(u => {
        const normalized = u.endsWith('/') ? u : u + '/';
        return (incomingLinks[normalized] || 0) < 2;
    });

    // ─── Report ───

    console.log('\n\n🔗 INTERNAL LINK ANALYSIS');
    console.log('─'.repeat(60));
    console.log(`  Total internal links found: ${linkGraph.length}`);

    // Language bleeding
    const bleedingIssues = issues.filter(i => i.type === 'LANGUAGE_BLEEDING');
    console.log(`\n  🔴 Language Bleeding (cross-locale links): ${bleedingIssues.length}`);
    if (bleedingIssues.length > 0) {
        // Group by source locale
        const bySource = {};
        for (const issue of bleedingIssues) {
            const key = `${getLocaleFromPath(issue.source)} → ${getLocaleFromPath(issue.target)}`;
            bySource[key] = (bySource[key] || 0) + 1;
        }
        for (const [key, count] of Object.entries(bySource)) {
            console.log(`    ${key}: ${count} links`);
        }
        console.log('\n  First 10 examples:');
        for (const issue of bleedingIssues.slice(0, 10)) {
            console.log(`    ${issue.source} → ${issue.target}`);
        }
    }

    // Broken links
    const brokenLinks = issues.filter(i => i.type === 'BROKEN_LINK');
    console.log(`\n  🔴 Broken Internal Links: ${brokenLinks.length}`);
    if (brokenLinks.length > 0) {
        const uniqueTargets = [...new Set(brokenLinks.map(b => b.target))];
        console.log(`    Unique broken targets: ${uniqueTargets.length}`);
        for (const target of uniqueTargets.slice(0, 15)) {
            const sources = brokenLinks.filter(b => b.target === target).map(b => b.source);
            console.log(`    ✗ ${target} (linked from ${sources.length} pages)`);
        }
        if (uniqueTargets.length > 15) {
            console.log(`    ... and ${uniqueTargets.length - 15} more`);
        }
    }

    // Low incoming links
    console.log(`\n  ⚠️  Pages with < 2 incoming links: ${lowLinkPages.length}`);
    if (lowLinkPages.length > 0) {
        for (const page of lowLinkPages.slice(0, 10)) {
            const normalized = page.endsWith('/') ? page : page + '/';
            console.log(`    ${page} (${incomingLinks[normalized] || 0} incoming)`);
        }
        if (lowLinkPages.length > 10) {
            console.log(`    ... and ${lowLinkPages.length - 10} more`);
        }
    }

    // Image issues
    console.log('\n\n🖼️  IMAGE AUDIT');
    console.log('─'.repeat(60));
    console.log(`  Total images missing alt text: ${imageIssues.length}`);
    // Group by src
    const bySrc = {};
    for (const img of imageIssues) {
        bySrc[img.src] = (bySrc[img.src] || 0) + 1;
    }
    console.log(`  Unique images missing alt: ${Object.keys(bySrc).length}`);
    for (const [src, count] of Object.entries(bySrc).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
        console.log(`    ${src} (on ${count} pages)`);
    }

    // Meta issues
    console.log('\n\n📝 META TAG AUDIT');
    console.log('─'.repeat(60));
    const metaByType = {};
    for (const m of metaIssues) {
        metaByType[m.issue] = (metaByType[m.issue] || 0) + 1;
    }
    for (const [issue, count] of Object.entries(metaByType)) {
        console.log(`  ${issue}: ${count} pages`);
    }
    if (metaIssues.filter(m => m.issue === 'title_too_long').length > 0) {
        console.log('\n  Titles too long (first 10):');
        for (const m of metaIssues.filter(m => m.issue === 'title_too_long').slice(0, 10)) {
            console.log(`    [${m.length} chars] ${m.page}: ${m.value?.substring(0, 70)}...`);
        }
    }

    // H1 issues
    console.log('\n\n🏷️  H1 AUDIT');
    console.log('─'.repeat(60));
    const multiH1 = h1Issues.filter(h => h.issue === 'multiple_h1');
    const noH1 = h1Issues.filter(h => h.issue === 'no_h1');
    console.log(`  Pages with multiple H1: ${multiH1.length}`);
    for (const h of multiH1) {
        console.log(`    ${h.page} (${h.count} H1s): ${h.h1s?.map(h => h.substring(0, 40)).join(' | ')}`);
    }
    console.log(`  Pages with no H1: ${noH1.length}`);
    for (const h of noH1.slice(0, 5)) {
        console.log(`    ${h.page}`);
    }

    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  Total pages:           ${allUrls.length}`);
    console.log(`  Language bleeding:      ${bleedingIssues.length} links`);
    console.log(`  Broken internal links:  ${brokenLinks.length}`);
    console.log(`  Low incoming links:     ${lowLinkPages.length} pages`);
    console.log(`  Missing alt text:       ${imageIssues.length} images`);
    console.log(`  Meta issues:            ${metaIssues.length}`);
    console.log(`  H1 issues:              ${h1Issues.length}`);
    console.log('');

    // Write detailed JSON report
    const report = {
        timestamp: new Date().toISOString(),
        urlInventory: classified,
        summary: {
            totalPages: allUrls.length,
            byType,
            byLocale,
            languageBleeding: bleedingIssues.length,
            brokenLinks: brokenLinks.length,
            lowIncomingLinks: lowLinkPages.length,
            missingAlt: imageIssues.length,
            metaIssues: metaIssues.length,
            h1Issues: h1Issues.length,
        },
        languageBleeding: bleedingIssues,
        brokenLinks,
        lowIncomingLinks: lowLinkPages,
        imageIssues,
        metaIssues,
        h1Issues,
    };

    const reportPath = path.join(__dirname, 'audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: scripts/audit-report.json`);
}

runAudit();
