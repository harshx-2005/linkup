import { useState } from 'react';
import { Link } from 'react-router-dom';
import CreateChatModal from './CreateChatModal';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ conversations = [], onSelectConversation, selectedConversation, onlineUsers, onNewConversation }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateChat, setShowCreateChat] = useState(false);
    const { user } = useAuth();

    const safeConversations = Array.isArray(conversations) ? conversations : [];
    const filteredConversations = safeConversations.filter(conv => {
        if (!conv) return false;
        const name = conv.name || conv.groupName || '';
        const email = conv.email || '';
        const lowerSearch = searchTerm.toLowerCase();
        return name.toLowerCase().includes(lowerSearch) || email.toLowerCase().includes(lowerSearch);
    });

    return (
        <div className="w-full h-full bg-transparent border-r border-white/5 flex flex-col relative z-20">
            {/* Header Area */}
            <div className="p-5 flex justify-between items-center bg-transparent backdrop-blur-xl sticky top-0 z-10">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                    LinkUp
                </h1>
                <div className="flex gap-2">
                    <button onClick={() => { /* Placeholder for onOpenProfile */ }} className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.29 1.52l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    </button>
                    <button onClick={() => setShowCreateChat(true)} className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
            </div>
            <div className="p-5 pt-0">
                <div className="relative group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        className="w-full bg-[#1c1c1f] text-gray-200 placeholder-gray-600 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={async () => {
                        try {
                            const token = localStorage.getItem('token');
                            const res = await fetch('https://linkup-ewud.onrender.com/api/conversations/ai', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!res.ok) throw new Error('Failed to start AI Chat');
                            const aiChat = await res.json();
                            onNewConversation(aiChat);
                            onSelectConversation(aiChat);
                        } catch (err) {
                            console.error("Meta AI Error:", err);
                        }
                    }}
                    className={`mt-4 w-full p-3.5 rounded-xl flex items-center gap-4 transition-all duration-200 group border border-transparent ${selectedConversation?.id === 'ai-chat'
                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30'
                        : 'bg-black/20 hover:bg-black/30 border-white/5 hover:border-white/10'
                        }`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${selectedConversation?.id === 'ai-chat' ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-[#27272a] text-blue-400 group-hover:bg-[#3f3f46]'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M12 22a2 2 0 0 1 2-2v-2a2 2 0 0 1-2-2 2 2 0 0 1-2 2v2a2 2 0 0 1 2 2z"></path><path d="M2 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"></path><path d="M22 12a2 2 0 0 1-2-2h-2a2 2 0 0 1-2 2 2 2 0 0 1 2 2h2a2 2 0 0 1 2-2z"></path><rect x="8" y="8" width="8" height="8" rx="2"></rect></svg>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`font-bold text-sm ${selectedConversation?.id === 'ai-chat' ? 'text-white' : 'text-gray-200'}`}>LinkUp AI</span>
                        <span className="text-[11px] text-blue-400/80 font-medium">Click to chat with AI</span>
                    </div>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 p-2">
                {filteredConversations.map((conv) => (
                    <div
                        key={conv.id}
                        onClick={() => onSelectConversation(conv)}
                        className={`group p-3 mx-2 my-1 rounded-2xl flex items-center cursor-pointer transition-all duration-300 backdrop-blur-sm ${selectedConversation?.id === conv.id
                            ? 'bg-white/10 shadow-lg border border-white/10'
                            : 'hover:bg-white/5 border border-transparent'
                            }`}
                    >
                        <div className="relative mr-4 shrink-0">
                            <div className={`w-12 h-12 rounded-full overflow-hidden border ${selectedConversation?.id === conv.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'border-[#3f3f46] group-hover:border-[#52525b]'} transition-all duration-300 ring-2 ring-black/40`}>
                                {conv.avatar ? (
                                    <img src={conv.avatar} alt="avatar" className="w-full h-full object-cover" />
                                ) : conv.isGroup ? (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                        <span role="img" aria-label="group">👥</span>
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold text-lg">
                                        {conv.name ? conv.name[0]?.toUpperCase() : '?'}
                                    </div>
                                )}
                            </div>
                            {/* Online Status Dot */}
                            {(!conv.isGroup && (
                                (conv.otherUserId && onlineUsers?.has(String(conv.otherUserId))) ||
                                (conv.email === 'ai@linkup.bot') ||
                                (conv.name === 'LinkUp AI')
                            )) && (
                                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-900"></div>
                                )}
                        </div>

                        <div className="overflow-hidden flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <h3 className={`font-semibold truncate text-base ${selectedConversation?.id === conv.id ? 'text-blue-100' : 'text-gray-200 group-hover:text-white'}`}>
                                    {conv.name || conv.groupName || 'Unknown'}
                                </h3>
                                {conv.lastMessageTime && (
                                    <span className={`text-[11px] ml-2 shrink-0 ${selectedConversation?.id === conv.id ? 'text-blue-300' : 'text-gray-500 group-hover:text-gray-400'}`}>
                                        {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <p className={`truncate flex-1 flex items-center gap-1.5 mr-2 ${selectedConversation?.id === conv.id ? 'text-blue-200' : 'text-gray-400 group-hover:text-gray-300'} transition-colors`}>
                                    {conv.lastMessage ? (
                                        (() => {
                                            const txt = conv.lastMessage;
                                            // Robust parsing for "WhatsApp-like" icons
                                            if (txt.includes('Missed Call')) {
                                                return (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="bg-red-500/20 text-red-500 rounded-full p-0.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M23 1l-6 6"></path><path d="M17 1l6 6"></path><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                        </span>
                                                        <span>Missed voice call</span>
                                                    </span>
                                                );
                                            }
                                            if (txt.includes('Incoming Call')) {
                                                return (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="bg-green-500/20 text-green-500 rounded-full p-0.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="16 16 22 16 22 10"></polyline><line x1="12" y1="12" x2="22" y2="16"></line><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                        </span>
                                                        <span>Voice call</span>
                                                    </span>
                                                );
                                            }
                                            if (txt.includes('Outgoing Call')) {
                                                return (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="bg-green-500/20 text-green-500 rounded-full p-0.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="16 2 22 2 22 8"></polyline><line x1="12" y1="12" x2="22" y2="2"></line><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                        </span>
                                                        <span>Voice call</span>
                                                    </span>
                                                );
                                            }
                                            // Fallback for everything else
                                            return txt;
                                        })()
                                    ) : (
                                        <span className="italic opacity-50">No messages yet</span>
                                    )}
                                </p>
                                {conv.unreadCount > 0 && (
                                    <div className="bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center shrink-0 shadow-lg animate-pulse-short">
                                        {conv.unreadCount}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {showCreateChat && (
                <CreateChatModal
                    onClose={() => setShowCreateChat(false)}
                    onChatCreated={(newChat) => {
                        onNewConversation(newChat);
                        setShowCreateChat(false);
                    }}
                />
            )}
        </div>
    );
};

export default Sidebar;
