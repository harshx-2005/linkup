import React, { useEffect, useRef, useState } from 'react';

// Professional SVG Icons
const Icons = {
    Mute: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    ),
    Unmute: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    ),
    VideoOff: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    ),
    VideoOn: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
    ),
    End: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C2.81 8.47 7.2 6 12 6c4.8 0 9.19 2.47 11.71 5.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.66-1.85.995.995 0 0 1-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
        </svg>
    ),
    Switch: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
    ),
};

const CallInterface = ({ call, isIncoming, onAccept, onReject, onEnd, switchRequest, onRequestVideo, onRespondVideo }) => {
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
                // Sync initial state if needed
                return;
            }

            // Fallback: Get own stream
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: call.isVideo, audio: true });
                setLocalStream(stream);
            } catch (err) {
                console.error("Failed to get local stream", err);
                setMediaError("Could not access camera. Check permissions or close other apps.");
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
    // A. Immediate UI State Update (Decoupled from DOM)
    useEffect(() => {
        if (call.remoteStream) {
            console.log("Remote Stream detected, setting Connected state.");
            setRemoteStreamAttached(true);
        }
    }, [call.remoteStream]);

    // B. Attach to DOM Element
    useEffect(() => {
        if (call.remoteStream && remoteVideoRef.current) {
            // Prevent re-assigning
            if (remoteVideoRef.current.srcObject === call.remoteStream) {
                remoteVideoRef.current.play().catch(e => console.log("Autoplay check failed", e));
                return;
            }

            console.log("CallInterface: Attaching remote stream to DOM", call.remoteStream.id);
            remoteVideoRef.current.srcObject = call.remoteStream;

            remoteVideoRef.current.play().catch(e => {
                console.error("Error auto-playing remote stream:", e);
            });
        }
    }, [call.remoteStream]);

    const handleVideoPlaying = () => {
        console.log("Remote video started playing");
        setRemoteStreamAttached(true);
    };


    // --- Actions ---

    const toggleMute = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks.forEach(t => t.enabled = !t.enabled);
                setIsMuted(!isMuted);
            } else {
                console.warn("No audio tracks to toggle");
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            // If currently VIDEO call -> Toggle Off (Downgrade - usually allowed instantly)
            if (call.isVideo) {
                localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
                setIsVideoOff(!isVideoOff);
            } else {
                // If currently VOICE call -> Request Upgrade
                onRequestVideo();
            }
        }
    };

    // --- Renders ---

    if (isIncoming) {
        return (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                <div className="flex flex-col items-center mb-12">
                    <div className="w-32 h-32 bg-gray-700 rounded-full mb-6 overflow-hidden border-4 border-gray-600 shadow-2xl">
                        {call.avatar ? (
                            <img src={call.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400 font-bold">
                                {call.name?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{call.name}</h2>
                    {call.initiatorName && <p className="text-gray-300 text-lg mb-1">Incoming call from {call.initiatorName}</p>}
                    <p className="text-blue-400 text-lg animate-pulse">{call.initiatorName ? 'Group Call' : `Incoming ${call.isVideo ? 'Video' : 'Voice'} Call...`}</p>
                </div>

                <div className="flex gap-12">
                    <button
                        onClick={onReject}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg group-hover:bg-red-600 transition-all transform group-hover:scale-110">
                            <Icons.End />
                        </div>
                        <span className="text-gray-300 text-sm">Decline</span>
                    </button>

                    <button
                        onClick={onAccept}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg group-hover:bg-green-600 transition-all transform group-hover:scale-110 animate-bounce">
                            {call.isVideo ? <Icons.VideoOn /> : <Icons.Unmute />}
                        </div>
                        <span className="text-gray-300 text-sm">Accept</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col overflow-hidden">
            {/* Header / Info */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3">
                    <span className="text-gray-200 text-sm font-medium">Locked • End-to-end encrypted</span>
                </div>
                <div className="text-white font-bold text-lg drop-shadow-md">{call.name}</div>
            </div>

            {/* Media Error Banner */}
            {mediaError && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white px-6 py-3 rounded-full z-[60] text-sm font-medium animate-pulse shadow-lg backdrop-blur-sm flex items-center gap-2 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>{mediaError}</span>
                </div>
            )}

            {/* Switch Request Overlays */}
            {switchRequest === 'incoming' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="bg-gray-800 p-6 rounded-2xl flex flex-col items-center max-w-sm w-full border border-gray-700 shadow-2xl animate-fade-in-up">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                            <Icons.VideoOn />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 text-center">{call.name} requests to switch to Video Call</h3>
                        <div className="flex gap-4 mt-6 w-full">
                            <button
                                onClick={() => onRespondVideo(false)}
                                className="flex-1 py-3 bg-gray-600 rounded-xl text-white font-medium hover:bg-gray-500 transition"
                            >
                                Decline
                            </button>
                            <button
                                onClick={() => onRespondVideo(true)}
                                className="flex-1 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-500 transition"
                            >
                                Switch
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {switchRequest === 'outgoing' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-800/90 p-4 rounded-xl flex items-center gap-4 border border-gray-700 shadow-xl">
                        <div className="animate-spin text-blue-400">
                            <Icons.Switch />
                        </div>
                        <span className="text-white font-medium">Requesting switch to video...</span>
                    </div>
                </div>
            )}


            {/* Main Content Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center">

                {/* Audio Call UI (Avatar) or Loading State */}
                {(!remoteStreamAttached || !call.isVideo) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-900">
                        <div className={`w-32 h-32 bg-gray-800 rounded-full mb-6 flex items-center justify-center text-4xl overflow-hidden shadow-2xl ${remoteStreamAttached ? 'animate-pulse border-4 border-green-500/50' : ''}`}>
                            {call.avatar ? <img src={call.avatar} className="w-full h-full object-cover" /> : call.name?.[0]?.toUpperCase()}
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{call.name}</h2>
                        <p className="text-gray-400 animate-pulse">
                            {remoteStreamAttached ? 'Voice Call Connected' : 'Connecting...'}
                        </p>
                    </div>
                )}

                {/* Video Element (Always present for audio/video) */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    onPlaying={handleVideoPlaying}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${remoteStreamAttached && call.isVideo ? 'opacity-100' : 'opacity-0'}`}
                />
            </div>

            {/* Local Video - WhatsApp Style PIP (Always visible if video call) */}
            {call.isVideo && localStream && (
                <div className="absolute top-4 right-4 w-32 h-48 md:w-40 md:h-60 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700/50 z-50 transition-all hover:scale-105">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                </div>
            )}

            {/* Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-8 h-32 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-8 z-20">
                {/* Video Toggle */}
                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full backdrop-blur-md transition-all ${isVideoOff || !call.isVideo ? 'bg-white text-black' : 'bg-gray-700/50 text-white'} hover:bg-gray-600`}
                >
                    {/* Icon Logic: If incoming request, maybe pulse? For now, standard toggle. */}
                    {isVideoOff || !call.isVideo ? <Icons.VideoOff /> : <Icons.VideoOn />}
                </button>

                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full backdrop-blur-md transition-all ${isMuted ? 'bg-white text-black' : 'bg-gray-700/50 text-white'} hover:bg-gray-600`}
                >
                    {isMuted ? <Icons.Mute /> : <Icons.Unmute />}
                </button>

                <button
                    onClick={onEnd}
                    className="p-5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transform hover:scale-105 transition-all"
                >
                    <Icons.End />
                </button>
            </div>
        </div>
    );
};

export default CallInterface;
