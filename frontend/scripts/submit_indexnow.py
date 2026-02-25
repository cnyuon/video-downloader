#!/usr/bin/env python3
"""
Submit ALL site URLs to IndexNow (Bing + Yandex) in bulk.
IndexNow API allows submitting up to 10,000 URLs per request.

Usage: python3 scripts/submit_indexnow.py
"""
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import xml.etree.ElementTree as ET

SITE = "https://getmediatools.com"
KEY = "7e426e5fc9094056a02b11df05167f53"
KEY_LOCATION = f"{SITE}/{KEY}.txt"

# IndexNow endpoints (submitting to one notifies ALL participating engines)
INDEXNOW_ENDPOINTS = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
]

def get_urls_from_sitemap():
    """Parse sitemap.xml to get all URLs."""
    print(f"  Fetching sitemap from {SITE}/sitemap.xml ...")
    req = Request(f"{SITE}/sitemap.xml")
    req.add_header("User-Agent", "MediaTools-IndexNow/1.0")
    with urlopen(req) as resp:
        xml_content = resp.read().decode('utf-8')
    
    # Parse XML
    root = ET.fromstring(xml_content)
    ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    urls = []
    for url_elem in root.findall('.//sm:url/sm:loc', ns):
        urls.append(url_elem.text)
    
    return urls

def submit_to_indexnow(urls, endpoint):
    """Submit URLs to a single IndexNow endpoint."""
    payload = {
        "host": "getmediatools.com",
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = Request(endpoint, data=data, method='POST')
    req.add_header('Content-Type', 'application/json; charset=utf-8')
    req.add_header('User-Agent', 'MediaTools-IndexNow/1.0')
    
    try:
        with urlopen(req) as resp:
            status = resp.status
            return status
    except HTTPError as e:
        return e.code

def main():
    print("=" * 60)
    print("  IndexNow Bulk URL Submission")
    print("=" * 60)
    
    # Get all URLs from sitemap
    urls = get_urls_from_sitemap()
    print(f"  Found {len(urls)} URLs in sitemap\n")
    
    # Show URL breakdown
    langs = {}
    for url in urls:
        parts = url.replace(SITE, '').strip('/').split('/')
        lang = parts[0] if parts[0] in ['es','tr','pt','fr','de','ja','ko','ar','hi'] else 'en'
        langs[lang] = langs.get(lang, 0) + 1
    
    print("  URL breakdown by language:")
    for lang, count in sorted(langs.items()):
        print(f"    {lang}: {count}")
    print()
    
    # Submit to each IndexNow endpoint
    for endpoint in INDEXNOW_ENDPOINTS:
        name = endpoint.split('/')[2]
        status = submit_to_indexnow(urls, endpoint)
        
        status_msg = {
            200: "✅ OK — URLs submitted successfully",
            202: "✅ Accepted — URLs accepted for processing",
            400: "❌ Bad request — check payload format",
            403: "❌ Forbidden — key mismatch",
            422: "❌ Unprocessable — URLs don't match host",
            429: "⚠️  Too many requests — rate limited",
        }.get(status, f"⚠️  HTTP {status}")
        
        print(f"  [{name:<20}] {status_msg} ({len(urls)} URLs)")
    
    print(f"\n{'=' * 60}")
    print(f"  Done! Submitted {len(urls)} URLs to {len(INDEXNOW_ENDPOINTS)} endpoints")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
