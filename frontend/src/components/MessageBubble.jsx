import { useState, useRef, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import axios from 'axios';

const MessageBubble = ({ message, isOwn, isGroup, onEdit, onDelete, onImageClick, onForward, onReply, onReplyClick, id }) => {

    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    // AI States
    const [translation, setTranslation] = useState(null);
    const [transcription, setTranscription] = useState(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null); // { x, y }
    const menuRef = useRef(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setContextMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleForwardConfig = () => {
        // Find the 'forward' handler passed from parent or emit event
        // Ideally, ChatWindow should pass an 'onForward' prop
        // But here we can just signal up
        // check props
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        if (message.deletedForEveryone) return;

        let x = e.clientX;
        let y = e.clientY;
        const menuWidth = 220;
        const menuHeight = 250;

        // Check if triggered by the "More Options" button click
        const triggerButton = e.target.closest('button');

        if (triggerButton) {
            const rect = triggerButton.getBoundingClientRect();
            // WhatsApp Web Style:
            if (isOwn) {
                x = rect.right - menuWidth;
            } else {
                x = rect.left;
            }
            y = rect.bottom + 5;
        } else {
            // Mouse Context Menu (Right Click)
            // Smart positioning: Flip alignment if near edges
            if (x > window.innerWidth / 2) x = x - menuWidth;
            if (y > window.innerHeight / 2) y = y - menuHeight;

            // Offset slightly
            y += 5;
        }

        // Global Boundary Checks
        x = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10));
        y = Math.max(10, Math.min(y, window.innerHeight - menuHeight - 10));

        setContextMenu({ x, y });
    };

    const handleSaveEdit = () => {
        onEdit(message.id, editContent);
        setIsEditing(false);
        setContextMenu(null);
    };

    const handleDelete = (deleteForEveryone) => {
        onDelete(message.id, deleteForEveryone);
        setContextMenu(null);
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = message.attachmentUrl;
        link.download = `file-${Date.now()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setContextMenu(null);
    };

    const handleCopy = () => {
        if (message.content) {
            navigator.clipboard.writeText(message.content);
            setContextMenu(null);
        }
    };

    const handleReply = () => {
        if (onReply) onReply(message);
        setContextMenu(null);
    };

    const handleTranslate = async () => {
        if (translation) {
            setShowTranslation(!showTranslation);
            setContextMenu(null);
            return;
        }

        setIsTranslating(true);
        setContextMenu(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/translate`,
                { text: message.content, targetLang: 'English' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setTranslation(res.data.translated);
            setShowTranslation(true);
        } catch (error) {
            console.error("Translation Failed", error);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleTranscribe = async () => {
        if (transcription) return;

        setIsTranscribing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/transcribe`,
                { audioUrl: message.attachmentUrl },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setTranscription(res.data.transcription);
        } catch (error) {
            console.error("Transcription Failed", error);
        } finally {
            setIsTranscribing(false);
        }
    };

    // Unified Message Parsing (Call Logs vs System vs Text)
    let isCallLog = false;
    let callLogData = null;
    let systemContent = message.content;

    try {
        if (message.content && (message.content.startsWith('{') || message.messageType === 'system')) {
            const parsed = JSON.parse(message.content);
            if (parsed.type === 'call_log') {
                isCallLog = true;
                callLogData = parsed;
            } else if (parsed.content) {
                systemContent = parsed.content;
            }
        }
    } catch (e) {
        // Not JSON, treat as plain text
    }

    // PURE System Message (Not Call Log) -> Render as Pill
    if (message.messageType === 'system' && !isCallLog) {
        return (
            <div className="flex justify-center my-3 animate-in fade-in zoom-in-95 duration-300">
                <span className="bg-white/5 backdrop-blur-md text-gray-400 text-[10px] uppercase tracking-wider font-bold px-4 py-1.5 rounded-full border border-white/5 shadow-sm">
                    {systemContent}
                </span>
            </div>
        );
    }

    // Call Logs & Regular Messages -> Render as Bubbles (Fallthrough)

    return (
        <div
            id={id}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group relative`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            onContextMenu={(e) => {
                e.preventDefault();
                handleContextMenu(e);
            }}
        >
            {/* Premium "More Options" Chevron - Internal & Subtle - MOVED INSIDE BUBBLE */}

            {/* Custom Context Menu */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
                    <div
                        ref={menuRef}
                        className="fixed bg-[#233138] border border-[#374248] rounded-lg shadow-2xl z-50 py-2 flex flex-col min-w-[200px] animate-in fade-in zoom-in-95 origin-top overflow-hidden"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        {/* Reply Option */}
                        {!message.deletedForEveryone && !isCallLog && (
                            <button onClick={handleReply} className="px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3 transition-colors font-medium">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                                Reply
                            </button>
                        )}

                        {/* Copy Option (Text Only) */}
                        {(message.messageType === 'text' || message.content) && !isCallLog && (
                            <button onClick={handleCopy} className="px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3 transition-colors font-medium">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                Copy Text
                            </button>
                        )}

                        {/* Edit Option (Own Text Only) */}
                        {isOwn && !message.deletedForEveryone && message.messageType === 'text' && (
                            <button onClick={() => { setIsEditing(true); setContextMenu(null); }} className="px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3 transition-colors font-medium">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-blue-400"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                Edit Message
                            </button>

                        )}

                        {/* Forward Option */}
                        <button onClick={() => { onForward && onForward(message); setContextMenu(null); }} className="px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3 transition-colors font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 rotate-45"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            Forward
                        </button>

                        {/* Translate Option (Text Only) */}
                        {message.messageType === 'text' && !message.deletedForEveryone && (
                            <button onClick={handleTranslate} className="px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3 transition-colors font-medium border-t border-white/5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="m5 8 5-5 5 5"></path><path d="M12 18v-5"></path><path d="m5 16 6-6 6 6"></path><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"></path><path d="M2 12h20"></path></svg>
                                {showTranslation ? 'Hide Translation' : 'Translate'}
                            </button>
                        )}

                        {/* Download Option */}
                        {message.attachmentUrl && message.messageType !== 'text' && ['image', 'video', 'audio', 'file'].includes(message.messageType) && (
                            <button onClick={async () => {
                                try {
                                    const response = await fetch(message.attachmentUrl);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    a.download = message.name || `download-${Date.now()}`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    setContextMenu(null);
                                } catch (e) {
                                    console.error('Download failed', e);
                                    alert('Download failed');
                                }
                            }} className="px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10 flex items-center gap-3 transition-colors font-medium">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download
                            </button>
                        )}

                        {/* Divider if we have delete options */}
                        {!message.deletedForEveryone && <div className="h-px bg-white/5 my-1" />}

                        {/* Delete Options */}
                        {!message.deletedForEveryone && (
                            <>
                                {isOwn && (
                                    <button onClick={() => handleDelete(true)} className="px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors font-medium">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                        Delete for Everyone
                                    </button>
                                )}
                                <button onClick={() => handleDelete(false)} className="px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-white/10 flex items-center gap-3 transition-colors font-medium">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                    Delete for Me
                                </button>
                            </>
                        )}
                    </div>
                </>
            )
            }

            {
                !isOwn && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 mr-2 overflow-hidden flex-shrink-0 mt-auto mb-1 ring-2 ring-[#1c1c1f]">
                        {message.User?.avatar ? (
                            <img src={message.User.avatar} alt={message.User.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                                {message.User?.name ? message.User.name[0].toUpperCase() : '?'}
                            </div>
                        )}
                    </div>
                )
            }

            {/* Bubble Container */}
            <div
                className={`max-w-[75%] md:max-w-[60%] min-w-[120px] shadow-sm relative group/bubble transition-all duration-200 flex flex-col 
                    ${isOwn
                        ? 'bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white rounded-[1.25rem] rounded-tr-sm shadow-indigo-500/20 shadow-lg'
                        : 'bg-[#18181b]/90 backdrop-blur-md border border-white/5 text-gray-100 rounded-[1.25rem] rounded-tl-sm shadow-md'
                    } ${message.deletedForEveryone ? 'italic text-gray-400 border border-gray-600/30 bg-white/5 shadow-none px-4 py-2' : ''}`}
            >
                {/* Premium "More Options" Chevron - Internal & Subtle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e);
                    }}
                    className={`absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white/80 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 z-50 shadow-sm border border-white/5`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </button>

                {!isOwn && isGroup && message.User?.name && !message.deletedForEveryone && message.User.name !== 'LinkUp AI' && (
                    <span className={`text-[11px] font-bold mb-1 px-4 pt-2 ${['text-pink-500', 'text-purple-500', 'text-indigo-500', 'text-blue-500', 'text-green-500', 'text-teal-500'][message.User.name.length % 6]
                        }`}>
                        {message.User.name}
                    </span>
                )}

                {/* Replied Message Preview */}
                {message.ReplyTo && !message.deletedForEveryone && (
                    <div
                        className="mx-1 mt-1 mb-1 rounded-lg bg-black/20 border-l-[3px] border-purple-500 overflow-hidden text-left cursor-pointer transition-all hover:bg-black/40 hover:scale-[1.02] active:scale-95"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onReplyClick) onReplyClick(message.ReplyTo.id);
                        }}
                    >
                        <div className="p-2 px-3">
                            <div className="text-xs font-bold text-purple-400 mb-0.5">
                                {message.ReplyTo.User?.name || 'User'}
                            </div>
                            <div className="text-sm text-gray-300 truncate opacity-90">
                                {message.ReplyTo.messageType === 'image' ? '📷 Photo' :
                                    message.ReplyTo.messageType === 'video' ? '🎥 Video' :
                                        message.ReplyTo.deletedForEveryone ? 'This message was deleted' :
                                            message.ReplyTo.content}
                            </div>
                        </div>
                    </div>
                )}

                {/* Call Log Specific Layout */}
                {isCallLog && callLogData ? (
                    <div className="flex items-center gap-3 p-3 min-w-[160px]">
                        <div className={`p-2.5 rounded-full flex items-center justify-center
                            ${(callLogData.status === 'missed' || callLogData.status === 'declined')
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-white/10 text-white'
                            }`}>
                            {callLogData.isVideo ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 4.5z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-base leading-tight">
                                {callLogData.isVideo ? 'Video Call' : 'Voice Call'}
                            </span>
                            <span className="text-xs opacity-70 font-medium mt-0.5 flex items-center gap-1">
                                {(callLogData.status === 'missed' || callLogData.status === 'declined') ? (
                                    <span className="text-red-300">Missed</span>
                                ) : (
                                    <span>{callLogData.duration || 'Ended'}</span>
                                )}
                            </span>
                        </div>
                    </div>
                ) : (
                    /* Standard Message Content */
                    <div className={`${(message.messageType === 'image' || message.messageType === 'video') ? 'p-1' : 'px-4 py-2'}`}>
                        {!isOwn && isGroup && message.User?.name && !message.deletedForEveryone && (
                            <p className="text-xs text-blue-400 font-bold tracking-wide px-3 pt-2 pb-0.5 ml-1">{message.User.name}</p>
                        )}

                        {isEditing ? (
                            <div className="flex flex-col gap-2 p-3">
                                <input
                                    type="text"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="text-black p-2 rounded-lg text-sm focus:outline-none"
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsEditing(false)} className="text-xs text-gray-200 hover:text-white transition">Cancel</button>
                                    <button onClick={handleSaveEdit} className="text-xs text-white font-bold bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition">Save</button>
                                </div>
                            </div>
                        ) : message.deletedForEveryone ? (
                            <p className="italic text-sm">
                                {message.content}
                            </p>
                        ) : (
                            <>
                                {/* Media Section (Full Bleed) */}
                                {message.attachmentUrl && (
                                    <div className={`overflow-hidden ${message.content ? 'rounded-t-[1.1rem] mb-0.5' : 'rounded-[1.1rem]'}`}>
                                        {message.messageType === 'image' && (
                                            <img
                                                src={message.attachmentUrl}
                                                alt="attachment"
                                                className="w-full h-auto max-h-[350px] object-cover cursor-pointer hover:opacity-95 transition bg-gray-900"
                                                onClick={() => onImageClick && onImageClick(message.attachmentUrl)}
                                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x200?text=Image+Error'; }}
                                            />
                                        )}
                                        {message.messageType === 'video' && (
                                            <div className="w-full aspect-video bg-black relative group/video">
                                                <VideoPlayer
                                                    src={message.attachmentUrl}
                                                    className="w-full h-full"
                                                    isPreview={true}
                                                />
                                            </div>
                                        )}
                                        {message.messageType === 'audio' && (
                                            <div className="p-2 flex flex-col gap-2">
                                                <audio src={message.attachmentUrl} controls className="w-full h-10 rounded-lg custom-audio" />

                                                {/* Transcription UI */}
                                                {/* Transcription UI */}
                                                {!transcription && !isTranscribing && (
                                                    <button
                                                        onClick={handleTranscribe}
                                                        className="mt-2 text-[11px] font-bold text-gray-300 bg-[#374151] hover:bg-[#4b5563] px-3 py-1.5 rounded-full flex items-center gap-2 transition shadow-sm border border-white/5"
                                                    >
                                                        <div className="p-0.5 bg-green-500/20 rounded-full text-green-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                                        </div>
                                                        Transcribe Audio
                                                    </button>
                                                )}

                                                {isTranscribing && (
                                                    <div className="mt-2 bg-[#374151] rounded-lg p-2.5 flex items-center gap-3 animate-pulse border border-green-500/20 w-fit">
                                                        <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                                        <span className="text-xs text-green-400 font-medium tracking-wide">Transcribing...</span>
                                                    </div>
                                                )}

                                                {transcription && (
                                                    <div className="mt-3 relative max-w-[280px]">
                                                        <div className="absolute -top-1.5 left-4 w-3 h-3 bg-[#1f2937] rotate-45 border-t border-l border-green-500/30"></div>
                                                        <div className="bg-[#1f2937] rounded-lg p-3 shadow-lg border border-green-500/30 relative z-10">
                                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                                                <div className="p-1 bg-green-500/10 rounded text-green-400">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                                                </div>
                                                                <span className="text-[10px] uppercase font-bold text-green-400 tracking-wider">Transcription</span>
                                                            </div>
                                                            <p className="text-gray-200 text-[13px] leading-relaxed italic">
                                                                "{transcription}"
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {message.messageType === 'file' && (
                                            <div className="p-2">
                                                <a
                                                    href={message.attachmentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex items-center gap-3 p-3 rounded-xl transition group ${isOwn ? 'bg-white/10 hover:bg-white/20' : 'bg-[#3f3f46] hover:bg-[#52525b]'}`}
                                                >
                                                    <div className="p-2.5 bg-white/10 rounded-lg text-white group-hover:bg-white/20 transition">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold truncate text-white leading-tight">
                                                            {message.content.replace('File: ', '') || 'Document'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-300 opacity-80 mt-0.5 font-medium uppercase tracking-wide">
                                                            {message.attachmentUrl.split('.').pop().toUpperCase()} FILE
                                                        </p>
                                                    </div>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Text Content (Caption or Message) */}
                                {/* 
                            Logic: 
                            1. If it's pure text, render it.
                            2. If it's a file, we displayed name above, but if there's EXTRA text, show it.
                            3. If it's image/video, display content as caption.
                            4. If system/call_log, handle that.
                         */}
                                {((message.content && message.messageType !== 'file') || (message.content && message.messageType === 'file' && message.content !== 'File: ' + message.name)) && (
                                    <div className={`px-4 py-2 ${message.attachmentUrl ? 'pt-1' : ''} relative z-10 break-words text-[15px] leading-relaxed`}>
                                        {(message.messageType === 'text' || message.messageType === 'system' || message.messageType === 'image' || message.messageType === 'video' || message.messageType === 'audio') && (<>
                                            {(() => {
                                                let parsed = null;
                                                // JSON System checks (Call logs)
                                                if (message.messageType === 'system' || (message.content.startsWith('{') && message.content.includes('call_log'))) {
                                                    try { parsed = JSON.parse(message.content); } catch (e) { }
                                                }

                                                if (parsed && parsed.type === 'call_log') {
                                                    const isMissed = parsed.status === 'missed' || parsed.status === 'declined';
                                                    const isIncoming = !isOwn;
                                                    const isVideo = parsed.isVideo;
                                                    return (
                                                        <div className="flex items-center gap-3 min-w-[180px] py-1">
                                                            <div className={`p-2 rounded-full ${isMissed ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                                                {isVideo ? (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                                                ) : (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm">{isVideo ? 'Video Call' : 'Voice Call'}</p>
                                                                <p className="text-xs opacity-70">{parsed.duration || (isMissed ? 'Missed' : 'Ended')}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Normal Text
                                                if (message.messageType === 'system') return null;

                                                // Skip rendering name if it's already shown in header (for AI mainly)
                                                // or strictly prevent "LinkUp AI" inside bubble content if backend sends it.
                                                // Actually the user said "LinkUp AI is twice name there at senders name".
                                                // So it's likely the header name + content name.
                                                // The header name logic is above (line 228).

                                                return (
                                                    <span className="whitespace-pre-wrap">
                                                        {message.content.split(' ').map((word, index) => {
                                                            if (word.startsWith('@')) {
                                                                return <span key={index} className="bg-blue-500/20 text-blue-300 px-1 rounded font-medium">{word} </span>;
                                                            }
                                                            if (word.match(/^https?:\/\//)) {
                                                                return <a key={index} href={word} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline decoration-blue-300/50 break-all">{word} </a>;
                                                            }
                                                            return word + ' ';
                                                        })}
                                                    </span>
                                                );
                                            })()}

                                            {/* Translation UI */}
                                            {showTranslation && (
                                                <div className="mt-3 relative">
                                                    <div className="absolute -top-3 left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[#1f2937]"></div>
                                                    <div className="bg-[#1f2937] rounded-lg p-3 shadow-lg border border-yellow-500/20">
                                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                                            <div className="p-1 bg-yellow-500/10 rounded text-yellow-400">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 5-5 5 5"></path><path d="M12 18v-5"></path><path d="m5 16 6-6 6 6"></path><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"></path><path d="M2 12h20"></path></svg>
                                                            </div>
                                                            <span className="text-[10px] uppercase font-bold text-yellow-500/90 tracking-wider">English Translation</span>
                                                        </div>

                                                        {isTranslating ? (
                                                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                                <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                                                Translating...
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-100 text-[14px] leading-relaxed animate-in fade-in slide-in-from-top-1">
                                                                {translation}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>)}
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                )}

                {/* Footer / Time / Status */}
                {!isCallLog && (
                    <div className={`flex items-center justify-end px-3 pb-2 gap-1 ${message.attachmentUrl && !message.content ? 'absolute bottom-1 right-1 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm' : 'mt-0.5'}`}>
                        <span className={`text-[10px] uppercase font-medium tracking-wide ${message.attachmentUrl && !message.content ? 'text-white' : (isOwn ? 'text-blue-100/70' : 'text-gray-500')}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwn && !message.deletedForEveryone && (
                            <span className="flex items-center">
                                {message.seenBy && message.seenBy.length > 0 ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${message.attachmentUrl && !message.content ? 'text-blue-400' : 'text-sky-300'}`}>
                                        <path d="M18 6L7 17l-5-5" />
                                        <path d="M22 10l-7.5 7.5L13 16" />
                                    </svg>
                                ) : message.deliveredTo && message.deliveredTo.length > 0 ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${message.attachmentUrl && !message.content ? 'text-gray-300' : 'text-blue-200/60'}`}>
                                        <path d="M18 6L7 17l-5-5" />
                                        <path d="M22 10l-7.5 7.5L13 16" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${message.attachmentUrl && !message.content ? 'text-gray-300' : 'text-blue-200/60'}`}>
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                )}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
};

export default MessageBubble;
