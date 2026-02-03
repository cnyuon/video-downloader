"""
Video API routes for info extraction and downloading.
"""
import os
import shutil
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl

from app.services.downloader import (
    get_video_info, download_video, extract_audio, get_transcript, 
    detect_platform, download_subtitles, extract_audio_original,
    get_playlist_info
)
from app.utils.rate_limit import download_limiter


router = APIRouter(prefix="/api", tags=["video"])


class VideoInfoRequest(BaseModel):
    url: HttpUrl


class VideoDownloadRequest(BaseModel):
    url: HttpUrl
    format: str = "best"


class VideoInfoResponse(BaseModel):
    title: str
    thumbnail: str | None
    duration: float | None
    platform: str
    uploader: str | None
    formats: list[dict]
    url: str


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None


class RateLimitResponse(BaseModel):
    remaining: int
    reset_time: int


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/info", response_model=VideoInfoResponse)
async def get_info(request: Request, body: VideoInfoRequest):
    """
    Get video metadata without downloading.
    Returns title, thumbnail, duration, platform, and available formats.
    """
    url = str(body.url)
    
    # Check if platform is supported
    platform = detect_platform(url)
    if not platform:
        raise HTTPException(
            status_code=400,
            detail="Unsupported platform. Supported: TikTok, YouTube, Twitter/X, Facebook"
        )
    
    try:
        info = get_video_info(url)
        return VideoInfoResponse(**info)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract video info: {str(e)}")


@router.post("/download")
async def download(request: Request, body: VideoDownloadRequest):
    """
    Download video and stream to client.
    Rate limited to prevent abuse.
    """
    url = str(body.url)
    client_ip = get_client_ip(request)
    
    # Check rate limit
    limit_info = download_limiter.check(client_ip)
    if not limit_info.allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Download limit reached. Resets at {limit_info.reset_time}. "
                   f"You have {limit_info.remaining} downloads remaining today.",
            headers={
                "X-RateLimit-Remaining": str(limit_info.remaining),
                "X-RateLimit-Reset": str(limit_info.reset_time),
            }
        )
    
    # Check if platform is supported
    platform = detect_platform(url)
    if not platform:
        raise HTTPException(
            status_code=400,
            detail="Unsupported platform"
        )
    
    file_path = None
    temp_dir = None
    
    try:
        # Download the video
        file_path, filename, content_type = download_video(url, body.format)
        temp_dir = os.path.dirname(file_path)
        
        # Record successful download for rate limiting
        download_limiter.record(client_ip)
        
        # Sanitize filename for Content-Disposition
        safe_filename = filename.replace('"', "'").replace('\n', ' ').replace('\r', '')
        
        # Return file with proper headers
        response = FileResponse(
            path=file_path,
            media_type=content_type,
            background=lambda: shutil.rmtree(temp_dir, ignore_errors=True)
        )
        
        # Set Content-Disposition header explicitly for proper filename
        response.headers["Content-Disposition"] = f'attachment; filename="{safe_filename}"'
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        response.headers["X-Filename"] = safe_filename  # Backup header for CORS
        
        return response
        
    except ValueError as e:
        # Clean up on error
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Clean up on error
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.get("/limit")
async def get_limit(request: Request):
    """Get current rate limit status for the client."""
    client_ip = get_client_ip(request)
    limit_info = download_limiter.check(client_ip)
    
    return RateLimitResponse(
        remaining=limit_info.remaining,
        reset_time=limit_info.reset_time
    )


@router.get("/health")
async def health_check():
    """Health check endpoint for deployment."""
    return {"status": "healthy", "service": "video-downloader"}


@router.get("/quick-download")
async def quick_download(request: Request, url: str, format: str = "best"):
    """
    Quick download endpoint for iOS Shortcuts.
    Accepts URL as query parameter for easier integration with share sheet.
    
    Usage: GET /api/quick-download?url=https://tiktok.com/...
    """
    client_ip = get_client_ip(request)
    
    # Check rate limit
    limit_info = download_limiter.check(client_ip)
    if not limit_info.allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Download limit reached. You have {limit_info.remaining} downloads remaining."
        )
    
    # Check if platform is supported
    platform = detect_platform(url)
    if not platform:
        raise HTTPException(
            status_code=400,
            detail="Unsupported platform. Use TikTok, YouTube, Twitter, or Facebook URLs."
        )
    
    file_path = None
    temp_dir = None
    
    try:
        # Download the video
        file_path, filename, content_type = download_video(url, format)
        temp_dir = os.path.dirname(file_path)
        
        # Record successful download for rate limiting
        download_limiter.record(client_ip)
        
        # Sanitize filename
        safe_filename = filename.replace('"', "'").replace('\n', ' ').replace('\r', '')
        
        # Return file with proper headers for iOS
        response = FileResponse(
            path=file_path,
            media_type=content_type,
            background=lambda: shutil.rmtree(temp_dir, ignore_errors=True)
        )
        
        response.headers["Content-Disposition"] = f'attachment; filename="{safe_filename}"'
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        
        return response
        
    except ValueError as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.post("/audio")
async def extract_audio_endpoint(request: Request, body: VideoInfoRequest):
    """
    Extract audio from video and return as MP3.
    Uses the same rate limiting as video downloads.
    """
    url = str(body.url)
    client_ip = get_client_ip(request)
    
    # Check rate limit
    limit_info = download_limiter.check(client_ip)
    if not limit_info.allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Download limit reached. Resets at {limit_info.reset_time}."
        )
    
    # Check if platform is supported
    platform = detect_platform(url)
    if not platform:
        raise HTTPException(
            status_code=400,
            detail="Unsupported platform"
        )
    
    file_path = None
    temp_dir = None
    
    try:
        # Extract audio
        file_path, filename, content_type = extract_audio(url)
        temp_dir = os.path.dirname(file_path)
        
        # Record for rate limiting
        download_limiter.record(client_ip)
        
        # Sanitize filename
        safe_filename = filename.replace('"', "'").replace('\n', ' ').replace('\r', '')
        
        response = FileResponse(
            path=file_path,
            media_type=content_type,
            background=lambda: shutil.rmtree(temp_dir, ignore_errors=True)
        )
        
        response.headers["Content-Disposition"] = f'attachment; filename="{safe_filename}"'
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        response.headers["X-Filename"] = safe_filename
        
        return response
        
    except ValueError as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Audio extraction failed: {str(e)}")


@router.post("/transcript")
async def get_transcript_endpoint(request: Request, body: VideoInfoRequest):
    """
    Extract transcript/subtitles from video.
    Returns the transcript text and metadata.
    """
    url = str(body.url)
    
    # Check if platform is supported
    platform = detect_platform(url)
    if not platform:
        raise HTTPException(
            status_code=400,
            detail="Unsupported platform"
        )
    
    try:
        result = get_transcript(url)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript extraction failed: {str(e)}")


@router.post("/subtitles")
async def download_subtitles_endpoint(request: Request, body: VideoInfoRequest):
    """
    Download subtitles as .srt file.
    """
    url = str(body.url)
    
    platform = detect_platform(url)
    if not platform:
        raise HTTPException(status_code=400, detail="Unsupported platform")
    
    file_path = None
    temp_dir = None
    
    try:
        file_path, filename, content_type = download_subtitles(url)
        temp_dir = os.path.dirname(file_path)
        
        safe_filename = filename.replace('"', "'").replace('\n', ' ').replace('\r', '')
        
        response = FileResponse(
            path=file_path,
            media_type=content_type,
            background=lambda: shutil.rmtree(temp_dir, ignore_errors=True)
        )
        
        response.headers["Content-Disposition"] = f'attachment; filename="{safe_filename}"'
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        response.headers["X-Filename"] = safe_filename
        
        return response
        
    except ValueError as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Subtitle download failed: {str(e)}")


@router.post("/audio-original")
async def extract_audio_original_endpoint(request: Request, body: VideoInfoRequest):
    """
    Extract original audio without re-encoding (preserves quality).
    Returns .m4a or .opus instead of MP3.
    """
    url = str(body.url)
    client_ip = get_client_ip(request)
    
    limit_info = download_limiter.check(client_ip)
    if not limit_info.allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Download limit reached. Resets at {limit_info.reset_time}."
        )
    
    platform = detect_platform(url)
    if not platform:
        raise HTTPException(status_code=400, detail="Unsupported platform")
    
    file_path = None
    temp_dir = None
    
    try:
        file_path, filename, content_type = extract_audio_original(url)
        temp_dir = os.path.dirname(file_path)
        
        download_limiter.record(client_ip)
        
        safe_filename = filename.replace('"', "'").replace('\n', ' ').replace('\r', '')
        
        response = FileResponse(
            path=file_path,
            media_type=content_type,
            background=lambda: shutil.rmtree(temp_dir, ignore_errors=True)
        )
        
        response.headers["Content-Disposition"] = f'attachment; filename="{safe_filename}"'
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        response.headers["X-Filename"] = safe_filename
        
        return response
        
    except ValueError as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Audio extraction failed: {str(e)}")


@router.post("/playlist")
async def get_playlist_endpoint(request: Request, body: VideoInfoRequest):
    """
    Get playlist/channel info with list of videos.
    Returns playlist title and up to 50 video entries.
    """
    url = str(body.url)
    
    try:
        result = get_playlist_info(url)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Playlist extraction failed: {str(e)}")



