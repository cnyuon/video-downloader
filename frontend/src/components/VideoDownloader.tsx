/**
 * Video Downloader - Main React component
 * Handles URL input, video info fetching, and download initiation
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Download,
    Loader2,
    AlertCircle,
    Play,
    Clock,
    User,
    CheckCircle2
} from 'lucide-react';

const API_URL = import.meta.env.PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');

interface VideoFormat {
    format_id: string;
    quality: string;
    ext: string;
    filesize: number | null;
}

interface VideoInfo {
    title: string;
    thumbnail: string | null;
    duration: number | null;
    platform: string;
    uploader: string | null;
    formats: VideoFormat[];
    url: string;
}

const PLATFORM_COLORS: Record<string, string> = {
    tiktok: 'badge-tiktok',
    youtube: 'bg-red-600',
    twitter: 'bg-black',
    facebook: 'bg-blue-600',
};

const PLATFORM_NAMES: Record<string, string> = {
    tiktok: 'TikTok',
    youtube: 'YouTube',
    twitter: 'X / Twitter',
    facebook: 'Facebook',
};

function formatDuration(seconds: number | null): string {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number | null): string {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
}

export default function VideoDownloader() {
    const [url, setUrl] = useState('');
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState('best');

    const handleGetInfo = async () => {
        if (!url.trim()) {
            setError('Please enter a video URL');
            return;
        }

        setLoading(true);
        setError(null);
        setVideoInfo(null);

        try {
            const response = await fetch(`${API_URL}/api/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to get video info');
            }

            const data: VideoInfo = await response.json();
            setVideoInfo(data);
            setSelectedFormat('best');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!videoInfo) return;

        setDownloading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: videoInfo.url, format: selectedFormat }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Download failed');
            }

            // Try to get filename from various sources
            let filename = `${videoInfo.title.substring(0, 50).replace(/[<>:"/\\|?*]/g, '')}.mp4`;

            // Try X-Filename header first (our custom header that bypasses CORS issues)
            const xFilename = response.headers.get('X-Filename');
            if (xFilename) {
                filename = xFilename;
            } else {
                // Try Content-Disposition header
                const contentDisposition = response.headers.get('Content-Disposition');
                if (contentDisposition) {
                    // Match: filename="something.mp4" or filename=something.mp4
                    const match = contentDisposition.match(/filename[^;=\n]*=(?:(["'])([^"']*)\1|([^;\n]*))/);
                    if (match) {
                        filename = match[2] || match[3] || filename;
                        // Remove any trailing quotes
                        filename = filename.replace(/^["']|["']$/g, '').trim();
                    }
                }
            }

            // Create blob and trigger download
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Download failed');
        } finally {
            setDownloading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleGetInfo();
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            {/* URL Input Section */}
            <Card className="overflow-hidden">
                <CardContent className="p-6 space-y-4">
                    <div className="flex gap-3">
                        <Input
                            type="url"
                            placeholder="Paste video URL here (TikTok, YouTube, Twitter, Facebook)"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleGetInfo}
                            disabled={loading || !url.trim()}
                            variant="gradient"
                            size="lg"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                'Get Video'
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-red-400">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <Skeleton className="w-40 h-24 rounded-lg" />
                            <div className="flex-1 space-y-3">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-1/4" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Video Preview */}
            {videoInfo && !loading && (
                <Card className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Thumbnail */}
                            <div className="relative w-full sm:w-48 aspect-video sm:aspect-auto sm:h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {videoInfo.thumbnail ? (
                                    <img
                                        src={videoInfo.thumbnail}
                                        alt={videoInfo.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Play className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                )}
                                {/* Platform Badge */}
                                <span
                                    className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium text-white ${PLATFORM_COLORS[videoInfo.platform]}`}
                                >
                                    {PLATFORM_NAMES[videoInfo.platform]}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-3">
                                <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                                    {videoInfo.title}
                                </h3>

                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                    {videoInfo.duration && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {formatDuration(videoInfo.duration)}
                                        </span>
                                    )}
                                    {videoInfo.uploader && (
                                        <span className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            {videoInfo.uploader}
                                        </span>
                                    )}
                                </div>

                                {/* Quality Selector */}
                                <div className="flex flex-wrap gap-2">
                                    {videoInfo.formats.map((format) => (
                                        <button
                                            key={format.format_id}
                                            onClick={() => setSelectedFormat(format.format_id)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedFormat === format.format_id
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                                }`}
                                        >
                                            {format.quality}
                                            {format.filesize && (
                                                <span className="ml-1 opacity-70">
                                                    ({formatFileSize(format.filesize)})
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Download Button */}
                        <div className="mt-6">
                            <Button
                                onClick={handleDownload}
                                disabled={downloading}
                                variant="gradient"
                                size="xl"
                                className="w-full"
                            >
                                {downloading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-5 w-5" />
                                        Download Video
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Watermark-free notice for TikTok */}
                        {videoInfo.platform === 'tiktok' && (
                            <p className="mt-3 text-center text-sm text-green-400 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                Downloads without watermark
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
