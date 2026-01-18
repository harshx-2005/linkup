import { useEffect } from 'react';

const ImageLightbox = ({ imageUrl, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!imageUrl) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div className="relative max-w-full max-h-full">
                <img
                    src={imageUrl}
                    alt="Full View"
                    className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />

                <button
                    className="absolute -top-10 right-0 text-white hover:text-gray-300 text-3xl font-bold"
                    onClick={onClose}
                >
                    &times;
                </button>

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
                            a.download = `image-${Date.now()}`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                        } catch (err) {
                            console.error('Download failed', err);
                        }
                    }}
                    className="absolute -bottom-10 right-0 text-white hover:text-blue-400 text-sm flex items-center gap-1 font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-md"
                >
                    ⬇ Download
                </button>
            </div>
        </div>
    );
};

export default ImageLightbox;
