/**
 * ThumbnailGrabber - Download video thumbnails
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Download,
    Loader2,
    Image,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

const API_URL = import.meta.env.PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');

interface VideoInfo {
    title: string;
    thumbnail: string | null;
    platform: string;
}

interface ThumbnailGrabberProps {
    placeholderUrl?: string;
    buttonGetThumbnail?: string;
    buttonDownloaded?: string;
    buttonDownloadThumbnail?: string;
}

export default function ThumbnailGrabber({
    placeholderUrl = 'Paste video URL to get thumbnail...',
    buttonGetThumbnail = 'Get Thumbnail',
    buttonDownloaded = 'Downloaded!',
    buttonDownloadThumbnail = 'Download Thumbnail'
}: ThumbnailGrabberProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleGetInfo = async () => {
        if (!url.trim()) return;

        setLoading(true);
        setError(null);
        setVideoInfo(null);
        setSuccess(false);

        try {
            const response = await fetch(`${API_URL}/api/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to get video info');
            }

            const data = await response.json();
            if (!data.thumbnail) {
                throw new Error('No thumbnail available for this video');
            }
            setVideoInfo(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!videoInfo?.thumbnail) return;

        try {
            // Fetch the image and download it
            const response = await fetch(videoInfo.thumbnail);
            const blob = await response.blob();

            // Get extension from content type or default to jpg
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            const ext = contentType.includes('png') ? 'png' : 'jpg';

            // Create download
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${videoInfo.title.substring(0, 50)}_thumbnail.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            setSuccess(true);
        } catch (err) {
            setError('Failed to download thumbnail');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleGetInfo();
        }
    };

    return (
        <Card>
            <CardContent className="p-6">
                {/* URL Input */}
                <div className="flex gap-2">
                    <Input
                        type="url"
                        placeholder={placeholderUrl}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleGetInfo}
                        disabled={loading || !url.trim()}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            buttonGetThumbnail
                        )}
                    </Button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-4 flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="mt-6">
                        <Skeleton className="aspect-video w-full rounded-lg" />
                    </div>
                )}

                {/* Thumbnail Preview */}
                {videoInfo && !loading && (
                    <div className="mt-6 space-y-4">
                        {/* Thumbnail */}
                        {videoInfo.thumbnail && (
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted border">
                                <img
                                    src={videoInfo.thumbnail}
                                    alt={videoInfo.title}
                                    className="h-full w-full object-cover"
                                />
                                {/* Platform badge */}
                                <div className="absolute top-2 left-2 rounded bg-black/80 px-2 py-1 text-xs text-white capitalize">
                                    {videoInfo.platform}
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {videoInfo.title}
                        </p>

                        {/* Download Button */}
                        <Button
                            onClick={handleDownload}
                            className="w-full"
                            size="lg"
                        >
                            {success ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                    {buttonDownloaded}
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-5 w-5" />
                                    {buttonDownloadThumbnail}
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
