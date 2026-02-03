"""
Video downloader service using yt-dlp.
Handles video info extraction and downloading for TikTok, YouTube, Twitter/X, and Facebook.
"""
import os
import re
import tempfile
from typing import Optional
import yt_dlp


# Supported platforms with their URL patterns
PLATFORM_PATTERNS = {
    'tiktok': r'(tiktok\.com|vm\.tiktok\.com)',
    'youtube': r'(youtube\.com|youtu\.be)',
    'twitter': r'(twitter\.com|x\.com)',
    'facebook': r'(facebook\.com|fb\.watch)',
}


def detect_platform(url: str) -> Optional[str]:
    """Detect which platform a URL belongs to."""
    for platform, pattern in PLATFORM_PATTERNS.items():
        if re.search(pattern, url, re.IGNORECASE):
            return platform
    return None


def get_video_info(url: str) -> dict:
    """
    Extract video metadata without downloading.
    Returns title, thumbnail, duration, platform, and available formats.
    """
    platform = detect_platform(url)
    if not platform:
        raise ValueError(f"Unsupported platform. URL must be from: {', '.join(PLATFORM_PATTERNS.keys())}")
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as e:
            raise ValueError(f"Could not extract video info: {str(e)}")
    
    # Extract available formats (video only, deduplicated by quality)
    formats = []
    seen_qualities = set()
    
    for f in info.get('formats', []):
        # Skip audio-only formats
        if f.get('vcodec') == 'none':
            continue
        
        height = f.get('height')
        if height and height not in seen_qualities:
            seen_qualities.add(height)
            formats.append({
                'format_id': f.get('format_id'),
                'quality': f'{height}p',
                'ext': f.get('ext', 'mp4'),
                'filesize': f.get('filesize'),
            })
    
    # Sort by quality (highest first)
    formats.sort(key=lambda x: int(x['quality'].replace('p', '')), reverse=True)
    
    # Add a "best" option at the top
    formats.insert(0, {
        'format_id': 'best',
        'quality': 'Best Quality',
        'ext': 'mp4',
        'filesize': None,
    })
    
    return {
        'title': info.get('title', 'Untitled'),
        'thumbnail': info.get('thumbnail'),
        'duration': info.get('duration'),
        'platform': platform,
        'uploader': info.get('uploader'),
        'formats': formats[:6],  # Limit to 6 options
        'url': url,
    }


def download_video(url: str, format_id: str = 'best') -> tuple[str, str, str]:
    """
    Download video and return (file_path, filename, content_type).
    The caller is responsible for cleaning up the file after use.
    """
    platform = detect_platform(url)
    if not platform:
        raise ValueError(f"Unsupported platform")
    
    # Create temp directory for downloads
    temp_dir = tempfile.mkdtemp(prefix='viddown_')
    
    # yt-dlp options for best quality without watermark
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'outtmpl': os.path.join(temp_dir, '%(title).50s.%(ext)s'),
        # Prefer pre-merged formats to avoid ffmpeg requirement
        # Falls back to merging if ffmpeg is available
        'format': 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best',
        'merge_output_format': 'mp4',
    }
    
    # TikTok-specific: get watermark-free version
    if platform == 'tiktok':
        ydl_opts['format'] = 'download_addr-0/play_addr-0/best'
    
    # YouTube-specific: prefer pre-merged to avoid ffmpeg issues
    if platform == 'youtube':
        # Try to get a pre-merged format first, then fall back
        ydl_opts['format'] = 'best[ext=mp4][height<=1080]/bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best'
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
            # Handle merged files (might have different extension)
            if not os.path.exists(filename):
                # Try with .mp4 extension
                base = os.path.splitext(filename)[0]
                for ext in ['.mp4', '.webm', '.mkv']:
                    if os.path.exists(base + ext):
                        filename = base + ext
                        break
            
            if not os.path.exists(filename):
                raise ValueError("Download completed but file not found")
            
            # Generate a clean filename for download
            clean_title = re.sub(r'[^\w\s-]', '', info.get('title', 'video'))[:50]
            ext = os.path.splitext(filename)[1] or '.mp4'
            download_filename = f"{clean_title}{ext}"
            
            return filename, download_filename, 'video/mp4'
            
        except yt_dlp.utils.DownloadError as e:
            raise ValueError(f"Download failed: {str(e)}")


def extract_audio(url: str) -> tuple[str, str, str]:
    """
    Extract audio from video and return (file_path, filename, content_type).
    Returns MP3 format.
    """
    platform = detect_platform(url)
    if not platform:
        raise ValueError(f"Unsupported platform")
    
    # Create temp directory for downloads
    temp_dir = tempfile.mkdtemp(prefix='audioext_')
    
    # yt-dlp options for audio extraction
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'outtmpl': os.path.join(temp_dir, '%(title).50s.%(ext)s'),
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=True)
            
            # The file will have .mp3 extension after postprocessing
            base_filename = ydl.prepare_filename(info)
            base = os.path.splitext(base_filename)[0]
            mp3_filename = base + '.mp3'
            
            if not os.path.exists(mp3_filename):
                raise ValueError("Audio extraction completed but file not found")
            
            # Generate a clean filename for download
            clean_title = re.sub(r'[^\w\s-]', '', info.get('title', 'audio'))[:50]
            download_filename = f"{clean_title}.mp3"
            
            return mp3_filename, download_filename, 'audio/mpeg'
            
        except yt_dlp.utils.DownloadError as e:
            raise ValueError(f"Audio extraction failed: {str(e)}")


def get_transcript(url: str) -> dict:
    """
    Extract subtitles/transcript from video.
    Returns transcript text and metadata.
    """
    platform = detect_platform(url)
    if not platform:
        raise ValueError(f"Unsupported platform")
    
    temp_dir = tempfile.mkdtemp(prefix='transcript_')
    
    # yt-dlp options for subtitle extraction
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,  # Don't download the video
        'writesubtitles': True,
        'writeautomaticsub': True,  # Also get auto-generated subs
        'subtitleslangs': ['en', 'en-US', 'en-GB'],  # Prefer English
        'subtitlesformat': 'vtt',
        'outtmpl': os.path.join(temp_dir, '%(title).50s.%(ext)s'),
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=True)
            
            title = info.get('title', 'Untitled')
            
            # Look for subtitle files
            transcript_text = None
            
            # Check for subtitle files in temp directory
            import glob
            vtt_files = glob.glob(os.path.join(temp_dir, '*.vtt'))
            
            if vtt_files:
                # Parse the VTT file to extract text
                with open(vtt_files[0], 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Simple VTT parsing - extract just the text lines
                lines = []
                for line in content.split('\n'):
                    line = line.strip()
                    # Skip timestamps, WEBVTT header, and empty lines
                    if '-->' in line or line.startswith('WEBVTT') or not line:
                        continue
                    # Skip numeric cue identifiers
                    if line.isdigit():
                        continue
                    # Remove VTT tags like <c> </c>
                    line = re.sub(r'<[^>]+>', '', line)
                    if line:
                        lines.append(line)
                
                # Remove duplicate consecutive lines (common in auto-subs)
                deduplicated = []
                for line in lines:
                    if not deduplicated or line != deduplicated[-1]:
                        deduplicated.append(line)
                
                transcript_text = ' '.join(deduplicated)
            
            # Clean up temp directory
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
            
            if not transcript_text:
                raise ValueError("No subtitles available for this video")
            
            return {
                'title': title,
                'platform': platform,
                'transcript': transcript_text,
                'word_count': len(transcript_text.split()),
            }
            
        except yt_dlp.utils.DownloadError as e:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise ValueError(f"Transcript extraction failed: {str(e)}")


