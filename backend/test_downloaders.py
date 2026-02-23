from app.services.downloader import get_video_info
import sys

test_urls = {
    "tiktok": "https://www.tiktok.com/@mrbeast/video/7311138402288012586",
    "twitter": "https://twitter.com/SpaceX/status/1780572886749872583",
    "facebook": "https://www.facebook.com/watch/?v=123456789", # placeholder or generic
    "youtube": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}

for platform, url in test_urls.items():
    print(f"\n--- Testing {platform} ---")
    try:
        info = get_video_info(url)
        print(f"✅ Success: {info['title'][:50]}")
        print(f"Formats available: {len(info['formats'])}")
    except Exception as e:
        print(f"❌ Error: {e}")

