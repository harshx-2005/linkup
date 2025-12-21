import { useRef, useEffect, useState } from 'react';

const CameraModal = ({ onClose, onCapture }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null); // Use Ref for cleanup reliability
    const mediaRecorderRef = useRef(null);
    const [error, setError] = useState(null);

    // Modes: 'photo' | 'video'
    const [mode, setMode] = useState('photo');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const chunksRef = useRef([]);

    useEffect(() => {
        const startCamera = async () => {
            try {
                // Request both video and audio for recording
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                // Fallback: try only video if audio fails (common permission issue)
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    // Try specific video only if audio was the blocker? 
                    // Usually permission covers both or separately. 
                    // Let's assume generic error first.
                    setError("Camera/Audio permission denied. Please allow access.");
                } else if (err.name === 'NotFoundError') {
                    setError("No camera device found.");
                } else {
                    // Retry with video only
                    try {
                        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                        streamRef.current = videoStream;
                        if (videoRef.current) {
                            videoRef.current.srcObject = videoStream;
                        }
                    } catch (retryErr) {
                        setError("Could not access camera: " + retryErr.message);
                    }
                }
            }
        };

        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Timer for video recording
    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingTime(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `photo-${Date.now()}.png`, { type: 'image/png' });
                onCapture(file);
                // Cleanup included in onClose via parent unmounting -> useEffect cleanup
                // But good practice to stop explicitly if we wanted to stay open.
                // Here we close immediately.
            }
        }, 'image/png');
    };

    const startRecording = () => {
        if (!streamRef.current) return;

        chunksRef.current = [];
        const recorder = new MediaRecorder(streamRef.current);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/mp4' }); // Or webm
            const file = new File([blob], `video-${Date.now()}.mp4`, { type: 'video/mp4' });
            onCapture(file);
        };

        recorder.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // onClose happens in onstop logic? No, onstop creates file then we call onCapture.
            // But we can't pass args to onstop easily unless we define it inside start or here.
            // Let's modify onstop logic slightly or rely on separate flow.
            // Actually `onstop` above handles capture. We can close there?
            // Let's close inside the onstop callback for better UX (wait for file creation).
        }
    };

    // Helper to format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl max-w-2xl w-full flex flex-col">
                <div className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-white font-bold">
                        {mode === 'photo' ? 'Take Photo' : 'Record Video'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                <div className="relative bg-black aspect-video flex items-center justify-center">
                    {error ? (
                        <div className="text-red-400 p-4 text-center">{error}</div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted // Avoid feedback loop
                                className="w-full h-full object-contain"
                            />
                            {isRecording && (
                                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse font-bold">
                                    REC {formatTime(recordingTime)}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 bg-gray-900 flex flex-col gap-4">
                    {/* Mode Switcher */}
                    {!isRecording && (
                        <div className="flex justify-center gap-4 border-b border-gray-700 pb-4">
                            <button
                                onClick={() => setMode('photo')}
                                className={`px-4 py-1 rounded-full text-sm font-bold ${mode === 'photo' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                            >
                                Photo
                            </button>
                            <button
                                onClick={() => setMode('video')}
                                className={`px-4 py-1 rounded-full text-sm font-bold ${mode === 'video' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                            >
                                Video
                            </button>
                        </div>
                    )}

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                            disabled={isRecording}
                        >
                            Cancel
                        </button>

                        {!error && (
                            <>
                                {mode === 'photo' ? (
                                    <button
                                        onClick={takePhoto}
                                        className="px-6 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-500 flex items-center gap-2"
                                    >
                                        <span>📸</span> Capture
                                    </button>
                                ) : (
                                    isRecording ? (
                                        <button
                                            onClick={stopRecording}
                                            className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-500 flex items-center gap-2"
                                        >
                                            <span>⏹</span> Stop Recording
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startRecording}
                                            className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-500 flex items-center gap-2"
                                        >
                                            <span>⏺</span> Start Recording
                                        </button>
                                    )
                                )}
                            </>
                        )}
                    </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
};

export default CameraModal;
