from app.services.downloader import get_video_info

urls = {
    "twitter": "https://twitter.com/elonmusk/status/1780572886749872583", # Try different format later
    "facebook": "https://www.facebook.com/facebook/videos/10153231379946729/"
}

for platform, url in urls.items():
    print(f"\n--- Testing {platform} ---")
    try:
        info = get_video_info(url)
        print(f"✅ Success: {info['title'][:50]}")
    except Exception as e:
        print(f"❌ Error: {e}")
