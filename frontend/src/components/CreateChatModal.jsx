import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const CreateChatModal = ({ onClose, onChatCreated }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Group Chat States
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupImage, setGroupImage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]); // Array of IDs
    const fileInputRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [search]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/users?search=${search}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(res.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });
            setGroupImage(res.data.url);
        } catch (error) {
            console.error('Error uploading group image:', error);
            alert('Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleUserSelect = async (userId) => {
        if (isGroupMode) {
            // Toggle selection
            setSelectedUsers(prev => {
                if (prev.includes(userId)) return prev.filter(id => id !== userId);
                return [...prev, userId];
            });
        } else {
            // Private Chat: Create immediately
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.post('/api/conversations/private', {
                    userId,
                }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                onChatCreated(res.data);
                onClose();
            } catch (error) {
                console.error('Error creating chat:', error);
                alert(error.response?.data?.message || 'Failed to create chat');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) return alert("Please enter a group name");
        if (selectedUsers.length === 0) return alert("Please select at least one member");

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/conversations/group', {
                name: groupName,
                memberIds: selectedUsers,
                groupImage,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            onChatCreated(res.data);
            onClose();
        } catch (error) {
            console.error('Error creating group:', error);
            alert(error.response?.data?.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-md p-4">
            {/* Ambient Background Circles */}
            <div className="absolute top-[20%] left-[20%] w-[250px] h-[250px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[20%] right-[20%] w-[250px] h-[250px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="bg-[#121215]/95 backdrop-blur-2xl p-6 rounded-3xl w-full max-w-md text-white max-h-[85vh] flex flex-col border border-white/5 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                        {isGroupMode ? "Create User Group" : "New Chat"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 hover:bg-white/5 rounded-full cursor-pointer">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-white/5 p-1 rounded-2xl mb-5 relative z-10 border border-white/5">
                    <button
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${!isGroupMode ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                        onClick={() => setIsGroupMode(false)}
                    >
                        Private Chat
                    </button>
                    <button
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${isGroupMode ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
                        onClick={() => setIsGroupMode(true)}
                    >
                        New Group
                    </button>
                </div>

                {isGroupMode && (
                    <div className="flex flex-col items-center mb-5 animate-in fade-in slide-in-from-top-3 relative z-10">
                        {/* Avatar Upload */}
                        <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-blue-500/50 transition-all duration-300">
                                {groupImage ? (
                                    <img src={groupImage} alt="Group" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-400 group-hover:text-blue-400 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <span className="text-[10px] text-white font-extrabold tracking-wider">UPLOAD</span>
                            </div>
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleImageChange}
                            accept="image/*"
                        />

                        <div className="w-full">
                            <label className="text-xs text-gray-400 font-bold ml-1 uppercase tracking-wider">Group Name</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 mt-1.5 p-3.5 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-white placeholder-gray-500 text-sm transition-all"
                                placeholder="Enter group name..."
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="mb-4 relative z-10">
                    <svg className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-gray-500 text-sm transition-all"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 relative z-10 min-h-0">
                    {users.length === 0 ? (
                        <p className="text-gray-500 text-center py-6 italic text-sm">No users found</p>
                    ) : (
                        users.map((user) => {
                            const isSelected = selectedUsers.includes(user.id);
                            return (
                                <div
                                    key={user.id}
                                    onClick={() => handleUserSelect(user.id)}
                                    className={`flex items-center p-3 cursor-pointer rounded-2xl transition-all border ${
                                        isGroupMode && isSelected
                                            ? 'bg-blue-600/10 border-blue-500/40 shadow-sm'
                                            : 'hover:bg-white/5 border-transparent hover:border-white/5'
                                    }`}
                                >
                                    <div className="relative w-11 h-11 mr-3.5 flex-shrink-0">
                                        <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-full overflow-hidden flex items-center justify-center">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-extrabold text-white text-base">
                                                    {user.name[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {isGroupMode && isSelected && (
                                            <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-0.5 border-2 border-[#121215] shadow-lg animate-in zoom-in-50">
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold truncate text-sm ${isGroupMode && isSelected ? 'text-blue-300' : 'text-gray-200'}`}>
                                            {user.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">{user.email}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {isGroupMode && (
                    <div className="mt-4 pt-4 border-t border-white/5 relative z-10">
                        <button
                            onClick={handleCreateGroup}
                            disabled={loading || !groupName || selectedUsers.length === 0}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold text-white shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95 cursor-pointer"
                        >
                            {loading ? 'Creating...' : `Create Group (${selectedUsers.length})`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateChatModal;
