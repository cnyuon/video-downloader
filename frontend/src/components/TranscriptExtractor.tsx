/**
 * TranscriptExtractor - Extract text transcripts from videos
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FileText,
    Loader2,
    AlertCircle,
    Copy,
    CheckCircle2,
    Download
} from 'lucide-react';

const API_URL = import.meta.env.PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');

interface TranscriptResult {
    title: string;
    platform: string;
    transcript: string;
    word_count: number;
}

export default function TranscriptExtractor() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TranscriptResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleExtract = async () => {
        if (!url.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setCopied(false);

        try {
            const response = await fetch(`${API_URL}/api/transcript`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to extract transcript');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!result?.transcript) return;

        await navigator.clipboard.writeText(result.transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!result) return;

        const blob = new Blob([result.transcript], { type: 'text/plain' });
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${result.title.substring(0, 50)}_transcript.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleExtract();
        }
    };

    return (
        <Card>
            <CardContent className="p-6">
                {/* URL Input */}
                <div className="flex gap-2">
                    <Input
                        type="url"
                        placeholder="Paste video URL to extract transcript..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleExtract}
                        disabled={loading || !url.trim()}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            'Get Transcript'
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

                {/* Loading */}
                {loading && (
                    <div className="mt-6 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                )}

                {/* Transcript Result */}
                {result && !loading && (
                    <div className="mt-6 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-semibold line-clamp-1">{result.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {result.word_count.toLocaleString()} words • {result.platform}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Transcript Text */}
                        <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/50 p-4">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {result.transcript}
                            </p>
                        </div>

                        <p className="text-xs text-center text-muted-foreground">
                            Transcript extracted from video subtitles
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
