import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useAuth } from '../context/AuthContext';
import socket from '../socket/socket';
import axios from 'axios';
import { toast } from 'react-toastify';
import CallModal from '../components/CallModal';

import CallInterface from '../components/CallInterface';
import GroupCall from '../components/GroupCall';

const Chat = () => {
    // ... (rest of the component)
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);

    // Call State
    const [incomingCall, setIncomingCall] = useState(null); // { offer, from, fromUserId, isVideo, ... }
    const [incomingGroupCall, setIncomingGroupCall] = useState(null); // { conversationId, name, ... }
    const [activeCall, setActiveCall] = useState(null); // { isVideo, ... }
    const [activeGroupSession, setActiveGroupSession] = useState(null); // { conversationId, type } or null
    const [activeCallConversations, setActiveCallConversations] = useState(new Map()); // Map: conversationId -> initiatorId

    // Refs
    // Use a ref for ringtone to ensure we can stop it from anywhere
    const ringtoneRef = useRef(new Audio('/sounds/ringtone.mp3'));
    const peerConnectionRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);

    // Refs for accessing state inside socket listeners without re-binding
    const selectedConversationRef = useRef(selectedConversation);
    const messagesRef = useRef(messages);
    const userRef = useRef(user);
    const activeCallRef = useRef(activeCall);
    const callStartTimeRef = useRef(null);
    const groupCallStartTimeRef = useRef(null);

    // Helper to stop ringtone
    const stopRingtone = () => {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
    };
    const callTimeoutRef = useRef(null);

    const iceCandidatesQueue = useRef([]);
    const tempRemoteStreamRef = useRef(null); // Fix for receiver crash

    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
        messagesRef.current = messages;
        userRef.current = user;
        activeCallRef.current = activeCall;
    }, [selectedConversation, messages, user, activeCall]);

    const [typingUser, setTypingUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    const markMessagesAsSeen = useCallback(async (conversationId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/messages/seen', { conversationId }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Emit socket event to notify others
            if (user?.id) {
                console.log('Emitting mark_seen for room:', String(conversationId));
                socket.emit('mark_seen', { conversationId: String(conversationId), userId: user.id });
            }
        } catch (error) {
            console.error('Error marking messages as seen:', error);
        }
    }, [user?.id]);

    const markMessagesAsDelivered = useCallback(async (conversationId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/messages/delivered', { conversationId }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (user?.id) {
                socket.emit('mark_delivered', { conversationId: String(conversationId), userId: user.id });
            }
        } catch (error) {
            console.error('Error marking as delivered:', error);
        }
    }, [user?.id]);

    // ...

    const handleSelectConversation = async (conv) => {
        const updatedConv = { ...conv, unreadCount: 0 };
        setSelectedConversation(updatedConv);
        selectedConversationRef.current = updatedConv;

        // Reset state
        setMessages([]);
        setPage(1);
        setHasMore(true);
        setTypingUser(null);

        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));

        await fetchMessages(conv.id);
        markMessagesAsSeen(conv.id);

        localStorage.setItem('selectedConversationId', conv.id);
        socket.emit('join_conversation', String(conv.id));
    };

    const handleAcceptRequest = async (convId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/conversations/${convId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, requestStatus: 'accepted' } : c));
            if (selectedConversation?.id === convId) {
                setSelectedConversation(prev => ({ ...prev, requestStatus: 'accepted' }));
            }
            toast.success("Request accepted.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to accept request.");
        }
    };

    const handleRejectRequest = async (convId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/conversations/${convId}/reject`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Remove conversation
            setConversations(prev => prev.filter(c => c.id !== convId));
            if (selectedConversation?.id === convId) {
                setSelectedConversation(null);
            }
            toast.info("Request rejected.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to reject request.");
        }
    };

    const handleBlockUser = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/blocks/block', { blockedId: userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.error("User blocked.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to block user.");
        }
    };

    const handleClearChat = async () => {
        if (!selectedConversation) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/conversations/${selectedConversation.id}/clear`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages([]);
            setConversations(prev => prev.map(c =>
                c.id === selectedConversation.id
                    ? { ...c, lastMessage: null, lastMessageTime: null }
                    : c
            ));
            toast.success("Chat cleared");
        } catch (error) {
            console.error(error);
            toast.error("Failed to clear chat");
        }
    };



    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);
    useEffect(() => {
        if (user?.id) {
            socket.connect();
            socket.emit('join_room', user.id);
            console.log('Connected to socket');
        }

        return () => {
            if (user?.id) {
                socket.disconnect();
                console.log('Disconnected from socket');
            }
        };
    }, [user?.id]);

    // Effect for Socket Listeners
    // Effect for Socket Listeners
    useEffect(() => {
        if (!user?.id) return;

        const handleReceiveMessage = (message) => {
            const currentSelected = selectedConversationRef.current;

            // Check if we are in this conversation or it's a new one
            if (currentSelected && String(message.conversationId) === String(currentSelected.id)) {
                setMessages((prev) => {
                    const exists = prev.some(m => m.id === message.id);
                    if (exists) return prev;
                    return [...prev, message];
                });

                // If focused, mark as seen. If just open but not focused (e.g. background), standard logic applies.
                // For now, assuming "selected" means seen.
                markMessagesAsSeen(message.conversationId);
            } else {
                // If not selected, we still "received" it, so we mark as delivered.
                // Optimization: The server usually knows we are online and could mark delivered automatically?
                // But explicit ack is better.
                markMessagesAsDelivered(message.conversationId);
            }

            // Play notification sound if message is not from current user
            if (message.senderId != userRef.current?.id) {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e => console.log('Audio error:', e));

                // Desktop Notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    const senderName = message.User?.name || message.senderName || 'New Message';
                    // Trigger if window hidden OR not current chat
                    if (document.hidden || !currentSelected || String(message.conversationId) !== String(currentSelected.id)) {
                        const notification = new Notification(`New message from ${senderName}`, {
                            body: message.messageType === 'text' ? message.content : `Sent a ${message.messageType}`,
                            icon: message.User?.avatar || '/vite.svg',
                            tag: String(message.conversationId) // Group notifications by conversation
                        });
                        notification.onclick = () => {
                            window.focus();
                        };
                    }
                }

                if (!currentSelected || message.conversationId != currentSelected.id) {
                    const senderName = message.User?.name || message.senderName || 'someone';
                    toast.info(`New message from ${senderName}`);
                }
            }

            // Update sidebar
            setConversations((prev) => {
                const convExists = prev.find(c => c.id == message.conversationId);
                if (convExists) {
                    return prev.map((conv) => {
                        if (conv.id == message.conversationId) {
                            const isCurrent = currentSelected && String(conv.id) === String(currentSelected.id);

                            let previewContent = message.content;
                            if (message.messageType === 'image') previewContent = '📷 Photo';
                            else if (message.messageType === 'video') previewContent = '🎥 Video';
                            else if (message.messageType === 'audio') previewContent = '🎤 Audio';
                            else if (message.messageType === 'file') previewContent = '📄 File';
                            else if (message.messageType === 'system' || (message.content && message.content.includes('call_log'))) {
                                try {
                                    const raw = message.content;
                                    const start = raw.indexOf('{');
                                    const end = raw.lastIndexOf('}');
                                    if (start !== -1 && end !== -1) {
                                        const parsed = JSON.parse(raw.substring(start, end + 1));
                                        if (parsed.type === 'call_log') {
                                            const isMissed = parsed.status === 'missed' || parsed.status === 'declined';
                                            // Received message = Incoming
                                            previewContent = isMissed ? '📞 Missed Call' : (parsed.isVideo ? '🎥 Video Call' : '↙ Incoming Call');
                                        }
                                    }
                                } catch (e) { }
                            }

                            return {
                                ...conv,
                                lastMessage: previewContent,
                                lastMessageTime: message.createdAt,
                                unreadCount: isCurrent ? 0 : (conv.unreadCount || 0) + 1
                            };
                        }
                        return conv;
                    }).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
                } else {
                    fetchConversations();
                    return prev;
                }
            });
        };

        const handleUserTyping = (data) => {
            const currentSelected = selectedConversationRef.current;
            if (currentSelected && String(data.conversationId) === String(currentSelected.id) && data.userId != userRef.current?.id) {
                setTypingUser(data.userName);
            }
        };

        const handleUserStopTyping = (data) => {
            const currentSelected = selectedConversationRef.current;
            if (currentSelected && String(data.conversationId) === String(currentSelected.id)) {
                setTypingUser(null);
            }
        };

        const handleUserOnline = (userId) => setOnlineUsers((prev) => new Set(prev).add(String(userId)));
        const handleUserOffline = (data) => {
            let userId, lastSeen;
            if (typeof data === 'object') {
                userId = data.userId;
                lastSeen = data.lastSeen;
            } else {
                userId = data;
            }

            setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(String(userId));
                return newSet;
            });

            // Update lastSeen in conversations
            if (lastSeen) {
                setConversations(prev => prev.map(conv => {
                    if (String(conv.otherUserId) === String(userId)) {
                        return { ...conv, lastSeen };
                    }
                    return conv;
                }));

                // Also update selectedConversation if applicable
                if (selectedConversationRef.current?.otherUserId === userId) {
                    setSelectedConversation(prev => ({ ...prev, lastSeen }));
                }
            }
        };

        const handleMessagesSeen = (data) => {
            console.log("Socket: messages_seen received", data);
            const currentSelected = selectedConversationRef.current;
            if (currentSelected && String(data.conversationId) === String(currentSelected.id)) {
                setMessages((prev) => prev.map((msg) => {
                    if (msg.senderId == userRef.current?.id) {
                        const seenBy = msg.seenBy || [];
                        const alreadySeen = seenBy.some(id => String(id) === String(data.userId));
                        if (!alreadySeen) {
                            console.log(`Marking message ${msg.id} as seen by ${data.userId}`);
                            return { ...msg, seenBy: [...seenBy, parseInt(data.userId)] };
                        }
                    }
                    return msg;
                }));
            }
        };

        const handleMessagesDelivered = (data) => {
            const currentSelected = selectedConversationRef.current;
            if (currentSelected && String(data.conversationId) === String(currentSelected.id)) {
                setMessages((prev) => prev.map((msg) => {
                    if (msg.senderId == userRef.current?.id) {
                        const deliveredTo = msg.deliveredTo || [];
                        const alreadyDelivered = deliveredTo.some(id => id == data.userId);
                        if (!alreadyDelivered) {
                            return { ...msg, deliveredTo: [...deliveredTo, parseInt(data.userId)] };
                        }
                    }
                    return msg;
                }));
            }
        };

        const handleMessageEdited = (data) => {
            const currentSelected = selectedConversationRef.current;
            if (currentSelected && String(data.conversationId) === String(currentSelected.id)) {
                setMessages((prev) => prev.map((msg) => msg.id === data.messageId ? { ...msg, content: data.content } : msg));
            }
            setConversations(prev => prev.map(conv => {
                if (conv.id == data.conversationId && conv.lastMessage === messagesRef.current.find(m => m.id === data.messageId)?.content) {
                    return { ...conv, lastMessage: data.content };
                }
                return conv;
            }));
        };

        const handleMessageDeleted = (data) => {
            const currentSelected = selectedConversationRef.current;
            if (currentSelected && String(data.conversationId) === String(currentSelected.id)) {
                if (data.deleteForEveryone) {
                    setMessages((prev) => prev.map((msg) => msg.id === data.messageId ? { ...msg, content: 'This message was deleted', deletedForEveryone: true } : msg));
                } else {
                    setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
                }
            }

            // Update sidebar if last message was deleted
            setConversations(prev => prev.map(conv => {
                if (conv.id == data.conversationId) {
                    // Ideally we should check if the deleted message IS the last message.
                    // But we don't strictly know the ID of the last message in `conv` object here easily without extra data.
                    // However, we can assume if the timestamp matches or if we just update it.
                    // A simpler approach: If deletedForEveryone, update lastMessage text.
                    // If regular delete, we might need to fetch, but let's handle the "deleted for everyone" sidebar update case primarily.
                    if (data.deleteForEveryone) {
                        // We assume it might be the last message. If we don't check, we might overwrite a newer message?
                        // But `handleMessageDeleted` doesn't give us the message timestamp.
                        // Let's rely on the fact that if it was deleted for everyone, it's significant.
                        // Actually, checking if `conv.lastMessage` matches the old content would be good but we don't have old content here.
                        // Let's just update `lastMessage` to 'This message was deleted' ???
                        // No, that's risky if it's an old message.
                        // Better: We only update sidebar if it's the latest message.
                        // We can check `messagesRef.current`? No, that's only for selected conv.
                        // Let's just fetch conversations again to be safe and accurate?
                        // Or, simpler: The socket event `message_deleted` should ideally carry `isLastMessage` or similar, but it doesn't.
                        // Let's blindly update for now? No. 
                        // The user issue is specifically about "message deleted for everyone still showing".
                        // Usually this refers to the last message.
                        // Let's fetch conversations. It's safe and ensures correctness.
                        fetchConversations();
                        return conv; // map needs to return
                    }
                }
                return conv;
            }));
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stop_typing', handleUserStopTyping);
        socket.on('user_online', handleUserOnline);
        socket.on('user_offline', handleUserOffline);
        socket.on('messages_seen', handleMessagesSeen);
        socket.on('messages_delivered', handleMessagesDelivered);
        socket.on('message_edited', handleMessageEdited);
        socket.on('message_deleted', handleMessageDeleted);



        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stop_typing', handleUserStopTyping);
            socket.off('user_online', handleUserOnline);
            socket.off('user_offline', handleUserOffline);
            socket.off('messages_seen', handleMessagesSeen);
            socket.off('messages_delivered', handleMessagesDelivered);
            socket.off('message_edited', handleMessageEdited);
            socket.off('message_deleted', handleMessageDeleted);
        };
    }, [user?.id, markMessagesAsSeen, markMessagesAsDelivered]);

    // --- WebRTC Socket Listeners (Isolated for stability) ---
    useEffect(() => {
        if (!socket) return;

        socket.on('call_incoming', handleIncomingCall);
        socket.on('call_accepted', handleCallAccepted);
        socket.on('ice_candidate', handleIceCandidate);
        socket.on('call_ended', handleCallEnded);
        socket.on('call_rejected', handleCallEnded);
        socket.on('call_switch_request', handleIncomingSwitchRequest);
        socket.on('call_switch_response', handleSwitchResponse);
        socket.on('group_call_started', handleGroupCallStarted);
        socket.on('group_call_ended', handleGroupCallEnded);

        return () => {
            socket.off('call_incoming', handleIncomingCall);
            socket.off('call_accepted', handleCallAccepted);
            socket.off('ice_candidate', handleIceCandidate);
            socket.off('call_ended', handleCallEnded);
            socket.off('call_rejected', handleCallEnded);
            socket.off('call_switch_request', handleIncomingSwitchRequest);
            socket.off('call_switch_response', handleSwitchResponse);
            socket.off('group_call_started', handleGroupCallStarted);
            socket.off('group_call_ended', handleGroupCallEnded);
        };
    }, []); // Empty dependency array ensures stability

    // Join all conversation rooms to receive real-time updates
    useEffect(() => {
        const joinAllRooms = () => {
            if (conversations.length > 0) {
                conversations.forEach(conv => {
                    socket.emit('join_conversation', String(conv.id));
                });
                console.log('Joined all conversation rooms');
            }
        };

        if (socket) {
            // Join initially if connected
            if (socket.connected) {
                joinAllRooms();
            }

            // Listen for reconnection
            socket.on('connect', joinAllRooms);

            return () => {
                socket.off('connect', joinAllRooms);
            };
        }
    }, [conversations]);






    // --- WebRTC Logic ---
    const createPeerConnection = (targetUserId) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ],
            bundlePolicy: 'max-bundle',
            icecandidatePoolSize: 10
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && targetUserId) {
                socket.emit('ice_candidate', {
                    to: targetUserId,
                    candidate: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            console.log("Remote stream received", event.streams);
            if (event.streams && event.streams[0]) {
                const stream = event.streams[0];
                tempRemoteStreamRef.current = stream; // Backup for receiver initialization

                // NEW: Debug and Force Enable Tracks
                stream.getTracks().forEach(t => {
                    console.log(`Track ${t.kind}: id=${t.id} enabled=${t.enabled}, muted=${t.muted}, readyState=${t.readyState}`);
                    t.enabled = true; // Force enable
                });

                setActiveCall(prev => {
                    // CRITICAL FIX: If state isn't ready (Receiver), just return (ref handles it)
                    if (!prev) {
                        console.log("State not ready in ontrack, stored in ref", stream.id);
                        return prev;
                    }

                    // Prevent redundant updates if stream ID is same
                    if (prev.remoteStream && prev.remoteStream.id === stream.id) {
                        return prev;
                    }
                    console.log("Setting new remote stream to state", stream.id);
                    return { ...prev, remoteStream: stream };
                });
            } else {
                console.warn("Received track event but no stream found", event);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log("ICE Connection State:", pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                toast.error(`Connection ${pc.iceConnectionState}. Firewall/Network preventing call.`);
            }
            if (pc.iceConnectionState === 'connected') {
                toast.success("Connection Established!");
            }
        };

        return pc;
    };

    // --- Video Switch Logic ---
    const [switchRequest, setSwitchRequest] = useState(null); // 'incoming' | 'outgoing' | null

    const handleRequestVideoSwitch = () => {
        if (!activeCallRef.current) return;
        setSwitchRequest('outgoing');
        socket.emit('call_switch_request', { toUserId: activeCallRef.current.toUserId });
    };

    const handleIncomingSwitchRequest = (data) => {
        // data: { from, fromUserId }
        const currentCall = activeCallRef.current;
        if (currentCall && String(data.fromUserId) === String(currentCall.toUserId)) {
            setSwitchRequest('incoming');
        }
    };

    const handleRespondToSwitch = async (accepted) => {
        const currentCall = activeCallRef.current;
        if (!currentCall) return;

        socket.emit('call_switch_response', {
            toUserId: currentCall.toUserId,
            accepted
        });
        setSwitchRequest(null);

        if (accepted) {
            // Upgrade my side
            await upgradeCallToVideo();
        }
    };

    const handleSwitchResponse = async (data) => {
        // data: { accepted, from }
        setSwitchRequest(null);
        if (data.accepted) {
            // Other side accepted -> Upgrade my side
            await upgradeCallToVideo();
        } else {
            alert("Video switch request rejected.");
        }
    };

    const upgradeCallToVideo = async () => {
        try {
            const currentCall = activeCallRef.current;
            if (!currentCall) throw new Error("No active call to upgrade");

            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            // Replace local stream in state
            setActiveCall(prev => ({ ...prev, isVideo: true, localStream: stream }));

            if (peerConnectionRef.current) {
                // Remove old audio track (or replace)
                // Actually, cleaner to just add video track if audio exists?
                // But typically we get a whole new stream.

                // Replace senders
                const senders = peerConnectionRef.current.getSenders();
                stream.getTracks().forEach(newTrack => {
                    const sender = senders.find(s => s.track?.kind === newTrack.kind);
                    if (sender) {
                        sender.replaceTrack(newTrack);
                    } else {
                        peerConnectionRef.current.addTrack(newTrack, stream);
                    }
                });

                // Note: Adding a track triggers negotiationneeded.
                // But since we are already connected, we might need to handle that.
                // For simplicity in this v1, replacing track might carry over?
                // Actually, if we add a video track where there wasn't one, we MUST renegotiate.
                // Let's force a renegotiation offer.

                const offer = await peerConnectionRef.current.createOffer();
                await peerConnectionRef.current.setLocalDescription(offer);
                socket.emit('call_user', {
                    toUserId: currentCall.toUserId,
                    offer: offer,
                    isVideo: true
                });
            }
        } catch (err) {
            console.error("Error upgrading to video:", err);
            if (err.name === 'NotAllowedError') {
                alert("Please allow camera access in your browser settings to switch to video.");
            } else {
                alert("Error accessing camera.");
            }
        }
    };


    const handleStartCall = async (isVideo) => {
        if (!selectedConversation) return;

        // 1. Identify Target
        let toUserId;
        if (selectedConversation.isGroup) {
            alert("Group calls not supported yet.");
            return;
        } else {
            toUserId = selectedConversation.otherUserId;
        }

        // 2. Local Stream
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });

            // 3. Create PC
            const pc = createPeerConnection(toUserId);
            peerConnectionRef.current = pc;

            // 4. Add Tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // 5. Create Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // 6. Signal
            socket.emit('call_user', {
                toUserId: toUserId,
                offer: offer,
                isVideo: isVideo,
                callerName: user.name
            });

            // 7. Update UI
            setActiveCall({
                name: selectedConversation.name,
                avatar: selectedConversation.avatar,
                isVideo: isVideo,
                toUserId: toUserId, // Store for ICE
                isCaller: true,
                localStream: stream
            });
            callStartTimeRef.current = null; // Reset, waits for accept to not start? 
            // Or start now? Usually duration starts on Connect.
            // We will leave null until "call_accepted" event or similar?
            // Actually, if I call and cancel, it's 'missed'. 'duration' null.
            // If I call and they answer, timer starts.
            // We need `handleCallAccepted` to set start time FOR CALLER.
            // We need `handleCallAccepted` to set start time FOR CALLER.
            // `handleAcceptCall` sets start time FOR RECEIVER.

            // 8. Auto-End Timeout (45s)
            if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = setTimeout(() => {
                // Check if still calling and not accepted
                // Use ref because state might be stale
                if (activeCallRef.current && activeCallRef.current.isCaller && !callStartTimeRef.current) {
                    toast.info("No answer.");
                    handleEndCall();
                }
            }, 45000);

        } catch (err) {
            console.error("Error starting call:", err);
            if (err.name === 'NotAllowedError') {
                alert("Please allow camera/microphone access in your browser settings.");
            } else {
                alert("Could not access camera/microphone");
            }
        }
    };



    const handleGroupCallStarted = (data) => {
        // Track active call
        setActiveCallConversations(prev => {
            const newMap = new Map(prev);
            newMap.set(String(data.conversationId), data.initiatorId);
            return newMap;
        });

        // data: { conversationId, initiatorId, fromSocketId }
        // If we started it, or are already in a call, don't ring
        if (String(data.initiatorId) === String(userRef.current?.id) || activeGroupSession) return;

        // Check age of call to prevent ringing on refresh (threshold: 5 seconds)
        if (data.startTime && (Date.now() - data.startTime > 5000)) {
            console.log("Call is old, suppressing ringtone:", Date.now() - data.startTime);
            return;
        }

        // Find Conversation Name
        const conv = conversations.find(c => String(c.id) === String(data.conversationId));
        const name = conv ? (conv.groupName || conv.name || "Group") : "Group Call";

        // Find Initiator Name
        const initiator = conv?.Users?.find(u => String(u.id) === String(data.initiatorId));
        const initiatorName = initiator?.name || "Someone";

        // Show Full Screen Modal
        setIncomingGroupCall({
            conversationId: data.conversationId,
            name: name,
            avatar: conv?.avatar,
            isVideo: false, // Default assumption
            initiatorName: initiatorName,
            initiatorId: data.initiatorId
        });

        // Play Ringtone
        ringtoneRef.current.loop = true;
        ringtoneRef.current.play().catch(e => console.log("Audio play failed", e));
    };

    const handleGroupCallEnded = (data) => {
        const { conversationId } = data;

        // Remove from active list
        setActiveCallConversations(prev => {
            const next = new Map(prev);
            next.delete(String(conversationId));
            return next;
        });

        // Stop ringing if pending
        setIncomingGroupCall(prev => {
            if (prev && String(prev.conversationId) === String(conversationId)) {
                stopRingtone();
                return null;
            }
            return prev;
        });

        // End active group call if it matches the one we are in
        // We use functional update to check current state safely without refs
        setActiveGroupSession(prev => {
            if (prev && String(prev.conversationId) === String(conversationId)) {
                // Toast logic moved here or kept global? 
                // We can't easily toast inside setter.
                // But we can check condition outside? No, we need current state.
                // Let's blindly toast if we are closing it? 
                // Or rely on the fact that if we are setting it to null, we are ending it.
                return null;
            }
            return prev;
        });

        // Toast logic (legacy check against selected, but mostly handled above)
        // If we were in the call (activeGroupSession was set), we effectively closed it.
    };

    const handleStartGroupCall = (type) => {
        if (!selectedConversation) return; // Safeguard
        groupCallStartTimeRef.current = Date.now();
        setActiveGroupSession({ conversationId: selectedConversation.id, type });
    };

    // [NEW] Reaction Handler
    const handleReact = (messageId, emoji) => {
        if (!conversation?.id) return;
        socket.emit('add_reaction', {
            conversationId: conversation.id,
            messageId,
            reaction: { userId: currentUser.id, emoji }
        });
    };

    // [NEW] Message Info State
    const [messageInfo, setMessageInfo] = useState(null); // The message object to show info for

    // [NEW] Toggle Disappearing
    const toggleDisappearing = () => {
        if (!conversation?.id) return;
        const newState = !conversation.disappearingEnabled;
        socket.emit('toggle_disappearing', {
            conversationId: conversation.id,
            state: newState
        });
        setShowMenu(false);
    };

    const handleEndGroupCall = () => {
        setActiveGroupSession(null);
        groupCallStartTimeRef.current = null;
    };


    const handleJoinGroupCall = (arg) => {
        // Stop Ringing
        stopRingtone();
        setIncomingGroupCall(null);

        // Determine ID (arg or from state)
        // Check if arg is an event (object) or ID (string/number)
        let targetId = arg;
        if (typeof arg === 'object') targetId = null;

        targetId = targetId || incomingGroupCall?.conversationId;
        if (!targetId) return;

        // Ensure we are selected
        const conv = conversations.find(c => String(c.id) === String(targetId));
        if (conv) setSelectedConversation(conv);

        // Reset state first to ensure clean mount
        setActiveGroupSession(null);
        setTimeout(() => {
            setActiveGroupSession({ conversationId: targetId, type: 'video' });
        }, 100);
    };

    const handleRejectGroupCall = () => {
        stopRingtone();
        setIncomingGroupCall(null);
    };

    const handleIncomingCall = (data) => {
        // Prevent self-calls loops (Caller should not see Incoming screen)
        if (user?.id && String(data.fromUserId) === String(user.id)) return;

        // If we simply get an offer while in a call -> Renegotiation (Upgrade)
        if (activeCall) {
            console.log("Renegotiation offer received", data);
            // Handle mid-call negotiation
            handleRenegotiation(data);
            return;
        }

        setIncomingCall({
            offer: data.offer,
            from: data.from, // socketId
            fromUserId: data.fromUserId,
            isVideo: data.isVideo,
            name: data.callerName || `User ${data.fromUserId}`,
        });
        console.log("Incoming call:", data);
    };

    const handleRenegotiation = async (data) => {
        if (!peerConnectionRef.current) return;

        try {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);

            socket.emit('answer_call', {
                to: data.from, // socketId
                answer: answer
            });

            // Update state to reflect video if upgraded
            if (data.isVideo) {
                setActiveCall(prev => ({ ...prev, isVideo: true }));
            }
        } catch (err) {
            console.error("Renegotiation error", err);
        }
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: incomingCall.isVideo, audio: true });

            const pc = createPeerConnection(incomingCall.fromUserId);
            peerConnectionRef.current = pc;

            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

            // Process queued ICE candidates (MUST be after Remote Description)
            while (iceCandidatesQueue.current.length > 0) {
                const candidate = iceCandidatesQueue.current.shift();
                try {
                    await pc.addIceCandidate(candidate);
                    console.log("Added queued ICE candidate");
                } catch (e) {
                    console.error("Error adding queued candidate", e);
                }
            }

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('answer_call', {
                to: incomingCall.from, // socketId of caller
                answer: answer
            });

            setActiveCall(prev => ({
                ...incomingCall,
                isCaller: false,
                localStream: stream,
                toUserId: incomingCall.fromUserId,
                toUserId: incomingCall.fromUserId,
                remoteStream: tempRemoteStreamRef.current || prev?.remoteStream || null
            }));
            callStartTimeRef.current = Date.now();
            setIncomingCall(null);

        } catch (err) {
            console.error("Error accepting call:", err);
            if (err.name === 'NotAllowedError') {
                alert("Please allow camera/microphone access in your browser settings.");
                // Reject call if we can't accept? Or just let it ring? 
                // Better to reject or let user try again.
            } else {
                alert("Error accessing media devices");
            }
            handleRejectCall();
        }
    };

    const handleRejectCall = async () => {
        if (incomingCall && incomingCall.from) {
            socket.emit('reject_call', { to: incomingCall.from });
            // Send declined log
            try {
                const logContent = JSON.stringify({
                    type: 'call_log',
                    status: 'declined',
                    isVideo: incomingCall.isVideo,
                    duration: null
                });

                // Find valid conversation to log to
                // We need to find a conversation where otherUserId === incomingCall.fromUserId
                const targetConv = conversations.find(c => String(c.otherUserId) === String(incomingCall.fromUserId));

                if (targetConv) {
                    // Manually send using axios to avoid UI dependeny
                    const token = localStorage.getItem('token');
                    await axios.post('/api/messages/send', {
                        conversationId: targetConv.id,
                        content: logContent,
                        messageType: 'system'
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(e => console.error("Failed to log decline:", e));

                    // Update local if selected
                    if (selectedConversation && String(selectedConversation.id) === String(targetConv.id)) {
                        fetchMessages(targetConv.id); // Refresh safely
                    }
                }
            } catch (e) { console.error(e); }
        }
        setIncomingCall(null);
    };

    const handleCallAccepted = async (answer) => {
        if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));

            // Process queued ICE candidates (Caller Side)
            while (iceCandidatesQueue.current.length > 0) {
                const candidate = iceCandidatesQueue.current.shift();
                try {
                    await peerConnectionRef.current.addIceCandidate(candidate);
                    console.log("Successfully added queued ICE candidate (Caller)");
                } catch (e) {
                    console.error("Error adding queued candidate", e);
                }
            }

            // For the caller, the call starts when accepted
            if (activeCallRef.current?.isCaller) {
                callStartTimeRef.current = Date.now();
            }
            // Clear timeout
            if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
        }
    };

    const handleIceCandidate = async (candidate) => {
        console.log("Socket: Received ICE candidate from remote");
        // Must have remoteDescription set before adding candidates
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            try {
                await peerConnectionRef.current.addIceCandidate(candidate);
                console.log("Successfully added ICE candidate");
            } catch (e) {
                console.error("Error adding ice candidate", e);
            }
        } else {
            // Queue candidate if PC not ready or remote description missing
            console.log("Queueing ICE candidate (No Remote Description)");
            iceCandidatesQueue.current.push(candidate);
        }
    };

    const handleEndCall = () => {
        // Clear timeout
        if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }

        // Use Ref if activeCall (state) is stale/null in this closure
        const callState = activeCall || activeCallRef.current;

        if (callState?.localStream) {
            callState.localStream.getTracks().forEach(track => track.stop());
        }

        socket.emit('end_call', {
            to: callState?.toUserId || callState?.from
        });

        // Log Logic
        try {
            const isVideo = activeCall?.isVideo;
            let status = 'missed';
            let duration = null;

            if (callStartTimeRef.current) {
                status = 'ended';
                const ms = Date.now() - callStartTimeRef.current;
                const totalSeconds = Math.floor(ms / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            const logContent = JSON.stringify({
                type: 'call_log',
                status,
                isVideo,
                duration
            });

            // Check if we can log (same conversation safeguard)
            // `activeCall.toUserId` (if caller) or `activeCall.fromUserId` (if receiver? activeCall doesn't store fromUserId usually, it stores `toUserId` or we need to derive).
            const partnerId = activeCall.isCaller ? activeCall.toUserId : activeCall.fromUserId;

            // Find conversation with this partner
            const targetConv = conversations.find(c => String(c.otherUserId) === String(partnerId));

            if (targetConv) {
                const token = localStorage.getItem('token');
                axios.post('/api/messages/send', {
                    conversationId: targetConv.id,
                    content: logContent,
                    messageType: 'system'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(() => {
                    if (selectedConversation && String(selectedConversation.id) === String(targetConv.id)) {
                        // Update UI or refetch?
                        // Adding to messages manually might duplicate if socket comes back?
                        // Let socket handle it.
                    }
                }).catch(e => console.error("Failed to log call end:", e));
            }
        } catch (e) { console.error("Log error", e); }

        setActiveCall(null);
        setIncomingCall(null);
        peerConnectionRef.current = null;
        callStartTimeRef.current = null;
    };

    const handleCallEnded = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
        if (activeCall?.localStream) {
            activeCall.localStream.getTracks().forEach(track => track.stop());
        }
        setActiveCall(null);
        setIncomingCall(null);
        peerConnectionRef.current = null;
        toast.info("Call ended", { toastId: 'call_ended' });
    };


    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/conversations', {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Sanitize lastMessage for Call Logs (Robust Parse)
            const sanitized = res.data.map(conv => {
                let preview = conv.lastMessage;
                // Robust check for call log signature
                if (preview && typeof preview === 'string' && preview.includes('call_log')) {
                    try {
                        const raw = preview;
                        const start = raw.indexOf('{');
                        const end = raw.lastIndexOf('}');
                        if (start !== -1 && end !== -1) {
                            const parsed = JSON.parse(raw.substring(start, end + 1));
                            if (parsed.type === 'call_log') {
                                const isMissed = parsed.status === 'missed' || parsed.status === 'declined';
                                preview = isMissed ? '📞 Missed Call' : (parsed.isVideo ? '🎥 Video Call' : '📞 Voice Call');
                            }
                        }
                    } catch (e) { }
                }
                return { ...conv, lastMessage: preview };
            });

            setConversations(sanitized);

            // Join all conversation rooms to receive real-time updates (and active calls)
            sanitized.forEach(conv => {
                socket.emit('join_conversation', conv.id);
            });
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    };

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // ...

    const fetchMessages = async (conversationId, pageNum = 1) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/messages/${conversationId}?page=${pageNum}&limit=20`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.data.length < 20) setHasMore(false);

            if (pageNum === 1) {
                setMessages(res.data);

                // Mark fetched messages as delivered if not already
                const unseenIds = res.data
                    .filter(m => m.senderId !== user?.id && (!m.deliveredTo || !m.deliveredTo.includes(user?.id)))
                    .map(m => m.conversationId); // We need conversationId. Actually we can just call for the conversation once.

                if (unseenIds.length > 0) {
                    // Optimization: Just call for the conversation ID once if there are ANY undelivered messages.
                    markMessagesAsDelivered(conversationId);
                }

            } else {
                setMessages(prev => [...res.data, ...prev]);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const loadMoreMessages = () => {
        if (hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchMessages(selectedConversation.id, nextPage);
        }
    };





    const handleSendMessage = async (content, messageType = 'text', attachmentUrl = null, replyToId = null) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/messages/send', {
                conversationId: selectedConversation.id,
                content,
                messageType,
                attachmentUrl,
                replyToId,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setMessages((prev) => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });

            setConversations(prev => {
                const updated = prev.map(c => {
                    if (String(c.id) === String(selectedConversation.id)) {
                        let previewText = content;
                        if (messageType === 'image') previewText = '📷 Photo';
                        else if (messageType === 'video') previewText = '🎥 Video';
                        else if (messageType === 'audio') previewText = '🎤 Audio';
                        else if (messageType === 'file') previewText = '📄 File';
                        else if (messageType === 'system' || (content && content.includes('call_log'))) {
                            try {
                                const raw = content;
                                const start = raw.indexOf('{');
                                const end = raw.lastIndexOf('}');
                                if (start !== -1 && end !== -1) {
                                    const parsed = JSON.parse(raw.substring(start, end + 1));
                                    if (parsed.type === 'call_log') {
                                        const isMissed = parsed.status === 'missed' || parsed.status === 'declined';
                                        previewText = isMissed ? '📞 Missed Call' : (parsed.isVideo ? '🎥 Video Call' : '↗ Outgoing Call');
                                    }
                                }
                            } catch (e) { }
                        }

                        return {
                            ...c,
                            lastMessage: previewText,
                            lastMessageTime: new Date()
                        };
                    }
                    return c;
                });
                const current = updated.find(c => String(c.id) === String(selectedConversation.id));
                const others = updated.filter(c => String(c.id) !== String(selectedConversation.id));
                return current ? [current, ...others] : prev;
            });

        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleEditMessage = async (messageId, newContent) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`/api/messages/${messageId}`, { content: newContent }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessages((prev) => prev.map((msg) => msg.id === messageId ? { ...msg, content: newContent } : msg));
            socket.emit('edit_message', { conversationId: selectedConversation.id, messageId, content: newContent });
        } catch (error) {
            console.error('Error editing message:', error);
        }
    };

    const handleDeleteMessage = async (messageId, deleteForEveryone) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`/api/messages/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { deleteForEveryone }
            });

            if (deleteForEveryone) {
                setMessages((prev) => prev.map((msg) => msg.id === messageId ? { ...msg, content: 'This message was deleted', deletedForEveryone: true, messageType: 'text', attachmentUrl: null } : msg));
            } else {
                setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
            }

            socket.emit('delete_message', { conversationId: selectedConversation.id, messageId, deleteForEveryone });
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const handleDismissCallBanner = (conversationId) => {
        setActiveCallConversations(prev => {
            const newMap = new Map(prev);
            newMap.delete(String(conversationId));
            return newMap;
        });
    };

    const handleNewConversation = (newConv) => {
        setConversations((prev) => {
            const exists = prev.find(c => c.id === newConv.id);
            if (exists) return prev;
            return [newConv, ...prev];
        });

        setSelectedConversation(newConv);
        fetchMessages(newConv.id);
        socket.emit('join_conversation', newConv.id);

        if (newConv.isGroup) {
            const memberIds = newConv.members.map(m => m.id).filter(id => id !== user.id);
            socket.emit('new_conversation', { conversation: newConv, memberIds });
        } else {
            socket.emit('new_conversation', { conversation: newConv, toUserId: newConv.otherUserId });
        }
    };

    useEffect(() => {
        const init = async () => {
            await fetchConversations();
        };
        init();
    }, []);

    useEffect(() => {
        const savedConvId = localStorage.getItem('selectedConversationId');
        if (savedConvId && conversations.length > 0 && !selectedConversation) {
            const found = conversations.find(c => String(c.id) === String(savedConvId));
            if (found) {
                handleSelectConversation(found);
            }
        }
    }, [conversations]);

    return (
        <div className="flex h-screen premium-bg text-gray-100 overflow-hidden font-sans">
            <div className={`
                ${selectedConversation ? 'hidden md:flex' : 'flex'} 
                w-full md:w-[380px] flex-shrink-0 flex-col z-20 h-full
                border-r border-white/5 shadow-2xl backdrop-blur-3xl bg-black/40
            `}>
                <Sidebar
                    conversations={conversations}
                    onSelectConversation={handleSelectConversation}
                    selectedConversation={selectedConversation}
                    onlineUsers={onlineUsers}
                    onNewConversation={handleNewConversation}
                />
            </div>

            {selectedConversation ? (
                <div className="flex-1 flex flex-col h-full relative z-10 glass-panel">
                    <ChatWindow
                        conversation={selectedConversation}
                        messages={messages}
                        currentUser={user}
                        onSendMessage={handleSendMessage}
                        typingUser={typingUser}
                        socket={socket}
                        onEditMessage={handleEditMessage}
                        onDeleteMessage={handleDeleteMessage}
                        onStartCall={handleStartCall}
                        onStartGroupCall={handleStartGroupCall}
                        activeCallConversations={activeCallConversations}
                        onJoinGroupCall={handleJoinGroupCall}
                        onTyping={() => socket.emit('typing', { conversationId: selectedConversation.id, userId: user.id, userName: user.name })}
                        onStopTyping={() => socket.emit('stop_typing', { conversationId: selectedConversation.id, userId: user.id })}
                        onlineUsers={onlineUsers}
                        onAcceptRequest={handleAcceptRequest}
                        onRejectRequest={handleRejectRequest}
                        onBlockUser={handleBlockUser}
                        onClearChat={handleClearChat}
                        onBack={() => setSelectedConversation(null)}
                        onReact={handleReact}
                        onToggleDisappearing={toggleDisappearing}
                        onShowInfo={(msg) => setMessageInfo(msg)}
                    />

                    {messageInfo && (
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMessageInfo(null)}>
                            <div className="bg-[#2a3942] w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#202c33]">
                                    <h3 className="text-white font-bold text-lg">Message Info</h3>
                                    <button onClick={() => setMessageInfo(null)} className="text-gray-400 hover:text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                                <div className="p-4 max-h-[60vh] overflow-y-auto">
                                    <div className="mb-6 bg-[#111b21] p-3 rounded-lg border border-gray-700/50">
                                        <p className="text-gray-300 text-sm italic mb-1">"{messageInfo.content || (messageInfo.attachmentUrl ? 'Media Attachment' : 'Message')}"</p>
                                        <p className="text-xs text-gray-500 text-right">{new Date(messageInfo.createdAt).toLocaleTimeString()}</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-blue-400 text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l5 5L22 7"></path><path d="M12 17l5 5L22 7"></path></svg>
                                                Read By
                                            </h4>
                                            <div className="space-y-2">
                                                {messageInfo.seenBy && messageInfo.seenBy.length > 0 ? (
                                                    messageInfo.seenBy.map((uid, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition">
                                                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
                                                                {uid}
                                                            </div>
                                                            <span className="text-gray-200 text-sm">User {uid}</span>
                                                            <span className="ml-auto text-xs text-blue-400">Read</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-gray-500 text-sm italic pl-2">No one yet</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-gray-400 text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                                                Delivered To
                                            </h4>
                                            <div className="space-y-2">
                                                {messageInfo.deliveredTo && messageInfo.deliveredTo.length > 0 ? (
                                                    messageInfo.deliveredTo.map((uid, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition">
                                                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
                                                                {uid}
                                                            </div>
                                                            <span className="text-gray-200 text-sm">User {uid}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-gray-500 text-sm italic pl-2">No one yet</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {(incomingCall || activeCall || incomingGroupCall) && (
                        <CallInterface
                            call={activeCall || incomingCall || incomingGroupCall}
                            isIncoming={!!incomingCall || !!incomingGroupCall}
                            onAccept={incomingGroupCall ? handleJoinGroupCall : handleAcceptCall}
                            onReject={incomingGroupCall ? handleRejectGroupCall : handleRejectCall}
                            onEnd={handleEndCall}
                            switchRequest={switchRequest}
                            onRequestVideo={handleRequestVideoSwitch}
                            onRespondVideo={handleRespondToSwitch}
                        />
                    )}

                    {activeGroupSession && (
                        (() => {
                            const sessionConv = conversations.find(c => String(c.id) === String(activeGroupSession.conversationId));
                            if (!sessionConv) return null;
                            return (
                                <GroupCall
                                    conversationId={activeGroupSession.conversationId}
                                    currentUser={user}
                                    socket={socket}
                                    onClose={handleEndGroupCall}
                                    isVideo={activeGroupSession.type === 'video'}
                                    participants={sessionConv.Users || []}
                                    initiatorId={activeCallConversations.get(String(activeGroupSession.conversationId))}
                                />
                            );
                        })()
                    )}
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center bg-[#111b21] flex-col gap-4 text-center px-4">
                    <span className="text-6xl animate-pulse">💬</span>
                    <h2 className="text-2xl font-bold text-gray-200">Welcome to LinkUp</h2>
                    <p className="text-gray-400">Select a chat to start messaging.</p>
                </div>
            )}
        </div>
    );
};

export default Chat;

