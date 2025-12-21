import { useState, useRef, useEffect } from 'react';

const MessageBubble = ({ message, isOwn, isGroup, onEdit, onDelete, onImageClick }) => {
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

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

    const handleContextMenu = (e) => {
        e.preventDefault();
        if (message.deletedForEveryone) return;
        setContextMenu({ x: e.clientX, y: e.clientY });
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

    if (message.messageType === 'system') {
        let systemContent = message.content;
        let isCallLog = false;

        try {
            const parsed = JSON.parse(message.content);
            if (parsed.type === 'call_log') {
                isCallLog = true;
            } else {
                systemContent = parsed.content || message.content;
            }
        } catch (e) {
            // Not JSON
        }

        // IF it is a call log, we DO NOT return early anymore.
        // We let it fall through to the main return block so it gets the Avatar/Bubble structure.
        if (!isCallLog) {
            return (
                <div className="flex justify-center my-2">
                    <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full border border-gray-700">
                        {systemContent}
                    </span>
                </div>
            );
        }
    }

    return (
        <div
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group relative`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            onContextMenu={handleContextMenu}
        >
            {/* Custom Context Menu */}
            {contextMenu && (
                <div
                    ref={menuRef}
                    className="fixed bg-gray-800 border border-gray-700 rounded shadow-xl z-50 py-1 flex flex-col min-w-[150px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    {isOwn && !message.deletedForEveryone && (
                        <>
                            {/* Only Text is editable */}
                            {message.messageType === 'text' && (
                                <button onClick={() => { setIsEditing(true); setContextMenu(null); }} className="px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700">
                                    Edit
                                </button>
                            )}
                            <button onClick={() => handleDelete(true)} className="px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700">
                                Delete for Everyone
                            </button>
                            <button onClick={() => handleDelete(false)} className="px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700">
                                Delete for Me
                            </button>
                        </>
                    )}

                    {!isOwn && !message.deletedForEveryone && (
                        <button onClick={() => handleDelete(false)} className="px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700">
                            Delete for Me
                        </button>
                    )}

                    {/* Download option for media/files */}
                    {(message.messageType === 'image' || message.messageType === 'video' || message.messageType === 'audio' || message.messageType === 'file') && (
                        <button onClick={handleDownload} className="px-4 py-2 text-left text-sm text-blue-400 hover:bg-gray-700">
                            Download
                        </button>
                    )}
                </div>
            )}

            {!isOwn && (
                <div className="w-8 h-8 rounded-full bg-gray-600 mr-2 overflow-hidden flex-shrink-0 mt-1">
                    {message.User?.avatar ? (
                        <img src={message.User.avatar} alt={message.User.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                            {message.User?.name ? message.User.name[0].toUpperCase() : '?'}
                        </div>
                    )}
                </div>
            )}

            <div
                className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${isOwn
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm'
                    : 'bg-gray-800 border border-gray-700/50 text-gray-100 rounded-bl-sm'
                    } ${message.deletedForEveryone ? 'italic text-gray-400 border border-gray-600 bg-transparent shadow-none' : ''}`}
            >
                {!isOwn && isGroup && message.User?.name && !message.deletedForEveryone && (
                    <p className="text-xs text-blue-400 mb-1 font-bold tracking-wide">{message.User.name}</p>
                )}

                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="text-black p-1 rounded text-sm"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setIsEditing(false)} className="text-xs text-gray-200">Cancel</button>
                            <button onClick={handleSaveEdit} className="text-xs text-white font-bold">Save</button>
                        </div>
                    </div>
                ) : message.deletedForEveryone ? (
                    <p className="italic">
                        {message.content}
                    </p>
                ) : (
                    <>
                        {(message.messageType === 'text' || message.messageType === 'system') && (
                            (() => {
                                // Fallback: Check if it's a JSON call log that got saved as text OR system
                                try {
                                    const rawContent = message.content;
                                    let parsed = null;

                                    if (message.messageType === 'system') {
                                        try { parsed = JSON.parse(rawContent); } catch (e) { }
                                    }

                                    // Ultra-permissive check for text fallback
                                    if (!parsed && rawContent && rawContent.includes('call_log') && rawContent.trim().startsWith('{')) {
                                        const start = rawContent.indexOf('{');
                                        const end = rawContent.lastIndexOf('}');
                                        if (start !== -1 && end !== -1) {
                                            const jsonCandidate = rawContent.substring(start, end + 1);
                                            parsed = JSON.parse(jsonCandidate);
                                        }
                                    }

                                    if (parsed && parsed.type === 'call_log') {
                                        const isMissed = parsed.status === 'missed' || parsed.status === 'declined';
                                        const isIncoming = !isOwn;
                                        const isVideo = parsed.isVideo;

                                        return (
                                            <div className="flex items-center gap-3 min-w-[180px] py-1">
                                                <div className={`p-2 rounded-full ${isMissed ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {isVideo ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                                    ) : isMissed ? (
                                                        // Missed Call
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 1l-6 6"></path><path d="M17 1l6 6"></path><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                    ) : isIncoming ? (
                                                        // Received (Incoming) - Phone with Arrow Down Left
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 22 16 22 10"></polyline><line x1="12" y1="12" x2="22" y2="16"></line><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                    ) : (
                                                        // Outgoing - Phone with Arrow Up Right
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 2 22 2 22 8"></polyline><line x1="12" y1="12" x2="22" y2="2"></line><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold ${isMissed ? 'text-red-300' : 'text-green-300'}`}>
                                                        {isMissed ? 'Missed Call' : (parsed.isVideo ? 'Video Call' : (isIncoming ? 'Incoming Call' : 'Outgoing Call'))}
                                                    </span>
                                                    {parsed.duration && (
                                                        <span className="text-gray-300 text-xs">
                                                            {parsed.duration}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                } catch (e) {
                                    // Silent fail
                                }

                                if (message.messageType === 'system') return null; // Fallback

                                return (
                                    <p>
                                        {message.content.split(' ').map((word, index) => {
                                            if (word.startsWith('@')) {
                                                return <span key={index} className="text-blue-300 font-bold">{word} </span>;
                                            }
                                            return word + ' ';
                                        })}
                                    </p>
                                );
                            })()
                        )}

                        {message.messageType === 'image' && (
                            <img
                                src={message.attachmentUrl}
                                alt="attachment"
                                className="max-w-full max-h-96 rounded-lg cursor-pointer hover:opacity-90 transition object-contain bg-gray-800"
                                onClick={() => onImageClick && onImageClick(message.attachmentUrl)}
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=Image+Error'; }}
                            />
                        )}

                        {message.messageType === 'video' && (
                            <div className="w-full max-w-[320px] aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-700/50 shadow-md relative">
                                <video
                                    src={message.attachmentUrl}
                                    controls
                                    playsInline
                                    preload="auto"
                                    className="w-full h-full object-contain bg-black"
                                    onError={(e) => console.error("Video load error", e)}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        )}

                        {message.messageType === 'audio' && (
                            <div className="min-w-[260px] md:min-w-[300px]">
                                <audio src={message.attachmentUrl} controls className="w-full h-10 rounded-lg" />
                            </div>
                        )}

                        {message.messageType === 'file' && (
                            <a
                                href={message.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 bg-gray-600/30 hover:bg-gray-600/50 border border-gray-500/30 rounded-lg p-3 transition group max-w-[280px]"
                            >
                                <div className="p-2 bg-gray-700/50 rounded-lg text-blue-400 group-hover:text-blue-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-white group-hover:text-blue-200">
                                        {message.content.replace('File: ', '')}
                                    </p>
                                    <p className="text-xs text-gray-400">Click to download</p>
                                </div>
                                <div className="p-2 text-gray-400 group-hover:text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                </div>
                            </a>
                        )}
                    </>
                )}

                <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xs text-gray-300">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && !message.deletedForEveryone && (
                        <span className="text-xs ml-1 flex items-center">
                            {message.seenBy && message.seenBy.length > 0 ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-blue-400">
                                    <path d="M18 6L7 17l-5-5" />
                                    <path d="M22 10l-7.5 7.5L13 16" />
                                </svg>
                            ) : message.deliveredTo && message.deliveredTo.length > 0 ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
                                    <path d="M18 6L7 17l-5-5" />
                                    <path d="M22 10l-7.5 7.5L13 16" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div >
    );
};

export default MessageBubble;
