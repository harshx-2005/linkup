import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { toast } from 'react-toastify';

const Video = ({ peer, className, name }) => {
    const ref = useRef();
    const [hasVideo, setHasVideo] = useState(false);

    useEffect(() => {
        const handleStream = (stream) => {
            if (ref.current) ref.current.srcObject = stream;

            const checkVideo = () => {
                const videoTracks = stream.getVideoTracks();
                setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
            };

            checkVideo();

            // Listen for track changes
            stream.getVideoTracks().forEach(track => {
                track.onmute = () => setHasVideo(false);
                track.onunmute = () => setHasVideo(true);
                track.onended = () => setHasVideo(false);
            });

            // Polling fallback
            const interval = setInterval(checkVideo, 1000);
            return () => clearInterval(interval);
        };
        peer.on("stream", handleStream);
        return () => {
            peer.off("stream", handleStream);
        };
    }, [peer]);

    return (
        <div className={`relative bg-gray-900 ${className} flex items-center justify-center overflow-hidden`}>
            <video
                playsInline
                autoPlay
                ref={ref}
                className={`w-full h-full object-cover ${hasVideo ? 'block' : 'hidden'}`}
            />
            {!hasVideo && (
                <div className="flex flex-col items-center justify-center animate-pulse">
                    <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-2 shadow-lg border-2 border-gray-600">
                        <span className="text-3xl font-bold text-gray-300">{name ? name[0].toUpperCase() : '?'}</span>
                    </div>
                    <span className="text-gray-400 text-sm font-medium">Video Off</span>
                </div>
            )}
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
    // eslint-disable-next-line
    const conversationIdRef = useRef(conversationId);

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
                let errorMessage = "Could not access camera/microphone.";

                if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                    errorMessage = "Camera/Mic is in use by another app.";
                } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    errorMessage = "Permission denied. Please allow access.";
                } else if (err.name === 'NotFoundError') {
                    errorMessage = "No camera/microphone found.";
                }

                toast.error(`${errorMessage} Joining as listener.`);

                if (isVideo) {
                    try {
                        localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                        setStream(localStream);
                        streamRef.current = localStream;
                        if (userVideo.current) userVideo.current.srcObject = localStream;
                    } catch (e) {
                        console.error("Failed to get audio:", e);
                        toast.error("Could not access audio either.");
                    }
                }
            }
            socket.emit("join_group_call", { conversationId, userId: currentUser.id });
        };

        initCall();

        socket.on("all_users_in_call", (users) => {
            const peersArr = [];
            users.forEach((userObj) => {
                const { socketId, userId } = userObj;
                if (userId === currentUser.id && socketId === socket.id) return;
                const peer = createPeer(socketId, socket.id, localStream);
                const peerItem = { peerID: userId, socketID: socketId, peer };
                peersRef.current.push(peerItem);
                peersArr.push(peerItem);
            });
            setPeers(peersArr);
        });

        socket.on("user_joined_call", (payload) => {
            if (peersRef.current.find(p => p.socketID === payload.callerID)) return;
            const peer = addPeer(payload.signal, payload.callerID, localStream);
            const peerItem = { peerID: payload.callerUserID, socketID: payload.callerID, peer };
            peersRef.current.push(peerItem);
            setPeers((users) => [...users, peerItem]);
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

        return () => {
            socket.emit("leave_group_call", conversationId);
            peersRef.current.forEach(p => p.peer.destroy());
            if (localStream) localStream.getTracks().forEach(track => track.stop());
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());

            socket.off("all_users_in_call");
            socket.off("user_joined_call");
            socket.off("receiving_returned_signal");
            socket.off("user_left_call");
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

    const retryMedia = async () => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            // Verify we actually got tracks
            if (newStream.getVideoTracks().length === 0) throw new Error("No video tracks");

            setStream(newStream);
            streamRef.current = newStream;
            setIsVideoEnabled(true);
            setIsMuted(false);
            if (userVideo.current) userVideo.current.srcObject = newStream;

            // Add tracks to existing peers
            peersRef.current.forEach(({ peer }) => {
                const p = peer.peer;
                // Add tracks that are not already present (simplified)
                newStream.getTracks().forEach(track => {
                    // SimplePeer addTrack
                    p.addTrack(track, newStream);
                });
            });

            toast.success("Camera connected!");
        } catch (err) {
            console.error("Retry failed:", err);
            toast.error("Still can't access camera. Close other apps/tabs.");
        }
    };

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

    const toggleVideo = () => {
        const s = streamRef.current;
        if (s) {
            const track = s.getVideoTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsVideoEnabled(track.enabled);
            }
        } else {
            // If no stream, try to acquire it
            retryMedia();
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
        return p ? p.name : `User ${id ? id.toString().slice(-4) : '?'}`;
    };

    const isOneOnOne = peers.length === 1;

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col overflow-hidden">
            <div className="flex-1 relative w-full h-full">
                {peers.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="z-10 flex flex-col items-center">
                            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-xl border-4 border-gray-700">
                                <span className="text-3xl font-bold text-gray-300">{currentUser.name ? currentUser.name[0].toUpperCase() : 'ME'}</span>
                            </div>
                            <h2 className="text-white text-xl font-semibold mb-2">Waiting for others...</h2>
                            <p className="text-gray-400 text-sm">Everyone in this group can join.</p>
                        </div>
                        {streamRef.current && isVideoEnabled && (
                            <video muted ref={userVideo} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl transform scale-x-[-1]" />
                        )}
                    </div>
                ) : isOneOnOne ? (
                    <>
                        <div className="absolute inset-0 bg-gray-900">
                            <Video peer={peers[0].peer} className="w-full h-full" name={getParticipantName(peers[0].peerID)} />
                            <div className="absolute top-12 left-4 text-white font-semibold text-lg drop-shadow-md z-10">
                                {getParticipantName(peers[0].peerID)}
                            </div>
                        </div>

                        <div className="absolute bottom-28 right-4 w-32 h-48 bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-700/50 shadow-2xl z-20 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                            {streamRef.current && isVideoEnabled ? (
                                <video muted ref={userVideo} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-gray-500">
                                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mb-2">
                                        <span className="text-lg font-bold text-gray-400">{currentUser.name ? currentUser.name[0].toUpperCase() : 'ME'}</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-gray-600">Camera Off</span>
                                    {!streamRef.current && (
                                        <button onClick={(e) => { e.stopPropagation(); retryMedia(); }} className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 underline">
                                            Enable
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className={`w-full h-full p-2 grid gap-2 ${peers.length + 1 <= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                        <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700/50 group">
                            {streamRef.current && isVideoEnabled ? (
                                <video muted ref={userVideo} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-xl font-bold text-gray-400">
                                        {currentUser.name?.[0] || "U"}
                                    </div>
                                    {!streamRef.current && (
                                        <button onClick={(e) => { e.stopPropagation(); retryMedia(); }} className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
                                            Turn On Camera
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 text-white text-sm font-medium drop-shadow-md bg-black/40 px-2 py-0.5 rounded">You</div>
                        </div>

                        {peers.map((peerObj) => (
                            <div key={peerObj.peerID} className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700/50">
                                <Video peer={peerObj.peer} className="w-full h-full" name={getParticipantName(peerObj.peerID)} />
                                <div className="absolute bottom-2 left-2 text-white text-sm font-medium drop-shadow-md bg-black/40 px-2 py-0.5 rounded">
                                    {getParticipantName(peerObj.peerID)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6 bg-gray-900/60 backdrop-blur-xl px-8 py-4 rounded-full border border-gray-700/50 shadow-2xl z-50 transition-all hover:bg-gray-900/80">
                <button onClick={toggleVideo} className={`p-3.5 rounded-full transition-all duration-200 ${!isVideoEnabled ? 'bg-white text-gray-900' : 'bg-gray-700/50 text-white hover:bg-gray-600'}`}>
                    {!isVideoEnabled ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    )}
                </button>
                <button onClick={toggleMute} className={`p-3.5 rounded-full transition-all duration-200 ${isMuted ? 'bg-white text-gray-900' : 'bg-gray-700/50 text-white hover:bg-gray-600'}`}>
                    {isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    )}
                </button>
                <button onClick={handleEndCall} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg hover:shadow-red-500/30 transform hover:scale-105 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C2.81 8.47 7.2 6 12 6c4.8 0 9.19 2.47 11.71 5.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.66-1.85.995.995 0 0 1-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z" /></svg>
                </button>
            </div>
        </div>
    );
};

export default GroupCall;
