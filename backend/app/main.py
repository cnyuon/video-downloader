"""
FastAPI application entry point for the video downloader API.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.video import router as video_router


app = FastAPI(
    title="Video Downloader API",
    description="Download watermark-free videos from TikTok, YouTube, Twitter/X, and Facebook",
    version="1.0.0",
)

# CORS configuration - allow all origins for local network testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local network testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Filename"],
)

# Include routers
app.include_router(video_router)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Video Downloader API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "info": "POST /api/info - Get video metadata",
            "download": "POST /api/download - Download video",
            "limit": "GET /api/limit - Check rate limit status",
            "health": "GET /api/health - Health check",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
