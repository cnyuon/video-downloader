/**
 * IndexNow Post-Deploy Ping Script
 * 
 * Reads the sitemap.xml and submits all URLs to Bing and Yandex via IndexNow API.
 * Run after every deploy: npm run indexnow
 * 
 * Usage:
 *   node scripts/indexnow-ping.cjs                  # Ping all URLs from sitemap
 *   node scripts/indexnow-ping.cjs --urls /blog/    # Ping only URLs matching pattern
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://getmediatools.com';
const KEY = '7e426e5fc9094056a02b11df05167f53';
const KEY_LOCATION = `${SITE_URL}/${KEY}.txt`;

// IndexNow supports multiple search engines
const SEARCH_ENGINES = [
    'api.indexnow.org',   // Shared endpoint (Bing, Yandex, others)
];

function extractUrlsFromSitemap(sitemapPath) {
    const content = fs.readFileSync(sitemapPath, 'utf8');
    const urls = [];
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(content)) !== null) {
        urls.push(match[1]);
    }
    return urls;
}

function postIndexNow(host, urls) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            host: 'getmediatools.com',
            key: KEY,
            keyLocation: KEY_LOCATION,
            urlList: urls,
        });

        const options = {
            hostname: host,
            port: 443,
            path: '/IndexNow',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body, host });
            });
        });

        req.on('error', (err) => reject({ error: err.message, host }));
        req.write(payload);
        req.end();
    });
}

async function main() {
    const sitemapPath = path.join(__dirname, '..', 'dist', 'sitemap.xml');

    if (!fs.existsSync(sitemapPath)) {
        console.error('❌ No sitemap.xml found in dist/. Run `npm run build` first.');
        process.exit(1);
    }

    let urls = extractUrlsFromSitemap(sitemapPath);

    // Optional filter
    const filterArg = process.argv.indexOf('--urls');
    if (filterArg !== -1 && process.argv[filterArg + 1]) {
        const pattern = process.argv[filterArg + 1];
        urls = urls.filter(u => u.includes(pattern));
        console.log(`🔍 Filtering to URLs matching "${pattern}"`);
    }

    console.log(`📋 Found ${urls.length} URLs in sitemap`);

    // IndexNow allows max 10,000 URLs per request
    const BATCH_SIZE = 10000;
    const batches = [];
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        batches.push(urls.slice(i, i + BATCH_SIZE));
    }

    console.log(`📡 Submitting ${batches.length} batch(es) to ${SEARCH_ENGINES.length} search engine(s)...\n`);

    for (const host of SEARCH_ENGINES) {
        for (let i = 0; i < batches.length; i++) {
            try {
                const result = await postIndexNow(host, batches[i]);
                const status = result.status;
                const emoji = status === 200 || status === 202 ? '✅' : '⚠️';
                console.log(`${emoji} ${host} (batch ${i + 1}): HTTP ${status}`);

                if (status === 200 || status === 202) {
                    console.log(`   Submitted ${batches[i].length} URLs successfully`);
                } else {
                    console.log(`   Response: ${result.body}`);
                }
            } catch (err) {
                console.log(`❌ ${host}: ${err.error || err}`);
            }
        }
    }

    console.log('\n✨ IndexNow ping complete!');
    console.log(`   Key: ${KEY}`);
    console.log(`   Total URLs submitted: ${urls.length}`);
}

main();
