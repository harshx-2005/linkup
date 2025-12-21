import React, { useEffect, useRef, useState } from 'react';

const CallModal = ({ call, isIncoming, onAccept, onReject, onEnd }) => {
    const [localStream, setLocalStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const localVideoRef = useRef();
    const remoteVideoRef = useRef();

    useEffect(() => {
        if (!isIncoming) {
            // For outgoing calls, we might already have the stream in 'call.localStream' from Chat.jsx
            // If so, use it. If not, maybe start it (but Chat.jsx seems to start it).
            if (call.localStream) {
                setLocalStream(call.localStream);
            }
        }
    }, [isIncoming, call.localStream]);

    // Handle Local Video Ref
    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Handle Remote Video Ref - USE call.remoteStream
    useEffect(() => {
        if (call.remoteStream && remoteVideoRef.current) {
            console.log("Attaching remote stream to video element", call.remoteStream);
            remoteVideoRef.current.srcObject = call.remoteStream;
        }
    }, [call.remoteStream]);

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream && call.isVideo) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
            {isIncoming ? (
                <div className="bg-gray-800 p-8 rounded-lg flex flex-col items-center animate-bounce-subtle">
                    <div className="w-24 h-24 bg-gray-600 rounded-full mb-4 flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
                        {call.avatar ? <img src={call.avatar} className="w-full h-full object-cover" /> : call.name?.[0]}
                    </div>
                    <h2 className="text-2xl text-white mb-2">{call.name}</h2>
                    <p className="text-gray-400 mb-8">Incoming {call.isVideo ? 'Video' : 'Voice'} Call...</p>
                    <div className="flex gap-8">
                        <button onClick={onReject} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl hover:bg-red-700 transition">
                            📞
                        </button>
                        <button onClick={onAccept} className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl hover:bg-green-700 animate-pulse transition">
                            📞
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative w-full h-full flex flex-col">
                    {/* Remote Video (Full Screen) */}
                    <div className="flex-1 bg-black relative flex items-center justify-center">
                        {/* Placeholder if no remote stream yet */}
                        {!call.remoteStream && <div className="text-white animate-pulse">Connecting...</div>}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* Local Video (Floating) - Only show if video call */}
                    {call.isVideo && (
                        <div className="absolute top-4 right-4 w-32 h-48 bg-gray-900 border-2 border-gray-700 rounded-lg overflow-hidden shadow-lg z-10">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Controls */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-6 bg-gray-800 p-4 rounded-full bg-opacity-80 backdrop-blur-sm z-20">
                        <button onClick={toggleMute} className={`p-4 rounded-full ${isMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white'} hover:opacity-80`}>
                            {isMuted ? '🔇' : '🎤'}
                        </button>

                        {call.isVideo && (
                            <button onClick={toggleVideo} className={`p-4 rounded-full ${isVideoOff ? 'bg-red-600 text-white' : 'bg-gray-700 text-white'} hover:opacity-80`}>
                                {isVideoOff ? '🚫' : '📹'}
                            </button>
                        )}

                        <button onClick={onEnd} className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700">
                            📞
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallModal;
