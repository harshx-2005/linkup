import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ForwardMessageModal = ({ message, onClose, onForward }) => {
    const [recentChats, setRecentChats] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChats, setSelectedChats] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        fetchRecentChats();
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const fetchRecentChats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/conversations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecentChats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleSelection = (chatId) => {
        setSelectedChats(prev =>
            prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
        );
    };

    const handleSend = async () => {
        if (selectedChats.length === 0) return;
        setIsSending(true);
        try {
            // We can emit this up or handle api here.
            // Let's rely on parent 'onForward' to do the heavy lifting (socket emit etc) 
            // or do we allow multiple?
            // The task implies one message forwarded to multiple chats.

            await onForward(selectedChats, message);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to forward');
        } finally {
            setIsSending(false);
        }
    };

    const filteredChats = recentChats.filter(c => {
        const name = c.name || c.groupName;
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
            <div
                ref={modalRef}
                className="bg-[#1f2c34] w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[80vh] border border-gray-800 animate-scale-up"
            >
                <div className="p-4 bg-[#202c33] border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-gray-100 font-semibold text-lg">Forward message to...</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="p-3 bg-[#111b21]">
                    <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-white text-sm focus:outline-none w-full"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#111b21] p-2 space-y-1">
                    {filteredChats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => toggleSelection(chat.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${selectedChats.includes(chat.id) ? 'bg-[#00a884]/20' : 'hover:bg-[#202c33]'}`}
                        >
                            <div className="relative">
                                {/* Checkbox Overlay */}
                                {selectedChats.includes(chat.id) && (
                                    <div className="absolute -bottom-1 -right-1 bg-[#00a884] rounded-full p-0.5 border-2 border-[#111b21] z-10 animate-scale-up">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                )}
                                <div className={`w-10 h-10 rounded-full overflow-hidden ${selectedChats.includes(chat.id) ? 'ring-2 ring-[#00a884] ring-offset-2 ring-offset-[#111b21]' : ''}`}>
                                    {chat.avatar || chat.groupImage ? (
                                        <img src={chat.avatar || chat.groupImage} alt="Chat" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white font-bold text-sm">
                                            {(chat.name || chat.groupName || '?')[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-sm font-medium ${selectedChats.includes(chat.id) ? 'text-[#00a884]' : 'text-gray-200'}`}>
                                    {chat.name || chat.groupName}
                                </span>
                                {chat.isGroup && <span className="text-xs text-gray-500">Group</span>}
                            </div>
                        </div>
                    ))}
                    {filteredChats.length === 0 && (
                        <div className="text-center py-6 text-gray-500 text-sm">No chats found</div>
                    )}
                </div>

                <div className="p-4 bg-[#202c33] border-t border-gray-700 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                        {selectedChats.length} selected
                    </span>
                    <button
                        onClick={handleSend}
                        disabled={selectedChats.length === 0 || isSending}
                        className="bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full font-medium text-sm flex items-center gap-2 transition"
                    >
                        {isSending ? 'Sending...' : (
                            <>
                                Send
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForwardMessageModal;
