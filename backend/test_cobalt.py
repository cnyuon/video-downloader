import requests
import json
import sys

def test_cobalt(url):
    print(f"Testing Cobalt API for: {url}")
    
    # Cobalt API endpoint
    # Note: public instances often require setting specific headers like Accept and Content-Type
    # We'll use the official public instance or try to find a working one.
    api_url = "https://co.wuk.sh/api/json"  # Common cobalt instance
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    payload = {
        "url": url,
        "vQuality": "1080",
        "isAudioOnly": False,
        "aFormat": "mp3",
        "isNoTTWatermark": True
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_url = "https://www.tiktok.com/@mrbeast/video/7311138402288012586"
    test_cobalt(test_url)
