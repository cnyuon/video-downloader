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

interface AudioExtractorProps {
    placeholderUrl?: string;
    buttonGetInfo?: string;
    buttonExtracting?: string;
    buttonDownloaded?: string;
    buttonExtractMp3?: string;
    buttonExtractOriginal?: string;
    textOriginalAudio?: string;
    textConvertedMp3?: string;
}

export default function AudioExtractor({
    placeholderUrl = 'Paste video URL to extract audio...',
    buttonGetInfo = 'Get Info',
    buttonExtracting = 'Extracting Audio...',
    buttonDownloaded = 'Downloaded!',
    buttonExtractMp3 = 'Extract MP3',
    buttonExtractOriginal = 'Extract Original Audio',
    textOriginalAudio = 'Original audio stream (M4A, no re-encoding)',
    textConvertedMp3 = 'Converted to MP3 format'
}: AudioExtractorProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [audioFormat, setAudioFormat] = useState<'mp3' | 'original'>('mp3');

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
            // Use different endpoint based on format selection
            const endpoint = audioFormat === 'original' ? '/api/audio-original' : '/api/audio';
            const response = await fetch(`${API_URL}${endpoint}`, {
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

            const defaultExt = audioFormat === 'original' ? '.m4a' : '.mp3';
            let filename = `${videoInfo.title.substring(0, 50)}${defaultExt}`;

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
                            buttonGetInfo
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

                        {/* Format Selection */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setAudioFormat('mp3')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${audioFormat === 'mp3'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                            >
                                MP3
                            </button>
                            <button
                                onClick={() => setAudioFormat('original')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${audioFormat === 'original'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                            >
                                Original (M4A)
                            </button>
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
                                    {buttonExtracting}
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                    {buttonDownloaded}
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-5 w-5" />
                                    {audioFormat === 'original' ? buttonExtractOriginal : buttonExtractMp3}
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            {audioFormat === 'original'
                                ? textOriginalAudio
                                : textConvertedMp3
                            }
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
