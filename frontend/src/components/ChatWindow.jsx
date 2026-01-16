import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import GroupInfoModal from './GroupInfoModal';
import EmojiPicker from 'emoji-picker-react';
import ImageLightbox from './ImageLightbox';
import CameraModal from './CameraModal';


const ChatWindow = ({
    conversation,
    messages,
    onSendMessage,
    currentUser,
    typingUser,
    socket,
    onEditMessage,
    onDeleteMessage,
    onStartCall,
    onStartGroupCall,
    activeCallConversations,
    onJoinGroupCall,
    onTyping,
    onStopTyping,
    onlineUsers,
    onAcceptRequest,
    onRejectRequest,
    onBlockUser,
    onClearChat,
    onBack,
    onDismissCallBanner
}) => {
    // Top-Lvl States
    const [newMessage, setNewMessage] = useState('');
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [showMenu, setShowMenu] = useState(false); // Dropdown menu state
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const mediaInputRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);


    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // File Upload / Attachment States
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState({});
    const [lightboxImage, setLightboxImage] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);

    // [NEW] Smart Reply State
    const [smartReplies, setSmartReplies] = useState([]);
    const [isLoadingReplies, setIsLoadingReplies] = useState(false);

    const typingTimeoutRef = useRef(null);

    // Typing Handlers
    const handleInputChange = (e) => {
        setNewMessage(e.target.value);

        if (onTyping) {
            onTyping();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (onStopTyping) onStopTyping();
            }, 2000);
        }
    };

    const handleBlur = () => {
        if (onStopTyping) {
            onStopTyping();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    // Status Logic
    const getStatusText = () => {
        if (!conversation) return null;
        if (conversation.isGroup) {
            return <p className="text-xs text-gray-400">Click for info</p>;
        }
        if (typingUser) return <span className="text-green-400 font-bold animate-pulse">Typing...</span>;

        if (conversation.email === 'ai@linkup.bot' || conversation.name === 'LinkUp AI') {
            return <span className="text-green-400 font-bold">Online</span>;
        }

        if (conversation.otherUserId && onlineUsers?.has(String(conversation.otherUserId))) {
            return <span className="text-blue-400 font-medium">Online</span>;
        }

        if (conversation.lastSeen) {
            const date = new Date(conversation.lastSeen);
            const today = new Date();
            const isToday = date.toDateString() === today.toDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return <span className="text-gray-400 text-xs">Last seen {isToday ? 'today' : date.toLocaleDateString()} at {timeStr}</span>;
        }

        return <span className="text-gray-500 text-xs">Offline</span>;
    };

    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            setRecordingDuration(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

                // Directly upload and send
                handleVoiceUpload(audioFile);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please allow permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            const recorder = mediaRecorderRef.current;

            // Critical: Remove the onstop handler BEFORE stopping to prevent upload
            recorder.onstop = null;

            // Stop the recorder manually
            if (recorder.state !== 'inactive') {
                recorder.stop();
            }

            // Stop all microphone tracks
            if (recorder.stream) {
                recorder.stream.getTracks().forEach(track => track.stop());
            }

            // Reset state
            setIsRecording(false);
            setRecordingDuration(0);
            mediaRecorderRef.current = null;
            audioChunksRef.current = [];
        }
    };

    const handleVoiceUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        // Optimistic UI for uploading? Only if needed.
        // For now, simple alerts on error.

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                }
            });

            const { url } = res.data;
            onSendMessage("Voice Message", 'audio', url);
        } catch (error) {
            console.error("Error uploading voice note:", error);
            alert("Failed to send voice note.");
        }
    };



    const prevMessagesLengthRef = useRef(messages.length);

    useEffect(() => {
        // Scroll to bottom whenever messages change significantly or conversation changes
        const scrollToBottom = () => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        };

        if (messagesEndRef.current) {
            scrollToBottom();
            // Retry after small delay to account for image layout shifts
            setTimeout(scrollToBottom, 50);
            setTimeout(scrollToBottom, 150);
        }
    }, [messages.length, conversation?.id]);

    useEffect(() => {
        // Smooth scroll for new single messages
        if (messages.length > prevMessagesLengthRef.current) {
            const lastMsg = messages[messages.length - 1];
            const prevLastMsg = messages[prevMessagesLengthRef.current - 1];

            if (lastMsg && prevLastMsg && lastMsg.id !== prevLastMsg.id) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }

            // [NEW] Auto-generate Smart Replies for incoming messages
            // Check if message is from OTHER user (not me)
            if (lastMsg && String(lastMsg.senderId) !== String(currentUser.id)) {
                handleSmartReply();
            }
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages]);

    const filteredMessages = messages.filter(msg =>
        msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        addFilesToQueue(files);
        setIsAttachmentMenuOpen(false);
        e.target.value = ''; // Reset input
    };

    const addFilesToQueue = (files) => {
        const newFiles = files.map(file => ({
            file,
            id: Date.now() + Math.random(),
            previewUrl: URL.createObjectURL(file),
            type: file.type.startsWith('image/') ? 'image' :
                file.type.startsWith('video/') ? 'video' :
                    file.type.startsWith('audio/') ? 'audio' : 'file',
            name: file.name
        }));
        setSelectedFiles(prev => [...prev, ...newFiles]);
    };

    const handleCameraCapture = (file) => {
        addFilesToQueue([file]);
        setShowCamera(false);
        setIsAttachmentMenuOpen(false);
    };

    const removeFile = (id) => {
        setSelectedFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
            return prev.filter(f => f.id !== id);
        });
    };

    // [NEW] Smart Reply Handler
    const handleSmartReply = async () => {
        if (!conversation) return;
        setIsLoadingReplies(true);
        setSmartReplies([]); // Reset
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/messages/smart-replies', {
                conversationId: conversation.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.replies) {
                setSmartReplies(res.data.replies);
            }
        } catch (error) {
            console.error("Smart Reply Error:", error);
            // Silent fail or small toast
        } finally {
            setIsLoadingReplies(false);
        }
    };

    // [NEW] AI Feature States
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summaryResult, setSummaryResult] = useState(null); // { text }
    const [showRewriteMenu, setShowRewriteMenu] = useState(false);
    const [isRewriting, setIsRewriting] = useState(false);

    // AI Handlers
    const requestSummary = async () => {
        if (!conversation) return;
        setIsSummarizing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/messages/summarize', {
                conversationId: conversation.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummaryResult(res.data.summary); // stored as markdown text
        } catch (error) {
            console.error("Summary failed:", error);
            alert("Failed to summarize chat.");
        } finally {
            setIsSummarizing(false);
            setShowMenu(false); // Close menu
        }
    };

    const requestRewrite = async (tone) => {
        if (!newMessage.trim()) return;
        setIsRewriting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/messages/rewrite', {
                text: newMessage,
                tone
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewMessage(res.data.rewritten);
        } catch (error) {
            console.error("Rewrite failed:", error);
        } finally {
            setIsRewriting(false);
            setShowRewriteMenu(false);
        }
    };

    const handleReplyClick = async (reply) => {
        // [Fixed] Send immediately on click ("One Tap")
        if (!reply) return;

        try {
            await onSendMessage(reply, 'text', null, false);
            setSmartReplies([]); // Clear suggestions
            setNewMessage(''); // Clear input just in case
        } catch (err) {
            console.error("Failed to send smart reply", err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();

        // 1. Upload and Send Files FIRST
        if (selectedFiles.length > 0) {
            for (const fileObj of selectedFiles) {
                const formData = new FormData();
                formData.append('file', fileObj.file);

                setUploadingFiles(prev => ({ ...prev, [fileObj.id]: 0 }));

                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.post('/api/upload', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            Authorization: `Bearer ${token}`,
                        },
                        onUploadProgress: (progressEvent) => {
                            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            setUploadingFiles(prev => ({ ...prev, [fileObj.id]: percentCompleted }));
                        }
                    });

                    // Upload Success
                    const { url, mimetype } = res.data;
                    let messageType = 'file';

                    const lowerName = fileObj.name.toLowerCase();
                    if (mimetype.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(lowerName)) {
                        messageType = 'image';
                    } else if (mimetype.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/.test(lowerName)) {
                        messageType = 'video';
                    } else if (mimetype.startsWith('audio/') || /\.(mp3|wav)$/.test(lowerName)) {
                        messageType = 'audio';
                    }

                    // Send the message for this file
                    await onSendMessage(`${messageType === 'file' ? 'File:' : ''} ${fileObj.name}`, messageType, url);

                    // Remove from queue visually (or mark done)
                    setUploadingFiles(prev => {
                        const next = { ...prev };
                        delete next[fileObj.id];
                        return next;
                    });

                } catch (error) {
                    console.error('Error uploading file:', error);
                    alert(`Failed to upload ${fileObj.name}: ${error.response?.data?.message || error.message}`);
                    setUploadingFiles(prev => {
                        const next = { ...prev };
                        delete next[fileObj.id];
                        return next;
                    });
                }
            }
            // Clear all after attempts
            setSelectedFiles([]);
        }

        // 2. Send Text Message (Caption) SECOND
        // This ensures the AI sees the image (sent above) as "context" for this text prompt
        if (newMessage.trim()) {
            await onSendMessage(newMessage); // Use await to ensure order if socket is fast
            setNewMessage('');
        }
    };

    const onEmojiClick = (emojiObject) => {
        setNewMessage(prev => prev + emojiObject.emoji);
    };



    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
                Select a conversation to start chatting
            </div>
        );
    }

    const isUploading = Object.keys(uploadingFiles).length > 0;

    return (
        <div className="h-full flex flex-col bg-transparent relative overflow-hidden">
            {/* [NEW] Summary Modal */}
            {summaryResult && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-2xl">📝</span> Chat Summary
                        </h3>
                        <div className="space-y-3 text-gray-300 text-sm leading-relaxed mb-6">
                            {summaryResult.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                        <button
                            onClick={() => setSummaryResult(null)}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center justify-between z-20 shadow-sm shrink-0 sticky top-0">
                <div className="flex items-center gap-4">
                    {/* Back Button (Mobile Only) */}
                    <button
                        onClick={onBack}
                        className="md:hidden text-gray-400 hover:text-white p-2 -ml-2 transition-colors rounded-full hover:bg-white/5"
                        title="Back to Chats"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>

                    <div
                        className="flex items-center cursor-pointer hover:bg-white/5 p-2 -ml-2 rounded-xl transition-all duration-200"
                        onClick={() => conversation.isGroup && setShowGroupInfo(true)}
                    >
                        <div className="w-11 h-11 rounded-full mr-4 overflow-hidden border border-[#3f3f46] shadow-md relative ring-2 ring-black/20">
                            {conversation.avatar ? (
                                <img src={conversation.avatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#27272a] to-[#18181b] flex items-center justify-center text-white font-bold text-lg">
                                    {conversation.name ? conversation.name[0].toUpperCase() : (conversation.groupName ? conversation.groupName[0].toUpperCase() : '?')}
                                </div>
                            )}
                            {/* Online Indicator Dot */}
                            {!conversation.isGroup && conversation.otherUserId && onlineUsers?.has(String(conversation.otherUserId)) && (
                                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0B0B0F]"></div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-gray-100 font-bold text-lg leading-tight tracking-tight">{conversation.name || conversation.groupName}</h2>
                            <div className="text-sm font-medium">
                                {getStatusText()}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Call Buttons */}
                    {/* Call Buttons */}
                    {conversation.isGroup ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onStartGroupCall('audio')}
                                className="p-2 rounded-full hover:bg-gray-700/80 transition-all text-gray-300 hover:text-green-400"
                                title="Group Voice Call"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 4.5z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onStartGroupCall('video')}
                                className="p-2 rounded-full hover:bg-gray-700/80 transition-all text-gray-300 hover:text-blue-400"
                                title="Group Video Call"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                                </svg>
                            </button>
                        </div>
                    ) : (typeof onStartCall === 'function' && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onStartCall(false)}
                                className="p-2 rounded-full hover:bg-gray-700/80 transition-all text-gray-300 hover:text-green-400"
                                title="Voice Call"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 4.5z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onStartCall(true)}
                                className="p-2 rounded-full hover:bg-gray-700/80 transition-all text-gray-300 hover:text-blue-400"
                                title="Video Call"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    {/* More Options Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className={`p-2.5 rounded-full hover:bg-white/10 transition-all ${showMenu ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="More Options"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm0 6a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-14 w-60 bg-[#18181b]/95 border border-[#27272a] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col py-1.5 backdrop-blur-2xl animate-in fade-in zoom-in-95 origin-top-right">
                                {/* Search */}
                                <button
                                    onClick={() => { setShowSearch(!showSearch); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-700 flex items-center gap-3 text-gray-300 hover:text-white transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    Search Messages
                                </button>

                                <div className="h-px bg-gray-700 my-1" />

                                {/* Clear Chat */}
                                <button
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to clear this chat? This cannot be undone.")) onClearChat();
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-700 flex items-center gap-3 text-red-400 hover:text-red-300 transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    Clear Chat
                                </button>

                                {/* Block User */}
                                {!conversation.isGroup && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Are you sure you want to block this user?")) onBlockUser(conversation.otherUserId);
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-700 flex items-center gap-3 text-red-400 hover:text-red-300 transition"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                        Block User
                                    </button>
                                )}

                                <div className="h-px bg-gray-700 my-1" />

                                {/* [NEW] Summarize Chat */}
                                <button
                                    onClick={requestSummary}
                                    disabled={isSummarizing}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-700 flex items-center gap-3 text-purple-400 hover:text-purple-300 transition disabled:opacity-50"
                                >
                                    {isSummarizing ? (
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
                                    )}
                                    Summarize Chat
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            {
                showSearch && (
                    <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
                        <div className="relative flex-1">
                            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setShowSearch(false);
                            }}
                            className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-all transform hover:rotate-90 duration-200"
                            title="Close Search"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                )
            }

            {/* Active Call Banner */}
            {
                activeCallConversations.get(String(conversation.id)) && (
                    <div
                        className="bg-green-500/10 backdrop-blur-md px-6 py-3 flex items-center justify-between shadow-lg z-30 sticky top-2 mx-4 rounded-2xl border border-green-500/20 animate-in slide-in-from-top-2"
                    >
                        <div
                            className="flex items-center gap-3 cursor-pointer flex-1"
                            onClick={() => onJoinGroupCall(String(conversation.id))}
                        >
                            <div className="bg-white/20 p-2 rounded-full animate-pulse ring-2 ring-white/10">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 4.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">Active group call</p>
                                <p className="text-green-100 text-xs font-medium">Click to join</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onJoinGroupCall(String(conversation.id))}
                                className="bg-white text-green-700 px-5 py-1.5 rounded-full text-sm font-bold shadow-sm hover:scale-105 active:scale-95 transition-all hover:bg-gray-100"
                            >
                                Join
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDismissCallBanner) onDismissCallBanner(conversation.id);
                                }}
                                className="p-1.5 rounded-full bg-black/20 text-white hover:bg-black/30 transition-all border border-transparent hover:border-white/10"
                                title="Dismiss Banner"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Messages */}
            <div
                className="flex-1 overflow-y-auto p-4 min-h-0"
                onScroll={(e) => { if (e.target.scrollTop === 0) { /* onLoadMore() */ } }}
            >
                {filteredMessages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        isOwn={msg.senderId == currentUser.id}
                        isGroup={conversation.isGroup}
                        onEdit={onEditMessage}
                        onDelete={onDeleteMessage}
                        onImageClick={setLightboxImage} // [NEW] Pass click handler
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Staging Area / Multi-File Preview */}
            {/* Staging Area / Multi-File Preview */}
            {
                selectedFiles.length > 0 && (
                    <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
                        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-600">
                            {selectedFiles.map(file => (
                                <div key={file.id} className="relative flex-shrink-0 w-24 h-24 bg-gray-700 rounded-xl overflow-hidden group border border-gray-600 shadow-md">
                                    {file.type === 'image' ? (
                                        <img src={file.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                    ) : file.type === 'video' ? (
                                        <div className="relative w-full h-full bg-black">
                                            <video
                                                src={file.previewUrl}
                                                className="w-full h-full object-cover pointer-events-none"
                                                muted
                                                autoPlay
                                                playsInline
                                                onTimeUpdate={(e) => {
                                                    if (e.target.currentTime > 5) {
                                                        e.target.currentTime = 0;
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="bg-black/50 rounded-full p-1.5 backdrop-blur-sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-700/50">
                                            <div className="text-3xl mb-1">📄</div>
                                            <div className="text-[10px] px-1 truncate w-full text-center text-gray-300 font-medium">{file.name}</div>
                                        </div>
                                    )}

                                    {/* Overlay / Remove */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => removeFile(file.id)}
                                            className="text-white bg-red-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 shadow-lg transform hover:scale-110 transition"
                                            title="Remove"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Progress Bar */}
                                    {uploadingFiles[file.id] !== undefined && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-200"
                                                style={{ width: `${uploadingFiles[file.id]}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Add More Button */}
                            <div
                                onClick={() => setIsAttachmentMenuOpen(true)}
                                className="flex-shrink-0 w-24 h-24 bg-gray-800/50 rounded-xl flex items-center justify-center flex-col cursor-pointer hover:bg-gray-700 text-gray-400 hover:text-white border-2 border-dashed border-gray-600 hover:border-gray-500 transition group"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">+</span>
                                <span className="text-xs font-medium mt-1">Add</span>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Request Actions Overlay for Receiver */}
            {/* Request Actions Overlay for Receiver */}
            {
                conversation.requestStatus === 'pending' && String(conversation.createdBy) !== String(currentUser.id) ? (
                    <div className="p-4 bg-[#18181b]/90 backdrop-blur-xl border-t border-[#2a2a2e] flex flex-col items-center justify-center gap-3 z-30 m-4 rounded-3xl shadow-2xl">
                        <p className="text-gray-200 font-medium text-lg">Message Request</p>
                        <p className="text-sm text-gray-400 text-center max-w-md leading-relaxed">
                            <span className="font-bold text-white">{conversation.name}</span> wants to send you a message.
                            Do not share your password or personal information.
                        </p>
                        <div className="flex gap-4 mt-2">
                            <button
                                onClick={() => onBlockUser(conversation.otherUserId)}
                                className="px-6 py-2.5 bg-[#2a2a2e] hover:bg-[#3f3f46] text-red-400 rounded-xl font-bold transition shadow-sm"
                            >
                                Block
                            </button>
                            <button
                                onClick={() => onRejectRequest(conversation.id)}
                                className="px-6 py-2.5 bg-[#2a2a2e] hover:bg-[#3f3f46] text-white rounded-xl font-bold transition shadow-sm"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => onAcceptRequest(conversation.id)}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition hover:scale-105 active:scale-95"
                            >
                                Accept
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Normal Input Area or Sent Banner */
                    <>
                        {conversation.requestStatus === 'pending' && String(conversation.createdBy) === String(currentUser.id) && (
                            <div className="px-5 py-3 bg-blue-500/10 border border-blue-500/20 mx-4 mb-4 rounded-xl text-blue-200 text-sm text-center backdrop-blur-sm">
                                Message request sent. Following up before acceptance depends on their privacy settings.
                            </div>
                        )}

                        <div className="p-4 relative z-40 mb-2">
                            {/* [MODIFIED] Smart Replies - Floating Pills */}
                            {smartReplies.length > 0 && (
                                <div className="absolute bottom-full left-0 w-full px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar mask-gradient-x z-30">
                                    {smartReplies.map((reply, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleReplyClick(reply)}
                                            className="px-4 py-2 bg-[#27272a]/90 backdrop-blur-md hover:bg-blue-600 hover:text-white text-gray-200 text-xs font-bold rounded-full border border-[#3f3f46] shadow-lg transition-all transform hover:scale-105 whitespace-nowrap"
                                        >
                                            ✨ {reply}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setSmartReplies([])}
                                        className="p-2 bg-[#27272a]/90 backdrop-blur-md rounded-full border border-[#3f3f46] text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-colors shadow-lg"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {/* ... Input Form Content (Existing) ... */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-20 left-4 mb-2 z-50 bg-[#18181b]/95 backdrop-blur-2xl border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 origin-bottom-left">
                                    <div className="flex justify-between items-center p-3 bg-[#27272a]/50 border-b border-[#27272a]">
                                        <span className="text-gray-200 text-xs font-bold pl-2">Pick an Emoji</span>
                                        <button
                                            onClick={() => setShowEmojiPicker(false)}
                                            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" width={320} height={400} />
                                </div>
                            )}

                            {/* Attachment Menu Popover */}
                            {isAttachmentMenuOpen && (
                                <div className="absolute bottom-20 left-12 mb-2 z-50 bg-[#18181b]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-[#27272a] flex flex-col w-56 overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-left p-1.5">
                                    <button
                                        onClick={() => mediaInputRef.current.click()}
                                        className="p-3 text-left hover:bg-white/5 rounded-xl text-gray-200 hover:text-white flex items-center gap-3 transition-colors font-medium text-sm group"
                                    >
                                        <span className="text-blue-400 text-lg bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500/20 transition-colors">🖼️</span>
                                        <div className="flex flex-col">
                                            <span>Photos & Videos</span>
                                            <span className="text-[10px] text-gray-500">Share media files</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        className="p-3 text-left hover:bg-white/5 rounded-xl text-gray-200 hover:text-white flex items-center gap-3 transition-colors font-medium text-sm group"
                                    >
                                        <span className="text-purple-400 text-lg bg-purple-500/10 p-2 rounded-lg group-hover:bg-purple-500/20 transition-colors">📄</span>
                                        <div className="flex flex-col">
                                            <span>Document</span>
                                            <span className="text-[10px] text-gray-500">Send files & pdfs</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setShowCamera(true)}
                                        className="p-3 text-left hover:bg-white/5 rounded-xl text-gray-200 hover:text-white flex items-center gap-3 transition-colors font-medium text-sm group"
                                    >
                                        <span className="text-red-400 text-lg bg-red-500/10 p-2 rounded-lg group-hover:bg-red-500/20 transition-colors">📷</span>
                                        <div className="flex flex-col">
                                            <span>Camera</span>
                                            <span className="text-[10px] text-gray-500">Take a photo</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Close menu if clicking outside */}
                            {isAttachmentMenuOpen && (
                                <div className="fixed inset-0 z-10" onClick={() => setIsAttachmentMenuOpen(false)}></div>
                            )}

                            {isRecording ? (
                                <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 p-2 rounded-2xl text-white animate-pulse z-20 relative">
                                    <div className="text-red-500 w-3 h-3 rounded-full bg-red-500 animate-ping mx-2"></div>
                                    <div className="flex-1 font-mono text-red-100 font-bold tracking-wider">{formatTime(recordingDuration)}</div>
                                    <button onClick={cancelRecording} className="text-xs font-bold text-red-300 hover:text-white uppercase tracking-wider px-2">Cancel</button>
                                    <button onClick={stopRecording} className="p-2 bg-red-600 rounded-full hover:bg-red-500 shadow-lg shadow-red-500/30 transition-transform hover:scale-110">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSend} className="flex items-end gap-2 relative z-20">
                                    {/* Hidden Inputs */}
                                    <input
                                        type="file"
                                        ref={mediaInputRef}
                                        onChange={(e) => handleFileSelect(e, 'media')}
                                        accept="image/*,video/*,audio/*"
                                        multiple
                                        className="hidden"
                                    />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => handleFileSelect(e, 'doc')}
                                        accept=".pdf,.doc,.docx,.txt"
                                        multiple
                                        className="hidden"
                                    />

                                    {/* Attachment Button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAttachmentMenuOpen(!isAttachmentMenuOpen);
                                            setShowEmojiPicker(false);
                                        }}
                                        className={`text-gray-400 hover:text-blue-400 p-3 rounded-xl hover:bg-[#27272a] transition-all duration-200 mb-1 ${isAttachmentMenuOpen ? 'text-blue-400 bg-[#27272a]' : ''}`}
                                        title="Attach"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    </button>

                                    <div className="flex-1 bg-black/30 backdrop-blur-xl rounded-full border border-white/10 focus-within:border-white/20 focus-within:bg-black/50 transition-all flex items-end min-h-[50px] relative shadow-lg">
                                        {/* [NEW] Magic Wand (Rewrite) */}
                                        <div className="relative mb-1 ml-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowRewriteMenu(!showRewriteMenu)}
                                                className={`p-2 rounded-xl transition-all duration-200 ${showRewriteMenu ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400 hover:bg-white/5'}`}
                                                title="Rewrite Tone"
                                                disabled={isRewriting}
                                            >
                                                {isRewriting ? (
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                                                ) : (
                                                    <span className="text-lg filter drop-shadow-sm">🪄</span>
                                                )}
                                            </button>

                                            {showRewriteMenu && (
                                                <div className="absolute bottom-full left-0 mb-2 bg-[#18181b]/95 backdrop-blur-2xl border border-[#2a2a2e] rounded-2xl shadow-xl w-48 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 p-1">
                                                    <div className="px-3 py-2 border-b border-[#2a2a2e] text-[10px] uppercase tracking-widest font-bold text-gray-500">Rewrite Tone</div>
                                                    {[
                                                        { label: 'Professional', emoji: '💼' },
                                                        { label: 'Friendly', emoji: '😊' },
                                                        { label: 'Funny', emoji: '🤪' },
                                                        { label: 'Romantic', emoji: '🌹' }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.label}
                                                            type="button"
                                                            onClick={() => requestRewrite(opt.label)}
                                                            className="w-full text-left px-3 py-2.5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white text-sm flex items-center gap-3 transition-colors font-medium"
                                                        >
                                                            <span className="text-lg">{opt.emoji}</span> {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => {
                                                handleInputChange(e);
                                                if (smartReplies.length > 0) setSmartReplies([]);
                                            }}
                                            onBlur={handleBlur}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend(e);
                                                }
                                            }}
                                            placeholder={selectedFiles.length > 0 ? "Add a caption..." : "Type a message..."}
                                            className="flex-1 px-3 py-3 bg-transparent text-white focus:outline-none resize-none overflow-hidden placeholder-gray-500/80 font-medium leading-relaxed max-h-32 text-sm"
                                            rows={1}
                                            disabled={isUploading}
                                            style={{ minHeight: '52px' }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowEmojiPicker(!showEmojiPicker);
                                                setIsAttachmentMenuOpen(false);
                                            }}
                                            className={`text-gray-400 hover:text-yellow-400 p-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 mb-1 mr-1 ${showEmojiPicker ? 'text-yellow-400' : ''}`}
                                            title="Emoji"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm6.75 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {newMessage.trim() || selectedFiles.length > 0 ? (
                                        <button
                                            type="submit"
                                            className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-1"
                                            disabled={isUploading}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={startRecording}
                                            className="bg-[#2a2a2e] hover:bg-[#3f3f46] text-white p-3 rounded-xl shadow-lg transition-transform active:scale-95 mb-1"
                                            title="Record Voice Note"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                                                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                                            </svg>
                                        </button>
                                    )}
                                </form>
                            )}
                        </div>
                    </>
                )
            }


            {/* Modals */}
            {
                showGroupInfo && (
                    <GroupInfoModal
                        conversation={conversation}
                        onClose={() => setShowGroupInfo(false)}
                        currentUser={currentUser}
                    />
                )
            }

            {/* Image Lightbox */}
            {
                lightboxImage && (
                    <ImageLightbox
                        imageUrl={lightboxImage}
                        onClose={() => setLightboxImage(null)}
                    />
                )
            }

            {/* Camera Modal */}
            {
                showCamera && (
                    <CameraModal
                        onClose={() => setShowCamera(false)}
                        onCapture={handleCameraCapture}
                    />
                )
            }
            {/* Group Call */}
            {/* Group Call */}

        </div >
    );
};

export default ChatWindow;
