import { useState, useRef, useEffect } from 'react';

const VideoPlayer = ({ src, poster, autoPlay = false, className = "", isPreview = false }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(false);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isFullscreen && !isPlaying) return; // Only active when engaged
            // If in preview mode and not playing/fullscreen, ignore. 
            // Better: only if it's the active element? 
            // We'll rely on fullscreen state or if mouse is hovering (active interaction)
            if (!isFullscreen && !containerRef.current?.matches(':hover')) return;

            switch (e.code) {
                case 'Space':
                case 'k':
                    e.preventDefault();
                    togglePlay(e);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
                        setShowControls(true);
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                        setShowControls(true);
                    }
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen(e);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen, isPlaying]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => setProgress((video.currentTime / video.duration) * 100);
        const updateDuration = () => setDuration(video.duration);
        const onEnded = () => {
            setIsPlaying(false);
            setProgress(100);
            setShowControls(true);
        };
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            if (!document.fullscreenElement && isPreview) {
                // Pausing when exiting fullscreen in preview mode is often expected behavior
                video.pause();
                setIsPlaying(false);
            }
        }

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadedmetadata', updateDuration);
        video.addEventListener('ended', onEnded);
        document.addEventListener('fullscreenchange', onFullscreenChange);

        return () => {
            video.removeEventListener('timeupdate', updateProgress);
            video.removeEventListener('loadedmetadata', updateDuration);
            video.removeEventListener('ended', onEnded);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, [isPreview]);

    useEffect(() => {
        if (autoPlay && videoRef.current) {
            videoRef.current.play().catch(() => setIsPlaying(false));
        }
    }, [autoPlay]);

    const togglePlay = (e) => {
        e?.stopPropagation();
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
            // If in preview mode, go fullscreen on play
            if (isPreview && !document.fullscreenElement) {
                containerRef.current?.requestFullscreen();
            }
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    const handleSeek = (e) => {
        e.stopPropagation();
        const seekTime = (e.target.value / 100) * duration;
        videoRef.current.currentTime = seekTime;
        setProgress(e.target.value);
    };

    const toggleFullscreen = (e) => {
        e?.stopPropagation();
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "00:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Render Logic:
    // If NOT Fullscreen AND isPreview is true:
    //   - Show Big Play Button (Centered)
    //   - Hide Bottom Controls entirely (as per user request)
    // If Fullscreen OR !isPreview (Lightbox):
    //   - Show Controls on hover/pause

    // Determine if we should show the full UI
    const isFullUI = isFullscreen || !isPreview;

    return (
        <div
            ref={containerRef}
            className={`relative group bg-black overflow-hidden rounded-xl ${className}`}
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onClick={togglePlay}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className={`w-full h-full ${isFullUI ? 'object-contain' : 'object-cover'}`} // Cover in preview, Contain in full
                onClick={(e) => e.stopPropagation()}
            />

            {/* Big Play Button Overlay (Only when PAUSED) */}
            {!isPlaying && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/30 animate-in fade-in duration-200"
                    onClick={togglePlay}
                >
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform cursor-pointer border border-white/20 shadow-2xl group/play">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" strokeWidth={0} stroke="currentColor" className="w-8 h-8 translate-x-0.5 group-hover/play:scale-110 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Bottom Controls - ONLY IF Full UI */}
            {isFullUI && (
                <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${(showControls || !isPlaying) ? 'opacity-100' : 'opacity-0'}`}>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-3 mb-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-medium text-white/90 font-mono">{formatTime(videoRef.current?.currentTime)}</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={handleSeek}
                            className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                        />
                        <span className="text-xs font-medium text-white/60 font-mono">{formatTime(duration)}</span>
                    </div>

                    {/* Control Actions */}
                    <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay} className="text-white/90 hover:text-white transition">
                                {isPlaying ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                    </svg>
                                )}
                            </button>

                            {/* Skip Buttons (Enabled in Full UI) */}
                            <button onClick={() => { videoRef.current.currentTime -= 10; }} className="text-white/70 hover:text-white transition pointer-events-auto" title="Rewind 10s">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M9 12h6" /><path d="M12 9v6" /></svg>
                            </button>
                            <button onClick={() => { videoRef.current.currentTime += 10; }} className="text-white/70 hover:text-white transition pointer-events-auto" title="Skip 10s">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M9 12h6" /><path d="M12 9v6" /></svg>
                            </button>
                        </div>

                        <button onClick={toggleFullscreen} className="text-white/90 hover:text-white transition">
                            {isFullscreen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;

