/**
 * AudioExtractor - Extract MP3 audio from video URLs
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Download,
    Loader2,
    Music,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

const API_URL = import.meta.env.PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');

interface VideoInfo {
    title: string;
    thumbnail: string | null;
    duration: number | null;
    platform: string;
    uploader: string | null;
}

export default function AudioExtractor() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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
            setVideoInfo(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleExtract = async () => {
        if (!videoInfo) return;

        setExtracting(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch(`${API_URL}/api/audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Audio extraction failed');
            }

            // Get filename from headers or use title
            const contentDisposition = response.headers.get('Content-Disposition');
            const xFilename = response.headers.get('X-Filename');

            let filename = `${videoInfo.title.substring(0, 50)}.mp3`;

            if (xFilename) {
                filename = xFilename;
            } else if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) filename = match[1];
            }

            // Download the file
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Extraction failed');
        } finally {
            setExtracting(false);
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
                        placeholder="Paste video URL to extract audio..."
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
                            'Get Info'
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
                    <div className="mt-6 space-y-4">
                        <Skeleton className="h-48 w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                )}

                {/* Video Info Preview */}
                {videoInfo && !loading && (
                    <div className="mt-6 space-y-4">
                        {/* Thumbnail */}
                        {videoInfo.thumbnail && (
                            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                                <img
                                    src={videoInfo.thumbnail}
                                    alt={videoInfo.title}
                                    className="h-full w-full object-cover"
                                />
                                {/* Audio indicator overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <div className="rounded-full bg-primary p-4">
                                        <Music className="h-8 w-8 text-primary-foreground" />
                                    </div>
                                </div>
                                {/* Duration badge */}
                                {videoInfo.duration && (
                                    <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-xs text-white">
                                        {formatDuration(videoInfo.duration)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Info */}
                        <div>
                            <h3 className="font-semibold line-clamp-2">{videoInfo.title}</h3>
                            {videoInfo.uploader && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {videoInfo.uploader}
                                </p>
                            )}
                        </div>

                        {/* Extract Button */}
                        <Button
                            onClick={handleExtract}
                            disabled={extracting}
                            className="w-full"
                            size="lg"
                        >
                            {extracting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Extracting Audio...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                    Downloaded!
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-5 w-5" />
                                    Extract MP3
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            Audio will be extracted as MP3 (192kbps)
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
