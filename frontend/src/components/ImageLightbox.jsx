import { useEffect, useState } from 'react';
import VideoPlayer from './VideoPlayer';

const ImageLightbox = ({ imageUrl, type = 'image', onClose }) => {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!imageUrl) return null;

    const isVideo = type === 'video' || imageUrl.match(/\.(mp4|webm|ogg)$/i);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex items-center gap-4 z-50">
                {!isVideo && (
                    <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Zoom Out">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                        </button>
                        <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Zoom In">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                        </button>
                        <button onClick={() => setRotation(r => r + 90)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Rotate">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38" /></svg>
                        </button>
                    </div>
                )}

                <button
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-white/10 text-white transition-colors border border-white/10"
                    onClick={onClose}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div
                className={`relative max-w-full max-h-full transition-transform duration-200 ease-out ${isVideo ? 'w-full max-w-4xl aspect-video' : ''}`}
                style={!isVideo ? { transform: `scale(${scale}) rotate(${rotation}deg)` } : {}}
                onClick={(e) => e.stopPropagation()}
            >
                {isVideo ? (
                    <VideoPlayer src={imageUrl} className="w-full h-full shadow-2xl ring-1 ring-white/10" autoPlay />
                ) : (
                    <img
                        src={imageUrl}
                        alt="Full View"
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
                    />
                )}
            </div>

            {/* Footer / Download */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
                <button
                    onClick={async (e) => {
                        e.stopPropagation();
                        try {
                            const response = await fetch(imageUrl);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = `file-${Date.now()}.${isVideo ? 'mp4' : 'png'}`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                        } catch (err) {
                            console.error('Download failed', err);
                        }
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Download {isVideo ? 'Video' : 'Image'}
                </button>
            </div>
        </div>
    );
};

export default ImageLightbox;
