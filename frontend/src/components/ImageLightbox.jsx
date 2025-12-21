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

                <a
                    href={imageUrl}
                    download={`image-${Date.now()}`}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -bottom-10 right-0 text-white hover:text-blue-400 text-sm flex items-center gap-1"
                >
                    ⬇ Download
                </a>
            </div>
        </div>
    );
};

export default ImageLightbox;
