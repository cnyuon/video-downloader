/**
 * Main App component - handles tool switching via navbar
 */
import { useState } from 'react';
import Navbar from './Navbar';
import VideoDownloader from './VideoDownloader';
import AudioExtractor from './AudioExtractor';
import ThumbnailGrabber from './ThumbnailGrabber';
import TranscriptExtractor from './TranscriptExtractor';

const toolDescriptions: Record<string, { title: string; subtitle: string; note?: string }> = {
    video: {
        title: 'Download Videos',
        subtitle: 'Download videos from TikTok, YouTube, X/Twitter, and Facebook. TikTok videos are watermark-free.',
    },
    audio: {
        title: 'Video to MP3',
        subtitle: 'Extract audio from any video as a high-quality MP3 file (192kbps).',
        note: 'Works with all supported platforms: TikTok, YouTube, X/Twitter, Facebook',
    },
    thumbnail: {
        title: 'Thumbnail Grabber',
        subtitle: 'Download the thumbnail image from any video in high quality.',
    },
    transcript: {
        title: 'Video Transcript',
        subtitle: 'Extract the text transcript from videos with captions.',
        note: 'Only works with YouTube videos that have subtitles or auto-generated captions',
    },
};

export default function App() {
    const [activeTool, setActiveTool] = useState('video');

    const toolInfo = toolDescriptions[activeTool];

    return (
        <div>
            <Navbar activeTool={activeTool} onToolChange={setActiveTool} />

            <main className="container mx-auto px-4 pt-10 pb-4 max-w-2xl">
                {/* Tool Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        {toolInfo.title}
                    </h1>
                    <p className="text-muted-foreground">
                        {toolInfo.subtitle}
                    </p>
                    {toolInfo.note && (
                        <p className="text-sm text-muted-foreground mt-2 px-4 py-2 bg-muted rounded-lg inline-block">
                            ℹ️ {toolInfo.note}
                        </p>
                    )}
                </div>

                {/* Tool Content */}
                {activeTool === 'video' && <VideoDownloader />}
                {activeTool === 'audio' && <AudioExtractor />}
                {activeTool === 'thumbnail' && <ThumbnailGrabber />}
                {activeTool === 'transcript' && <TranscriptExtractor />}
            </main>
        </div>
    );
}
