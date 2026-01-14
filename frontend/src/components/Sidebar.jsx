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
        <div className="w-full h-full bg-gray-900 border-r border-gray-800 flex flex-col">
            {/* Header Area */}
            <div className="p-4 bg-gray-900 border-b border-gray-800 shrink-0 z-10">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Chats
                    </h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowCreateChat(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition hover:scale-105"
                            title="New Conversation"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {user?.role === 'admin' && (
                            <Link to="/admin" className="text-gray-400 hover:text-purple-400 transition transform hover:scale-110" title="Admin Dashboard">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.352-.272-2.636-.759-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                </svg>
                            </Link>
                        )}

                        <Link to="/settings" className="relative group" title="Settings">
                            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-700 group-hover:border-blue-500 transition shadow-sm">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                                        {user?.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Meta AI Button */}
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
                    className="w-full mb-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all animate-in fade-in slide-in-from-top-4"
                >
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM9 15a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 019 15z" clipRule="evenodd" />
                        </svg>
                    </div>
                    LinkUp AI
                </button>

                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 absolute left-3 top-2.5 text-gray-500">
                        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700 focus:border-blue-500/50 transition-all placeholder-gray-500"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 p-2">
                {filteredConversations.map((conv) => (
                    <div
                        key={conv.id}
                        onClick={() => onSelectConversation(conv)}
                        className={`group p-3 rounded-xl flex items-center cursor-pointer transition-all border border-transparent ${selectedConversation?.id === conv.id
                            ? 'bg-gradient-to-r from-blue-900/40 to-blue-900/10 border-blue-500/30'
                            : 'hover:bg-gray-800 hover:border-gray-700'
                            }`}
                    >
                        <div className="relative mr-3.5 shrink-0">
                            <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${selectedConversation?.id === conv.id ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-gray-700 group-hover:border-gray-500'} transition-all`}>
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
