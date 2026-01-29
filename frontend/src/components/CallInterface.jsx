import React, { useEffect, useRef, useState } from 'react';

// --- Premium Icons (Refined) ---
const Icons = {
    Mute: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    ),
    Unmute: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    ),
    VideoOff: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm">
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    ),
    VideoOn: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
    ),
    End: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C2.81 8.47 7.2 6 12 6c4.8 0 9.19 2.47 11.71 5.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.66-1.85.995.995 0 0 1-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
        </svg>
    ),
    SwitchCam: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"></path>
            <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
            <path d="M7 7h.01"></path>
            <path d="M17 17h.01"></path>
            <path d="M16 7l4-4"></path> {/* Stylized arrows */}
            <path d="M8 17l-4 4"></path>
        </svg>
    ),
    CameraSwap: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
    )
};

const CallInterface = ({ call, isIncoming, onAccept, onReject, onEnd, switchRequest, onRequestVideo, onRespondVideo, onSwitchCamera }) => {
    const [localStream, setLocalStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [mediaError, setMediaError] = useState(null);
    const [remoteStreamAttached, setRemoteStreamAttached] = useState(false);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // --- Stream Management ---

    // 1. Initialize Local Stream
    useEffect(() => {
        const initLocalStream = async () => {
            if (isIncoming) return; // Wait for accept

            // If passed from parent (ideal)
            if (call.localStream) {
                setLocalStream(call.localStream);
                return;
            }

            // Fallback: Get own stream
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: call.isVideo, audio: true });
                setLocalStream(stream);
            } catch (err) {
                console.error("Failed to get local stream", err);
                setMediaError("Could not access camera. Check permissions.");
            }
        };

        // Reset states when call changes
        setIsVideoOff(false);
        setIsMuted(false);
        setMediaError(null);

        initLocalStream();
    }, [isIncoming, call.localStream, call.isVideo]);

    // 2. Attach Local Video
    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // 3. Attach Remote Video
    useEffect(() => {
        if (call.remoteStream && remoteVideoRef.current) {
            // Prevent re-assigning
            if (remoteVideoRef.current.srcObject === call.remoteStream) {
                remoteVideoRef.current.play().catch(e => {
                    // ignore play errors if already playing
                });
                return;
            }

            console.log("CallInterface: Attaching remote stream to DOM", call.remoteStream.id);
            remoteVideoRef.current.srcObject = call.remoteStream;

            remoteVideoRef.current.play().catch(e => {
                if (e.name !== 'AbortError') {
                    console.error("Error auto-playing remote stream:", e);
                }
            });
            setRemoteStreamAttached(true);
        }
    }, [call.remoteStream]);

    const handleVideoPlaying = () => {
        setRemoteStreamAttached(true);
    };


    // --- Actions ---

    const toggleMute = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks.forEach(t => t.enabled = !t.enabled);
                setIsMuted(!isMuted);
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            if (call.isVideo) {
                localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
                setIsVideoOff(!isVideoOff);
            } else {
                onRequestVideo();
            }
        }
    };

    // --- Renders ---

    if (isIncoming) {
        return (
            <div className="fixed inset-0 bg-gray-900/95 z-[60] flex flex-col items-center justify-center p-6 backdrop-blur-md animate-fade-in">
                {/* Profile Glow Effect */}
                <div className="relative mb-12 group">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
                    <div className="w-40 h-40 bg-gray-800 rounded-full relative z-10 flex items-center justify-center overflow-hidden border-4 border-gray-700 shadow-2xl">
                        {call.avatar ? (
                            <img src={call.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-5xl font-bold text-gray-500">{call.name?.[0]?.toUpperCase()}</span>
                        )}
                    </div>
                </div>

                <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">{call.name}</h2>
                <div className="flex items-center gap-2 mb-12">
                    <span className={`w-2 h-2 rounded-full ${call.isVideo ? 'bg-blue-500' : 'bg-green-500'} animate-ping`}></span>
                    <p className="text-gray-400 text-lg font-medium">{call.isVideo ? 'Incoming Video Call...' : 'Incoming Voice Call...'}</p>
                </div>

                <div className="flex gap-16 items-center">
                    <button
                        onClick={onReject}
                        className="flex flex-col items-center gap-3 group transition-transform hover:scale-105 active:scale-95"
                    >
                        <div className="w-18 h-18 p-5 bg-red-500/90 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/30 group-hover:bg-red-600 transition-colors backdrop-blur-sm">
                            <Icons.End />
                        </div>
                        <span className="text-gray-400 text-sm font-medium tracking-wide">Decline</span>
                    </button>

                    <button
                        onClick={onAccept}
                        className="flex flex-col items-center gap-3 group transition-transform hover:scale-105 active:scale-95"
                    >
                        <div className="w-18 h-18 p-5 bg-green-500/90 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 group-hover:bg-green-600 transition-colors backdrop-blur-sm animate-bounce-subtle">
                            {call.isVideo ? <Icons.VideoOn /> : <Icons.Unmute />}
                        </div>
                        <span className="text-gray-400 text-sm font-medium tracking-wide">Accept</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
            {/* --- Header / Info Overlay --- */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20 bg-gradient-to-b from-black/70 via-black/30 to-transparent flex items-start justify-between pointer-events-none">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                        {call.avatar ? <img src={call.avatar} className="w-full h-full object-cover rounded-full" /> : <span className="text-white font-bold">{call.name?.[0]}</span>}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-bold text-lg drop-shadow-md tracking-wide">{call.name}</span>
                        <span className="text-white/60 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Encrypted
                        </span>
                    </div>
                </div>
            </div>

            {/* --- Error Toast --- */}
            {mediaError && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 max-w-sm w-full bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl z-[60] shadow-2xl flex items-center gap-3 animate-slide-down">
                    <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-sm font-medium">{mediaError}</span>
                </div>
            )}

            {/* --- Switch Request Modal --- */}
            {switchRequest === 'incoming' && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fade-in">
                    <div className="bg-[#1a1a1a] p-8 rounded-3xl flex flex-col items-center max-w-sm w-full border border-gray-800 shadow-2xl">
                        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                            <Icons.VideoOn />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 text-center">Video Call Request</h3>
                        <p className="text-gray-400 text-center mb-8">{call.name} intends to switch to video.</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => onRespondVideo(false)} className="flex-1 py-3.5 bg-gray-700/50 hover:bg-gray-700 rounded-xl text-white font-medium transition-colors">Not Now</button>
                            <button onClick={() => onRespondVideo(true)} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors shadow-lg shadow-blue-600/20">Allow</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Main Video Area --- */}
            <div className="flex-1 relative bg-gray-900 flex items-center justify-center group overflow-hidden">
                {(!remoteStreamAttached || !call.isVideo) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0f0f0f]">
                        {/* Abstract background blobs */}
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>

                        <div className={`relative w-40 h-40 mb-8`}>
                            {remoteStreamAttached && <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-20"></div>}
                            <div className="w-full h-full bg-gray-800 rounded-full overflow-hidden border-4 border-gray-800 shadow-2xl relative z-10">
                                {call.avatar ? <img src={call.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl text-gray-500 font-bold">{call.name?.[0]}</div>}
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2 relative z-10">{call.name}</h2>
                        <span className="text-blue-400 font-medium tracking-wide uppercase text-sm bg-blue-500/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-blue-500/20">
                            {remoteStreamAttached ? '00:00' : 'Connecting...'}
                        </span>
                    </div>
                )}

                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={false}
                    onPlaying={handleVideoPlaying}
                    className={`w-full h-full object-cover transition-all duration-700 ${remoteStreamAttached && call.isVideo ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                />
            </div>

            {/* --- Local Video PIP (WhatsApp Style) --- */}
            {call.isVideo && localStream && (
                <div className="absolute top-24 right-4 w-32 h-48 md:w-36 md:h-56 bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-40 transition-all hover:scale-105 active:scale-95 cursor-pointer group">
                    {/* Camera Flip Overlay (visible on hover) */}
                    {onSwitchCamera && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            <button onClick={onSwitchCamera} className="p-2 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30 text-white">
                                <Icons.CameraSwap />
                            </button>
                        </div>
                    )}
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                </div>
            )}

            {/* --- Controls Bar (Premium Glassmorphism) --- */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-3 flex items-center justify-between shadow-2xl z-50 transition-all hover:bg-[#1a1a1a]/90">
                {/* Video Toggle */}
                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-all duration-300 ${isVideoOff || !call.isVideo ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    {isVideoOff || !call.isVideo ? <Icons.VideoOff /> : <Icons.VideoOn />}
                </button>

                {/* Mute Toggle */}
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-all duration-300 ${isMuted ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    {isMuted ? <Icons.Mute /> : <Icons.Unmute />}
                </button>

                {/* Switch Camera (Visible in main controls for easy access on mobile) */}
                {call.isVideo && onSwitchCamera && (
                    <button
                        onClick={onSwitchCamera}
                        className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-300 md:hidden"
                    >
                        <Icons.CameraSwap />
                    </button>
                )}


                {/* End Call */}
                <button
                    onClick={onEnd}
                    className="p-4 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/40 hover:bg-red-600 hover:scale-110 transition-all duration-300"
                >
                    <Icons.End />
                </button>
            </div>
        </div>
    );
};

export default CallInterface;
