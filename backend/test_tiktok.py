from app.services.downloader import get_video_info
try:
    print(get_video_info("https://www.tiktok.com/@mrbeast/video/7311138402288012586"))
except Exception as e:
    print(f"Error: {e}")
