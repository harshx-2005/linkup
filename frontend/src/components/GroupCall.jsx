import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { toast } from 'react-toastify';

// Professional Video Component
const Video = ({ peer, className, name, isSelf }) => {
    const ref = useRef();
    const [hasVideo, setHasVideo] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        const handleStream = (stream) => {
            if (ref.current) {
                ref.current.srcObject = stream;
            }

            const checkState = () => {
                const videoTracks = stream.getVideoTracks();
                const audioTracks = stream.getAudioTracks();
                setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
                setIsMuted(audioTracks.length > 0 && !audioTracks[0].enabled);
            };

            checkState();

            // Listen for track changes
            stream.getVideoTracks().forEach(track => {
                track.onmute = () => setHasVideo(false);
                track.onunmute = () => setHasVideo(true);
                track.onended = () => setHasVideo(false);
            });
            stream.getAudioTracks().forEach(track => {
                track.onmute = () => setIsMuted(true);
                track.onunmute = () => setIsMuted(false);
            });

            // Polling fallback
            const interval = setInterval(checkState, 1000);
            return () => clearInterval(interval);
        };
        peer.on("stream", handleStream);
        return () => {
            peer.off("stream", handleStream);
        };
    }, [peer]);

    return (
        <div className={`relative bg-[#1f2c34] ${className} flex items-center justify-center overflow-hidden rounded-xl border border-gray-800 shadow-lg`}>
            <video
                playsInline
                autoPlay
                muted={isSelf} // Always mute self to prevent feedback
                ref={ref}
                className={`w-full h-full object-cover ${hasVideo ? 'block' : 'hidden'} ${isSelf ? 'transform scale-x-[-1]' : ''}`}
            />
            {!hasVideo && (
                <div className="flex flex-col items-center justify-center absolute inset-0 bg-[#1f2c34]">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mb-2 shadow-lg ring-4 ring-[#0b141a]">
                        <span className="text-2xl font-bold text-gray-300">{name ? name[0].toUpperCase() : '?'}</span>
                    </div>
                </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 max-w-[80%]">
                <div className="text-white text-xs font-medium drop-shadow-md bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm truncate">
                    {name} {isSelf && "(You)"}
                </div>
                {isMuted && (
                    <div className="bg-red-500/80 p-1 rounded-full text-white backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    </div>
                )}
            </div>
        </div>
    );
};

const GroupCall = ({ conversationId, currentUser, socket, onClose, isVideo = true, participants = [], initiatorId }) => {
    const [peers, setPeers] = useState([]);
    const [stream, setStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo);
    const streamRef = useRef(null);

    const userVideo = useRef();
    const peersRef = useRef([]);

    useEffect(() => {
        if (stream && userVideo.current) {
            userVideo.current.srcObject = stream;
        }
    }, [stream, isVideoEnabled]);

    useEffect(() => {
        let localStream = null;

        const initCall = async () => {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
                setStream(localStream);
                streamRef.current = localStream;
                if (userVideo.current) userVideo.current.srcObject = localStream;
            } catch (err) {
                console.error("Failed to get media:", err);
                toast.error("Camera/Mic access failed. Joining as listener.");
                // Try audio only
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    setStream(localStream);
                    streamRef.current = localStream;
                } catch (e) {
                    console.error("Audio failed too", e);
                }
            }
            // Once media is ready (or failed), join room
            socket.emit("join_group_call", { conversationId, userId: currentUser.id });
        };

        initCall();

        socket.on("all_users_in_call", (users) => {
            // "users" = existing participants
            users.forEach((userObj) => {
                const { socketId, userId } = userObj;
                if (userId === currentUser.id) return;

                // We are the joiner, we initiate
                const peer = createPeer(socketId, socket.id, streamRef.current);
                const peerItem = { peerID: userId, socketID: socketId, peer };
                peersRef.current.push(peerItem);
                setPeers(prev => [...prev, peerItem]);
            });
        });

        socket.on("user_joined_call", (payload) => {
            // New user joined, we accept
            if (peersRef.current.find(p => p.socketID === payload.callerID)) return;
            const peer = addPeer(payload.signal, payload.callerID, streamRef.current);
            const peerItem = { peerID: payload.callerUserID, socketID: payload.callerID, peer };
            peersRef.current.push(peerItem);
            setPeers(prev => [...prev, peerItem]);
        });

        socket.on("receiving_returned_signal", (payload) => {
            const item = peersRef.current.find((p) => p.socketID === payload.id);
            if (item) item.peer.signal(payload.signal);
        });

        socket.on("user_left_call", (socketId) => {
            const peerObj = peersRef.current.find(p => p.socketID === socketId);
            if (peerObj) peerObj.peer.destroy();
            const newPeers = peersRef.current.filter(p => p.socketID !== socketId);
            peersRef.current = newPeers;
            setPeers(prev => prev.filter(p => p.socketID !== socketId));
        });

        socket.on("group_call_ended", () => {
            toast.info("Call ended.");
            cleanup();
            onClose();
        });

        const cleanup = () => {
            peersRef.current.forEach(p => p.peer.destroy());
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        };

        return () => {
            socket.emit("leave_group_call", conversationId);
            cleanup();
            socket.off("all_users_in_call");
            socket.off("user_joined_call");
            socket.off("receiving_returned_signal");
            socket.off("user_left_call");
            socket.off("group_call_ended");
        };
    }, []);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new SimplePeer({ initiator: true, trickle: false, stream });
        peer.on("signal", (signal) => {
            socket.emit("sending_signal", { userToSignal, callerID, callerUserID: currentUser.id, signal });
        });
        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new SimplePeer({ initiator: false, trickle: false, stream });
        peer.on("signal", (signal) => {
            socket.emit("returning_signal", { signal, callerID });
        });
        peer.signal(incomingSignal);
        return peer;
    }

    const toggleMute = () => {
        const s = streamRef.current;
        if (s) {
            const track = s.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsMuted(!track.enabled);
            }
        }
    };

    const toggleVideo = async () => {
        const s = streamRef.current;
        if (s && s.getVideoTracks().length > 0) {
            const track = s.getVideoTracks()[0];
            track.enabled = !track.enabled;
            setIsVideoEnabled(track.enabled);
        } else {
            // Retry if no video track but user wants video
            if (!isVideoEnabled) {
                try {
                    const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    setStream(newStream);
                    streamRef.current = newStream;
                    if (userVideo.current) userVideo.current.srcObject = newStream;
                    setIsVideoEnabled(true);

                    // Update peers
                    peersRef.current.forEach(({ peer }) => {
                        // Replace tracks
                        const p = peer.peer;
                        const oldVideo = p.streams[0]?.getVideoTracks()[0];
                        const newVideo = newStream.getVideoTracks()[0];
                        const oldAudio = p.streams[0]?.getAudioTracks()[0];
                        const newAudio = newStream.getAudioTracks()[0];

                        if (oldVideo) p.replaceTrack(oldVideo, newVideo, p.streams[0]);
                        else p.addTrack(newVideo, p.streams[0]); // Fallback might be tricky in Mesh
                    });
                } catch (e) {
                    toast.error("Could not enable camera");
                }
            }
        }
    };

    const handleEndCall = () => {
        if (String(currentUser.id) === String(initiatorId)) {
            socket.emit('end_group_call', conversationId);
        }
        onClose();
    };

    const getParticipantName = (id) => {
        const p = participants.find(u => String(u.id) === String(id));
        return p ? p.name : `User ${id ? String(id).slice(-4) : ''}`;
    };

    const isOneOnOne = peers.length === 1;

    return (
        <div className="fixed inset-0 bg-[#0b141a] z-[100] flex flex-col overflow-hidden">
            {/* Header / Waiting State */}
            {peers.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center flex-col z-10 pointer-events-none">
                    <div className="w-24 h-24 bg-[#1f2c34] rounded-full flex items-center justify-center mb-6 shadow-2xl ring-4 ring-[#00a884]/20 animate-pulse">
                        <span className="text-4xl font-bold text-gray-300">{currentUser.name ? currentUser.name[0].toUpperCase() : 'ME'}</span>
                    </div>
                    <h2 className="text-gray-200 text-2xl font-semibold mb-2 drop-shadow-md">Waiting for others...</h2>
                    <p className="text-gray-400 text-sm bg-black/20 px-4 py-1 rounded-full backdrop-blur-sm">Group call in {participants.find(p => String(p.id) !== String(currentUser.id))?.groupName || "Group"}</p>
                </div>
            )}

            {/* Video Grid */}
            <div className="flex-1 relative w-full h-full p-2 md:p-4">
                {isOneOnOne ? (
                    // 1-on-1 Layout (WhatsApp Style: Remote Full, Self PIP)
                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[#1f2c34] shadow-2xl border border-gray-800">
                        {/* Remote Peer */}
                        <Video peer={peers[0].peer} className="w-full h-full border-none rounded-none" name={getParticipantName(peers[0].peerID)} isSelf={false} />

                        {/* Self PIP */}
                        <div className="absolute bottom-24 right-4 w-32 h-48 md:w-48 md:h-72 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700/50 z-20 transition-all hover:scale-105">
                            {isVideoEnabled && stream ? (
                                <video muted ref={userVideo} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-[#1f2c34]">
                                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 font-bold mb-2">{currentUser.name?.[0]}</div>
                                    <span className="text-[10px] text-gray-500 uppercase">Camera Off</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Group Layout (Grid)
                    <div className={`grid gap-3 w-full h-full ${peers.length + 1 <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                        peers.length + 1 <= 4 ? 'grid-cols-2 grid-rows-2' :
                            'grid-cols-2 md:grid-cols-3'
                        }`}>
                        {/* Self Grid Item */}
                        <div className="relative bg-[#1f2c34] rounded-xl overflow-hidden shadow-lg border border-gray-800">
                            {isVideoEnabled && stream ? (
                                <video muted ref={userVideo} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center flex-col">
                                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold text-gray-400 mb-2">
                                        {currentUser.name?.[0]}
                                    </div>
                                    <span className="text-xs text-gray-500">Camera Off</span>
                                </div>
                            )}
                            <div className="absolute bottom-3 left-3 text-white text-xs font-medium drop-shadow-md bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm">
                                You
                            </div>
                        </div>

                        {/* Peers */}
                        {peers.map((peerObj) => (
                            <Video key={peerObj.peerID} peer={peerObj.peer} className="w-full h-full" name={getParticipantName(peerObj.peerID)} isSelf={false} />
                        ))}
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-6 bg-[#1f2c34] px-8 py-3 rounded-full shadow-2xl border border-gray-700/50 z-50">
                <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-all ${!isVideoEnabled ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-gray-700/50 text-white hover:bg-gray-600'}`}
                    title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
                >
                    {isVideoEnabled ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21l-3.5-3.5m-2-2l-3.5-3.5"></path><path d="M15.12 15.12L7 7l-4 4v9h16v-4l-3.88-3.88z"></path></svg>
                    )}
                </button>

                <button
                    onClick={toggleMute}
                    className={`p-3 rounded-full transition-all ${isMuted ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-gray-700/50 text-white hover:bg-gray-600'}`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    )}
                </button>

                <button
                    onClick={handleEndCall}
                    className="p-3 px-6 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-xl hover:shadow-red-500/20 transform hover:scale-105 transition-all"
                    title="End Call"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C2.81 8.47 7.2 6 12 6c4.8 0 9.19 2.47 11.71 5.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.66-1.85.995.995 0 0 1-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z" /></svg>
                </button>
            </div>
        </div>
    );
};

export default GroupCall;
