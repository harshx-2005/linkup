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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-800 p-6 rounded-2xl w-96 text-white max-h-[85vh] flex flex-col border border-gray-700 shadow-2xl animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        {isGroupMode ? "Create User Group" : "New Chat"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 hover:bg-gray-700 rounded-full">✕</button>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-gray-700 p-1 rounded-xl mb-4">
                    <button
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isGroupMode ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setIsGroupMode(false)}
                    >
                        Private Chat
                    </button>
                    <button
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isGroupMode ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setIsGroupMode(true)}
                    >
                        New Group
                    </button>
                </div>

                {isGroupMode && (
                    <div className="flex flex-col items-center mb-4 animate-fade-in">
                        {/* Avatar Upload */}
                        <div className="relative group cursor-pointer mb-3" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
                                {groupImage ? (
                                    <img src={groupImage} alt="Group" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                <span className="text-xs text-white font-bold">UPLOAD</span>
                            </div>
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
                                className="w-full bg-gray-700 mt-1 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                                placeholder="Enter group name..."
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="mb-2 relative">
                    <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-gray-500"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {users.length === 0 ? (
                        <p className="text-gray-500 text-center py-4 italic">No users found</p>
                    ) : (
                        users.map((user) => {
                            const isSelected = selectedUsers.includes(user.id);
                            return (
                                <div
                                    key={user.id}
                                    onClick={() => handleUserSelect(user.id)}
                                    className={`flex items-center p-3 cursor-pointer rounded-xl transition-all border ${isGroupMode && isSelected
                                        ? 'bg-blue-600/20 border-blue-500/50'
                                        : 'hover:bg-gray-700 border-transparent hover:border-gray-600'
                                        }`}
                                >
                                    <div className="relative w-10 h-10 mr-3">
                                        <div className="w-10 h-10 bg-gray-600 rounded-full overflow-hidden">
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-bold text-gray-300">
                                                    {user.name[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {isGroupMode && isSelected && (
                                            <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-gray-800">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-semibold truncate ${isGroupMode && isSelected ? 'text-blue-200' : 'text-gray-200'}`}>
                                            {user.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {isGroupMode && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                            onClick={handleCreateGroup}
                            disabled={loading || !groupName || selectedUsers.length === 0}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-white shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95"
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
