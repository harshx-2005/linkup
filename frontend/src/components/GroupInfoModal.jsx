import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import UserProfileModal from './UserProfileModal';

const GroupInfoModal = ({ conversation, onClose, currentUser, onUpdate }) => {
    const [members, setMembers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [description, setDescription] = useState('');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);

    const modalRef = useRef(null);
    const fileInputRef = useRef(null);

    const [groupImage, setGroupImage] = useState(conversation?.groupImage || '');

    // ...

    useEffect(() => {
        if (conversation && conversation.members) {
            setMembers(conversation.members);
            setDescription(conversation.description || '');
            setGroupImage(conversation.groupImage);

            // Check if current user is admin
            const me = conversation.members.find(m => m.id === currentUser.id);
            if (me && (me.role === 'admin' || me.isAdmin || conversation.createdBy === currentUser.id)) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        }
    }, [conversation, currentUser, onClose]);

    // ... handlers ...

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const uploadRes = await axios.post('/api/upload', formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            const imageUrl = uploadRes.data.url;

            await axios.put(`/api/conversations/${conversation.id}`, { groupImage: imageUrl }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setGroupImage(imageUrl); // Instant update
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to update icon');
        } finally {
            setUploading(false);
        }
    };

    const promoteMember = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/conversations/${conversation.id}/members/${userId}/promote`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(members.map(m => m.id === userId ? { ...m, role: 'admin', isAdmin: true } : m));
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            alert('Failed to promote user');
        }
    };

    const dismissAdmin = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/conversations/${conversation.id}/members/${userId}/dismiss`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(members.map(m => m.id === userId ? { ...m, role: 'member', isAdmin: false } : m));
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            alert('Failed to dismiss admin');
        }
    };

    // ... (rendering) ...
    // Update Image source to groupImage state
    // Update Member item actions


    // Existing handlers...

    // NEW: Search Handler
    const handleSearch = async (query) => {
        setSearch(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/users?search=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter out existing members
            const newUsers = res.data.filter(u => !members.some(m => m.id === u.id));
            setSearchResults(newUsers);
        } catch (error) {
            console.error("Search failed:", error);
        }
    };

    const saveDescription = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/conversations/${conversation.id}`, { description }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEditingDesc(false);
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to update description');
        }
    };

    const addMember = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`/api/conversations/${conversation.id}/members`, { userId }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMembers([...members, res.data]);
            setSearchResults([]);
            setSearch('');
            setIsAdding(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error adding member:', error);
            alert('Failed to add member');
        }
    };

    const removeMember = async (userId) => {
        if (!confirm('Remove this member from the group?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/conversations/${conversation.id}/members/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMembers(members.filter(m => m.id !== userId));
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    const leaveGroup = async () => {
        if (!confirm('Exit this group?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/conversations/${conversation.id}/leave`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            onClose();
            window.location.reload();
        } catch (error) {
            console.error('Error leaving group:', error);
        }
    };

    // State for managing active dropdown
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeDropdown && !event.target.closest('.member-dropdown')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    const toggleDropdown = (userId, e) => {
        e.stopPropagation();
        setActiveDropdown(activeDropdown === userId ? null : userId);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div
                ref={modalRef}
                className="bg-[#1f2c34] w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-800 animate-scale-up"
            >
                {/* Header */}
                <div className="relative bg-[#202c33] p-4 flex flex-col items-center border-b border-gray-700">
                    <button onClick={onClose} className="absolute top-4 left-4 text-gray-400 hover:text-white transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>

                    <h2 className="text-lg font-semibold text-gray-100">Group Info</h2>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#111b21]">

                    {/* Group Icon & Name */}
                    <div className="flex flex-col items-center p-6 bg-[#111b21] border-b border-gray-800">
                        <div className="relative group w-32 h-32 mb-4 rounded-full mx-auto cursor-pointer">
                            <div className="w-full h-full rounded-full overflow-hidden shadow-lg ring-0">
                                {groupImage ? (
                                    <img src={groupImage} alt="Group" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-5xl font-bold text-white">
                                        {conversation.groupName[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            {isAdmin && (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white mb-1"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                    <span className="text-xs text-white font-medium">CHANGE</span>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                        </div>

                        <div className="text-center w-full px-4">
                            <h2 className="text-2xl font-bold text-gray-100 mb-1">{conversation.groupName}</h2>
                            <p className="text-gray-400 text-sm">Group • {members.length} participants</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="p-4 bg-[#111b21] border-b border-gray-800">
                        {isEditingDesc ? (
                            <div className="space-y-2">
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-[#2a3942] text-gray-100 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#00a884] text-sm resize-none"
                                    rows="3"
                                    placeholder="Add group description..."
                                    autoFocus
                                />
                                <div className="flex gap-3 justify-end">
                                    <button onClick={() => setIsEditingDesc(false)} className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition">Cancel</button>
                                    <button onClick={saveDescription} className="px-4 py-1.5 text-sm bg-[#00a884] hover:bg-[#008f6f] text-gray-900 font-semibold rounded-full shadow-md transition">Save</button>
                                </div>
                            </div>
                        ) : (
                            <div className="group flex justify-between items-start cursor-pointer p-2 rounded-lg hover:bg-gray-800/30 transition" onClick={() => isAdmin && setIsEditingDesc(true)}>
                                <div className="flex-1">
                                    <p className={`text-sm ${description ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                                        {description || "Add group description"}
                                    </p>
                                </div>
                                {isAdmin && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 opacity-0 group-hover:opacity-100 transition ml-2 self-center"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Add Participant Area */}
                    {isAdmin && (
                        <div className="px-4 py-3 bg-[#111b21]">
                            {!isAdding ? (
                                <div
                                    onClick={() => setIsAdding(true)}
                                    className="flex items-center gap-4 py-2 cursor-pointer hover:bg-[#202c33] px-2 rounded-lg transition"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </div>
                                    <span className="text-base font-medium text-gray-100">Add participant</span>
                                </div>
                            ) : (
                                <div className="bg-[#202c33] p-2 rounded-lg animate-fade-in shadow-inner">
                                    <div className="flex items-center gap-2 mb-2 bg-[#2a3942] rounded-md px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884]">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={search}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="flex-1 bg-transparent text-gray-100 border-none focus:outline-none focus:ring-0 text-sm py-1"
                                            autoFocus
                                        />
                                        <button onClick={() => { setIsAdding(false); setSearch(''); setSearchResults([]); }} className="text-gray-400 hover:text-white">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                        {searchResults.map(user => (
                                            <div key={user.id} onClick={() => addMember(user.id)} className="flex items-center gap-3 p-2 hover:bg-[#111b21] rounded-md cursor-pointer transition">
                                                <img src={user.avatar || 'https://placehold.co/40'} className="w-9 h-9 rounded-full object-cover" alt="" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-100">{user.name}</span>
                                                    <span className="text-xs text-gray-400">{user.email}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {search && searchResults.length === 0 && (
                                            <p className="text-gray-500 text-xs text-center py-2">No users found</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Participants List Header */}
                    <div className="px-6 py-2">
                        <span className="text-[#00a884] text-xs font-bold uppercase tracking-wide">{members.length} participants</span>
                    </div>

                    {/* Participants List */}
                    <div className="pb-20">
                        {members.map(member => {
                            const isMemberAdmin = member.role === 'admin' || member.isAdmin;
                            const isMe = member.id === currentUser.id;

                            return (
                                <div
                                    key={member.id}
                                    className="relative flex items-center justify-between px-6 py-3 hover:bg-[#202c33] cursor-pointer transition group"
                                >
                                    {/* Left Content (Avatar + Name) */}
                                    <div className="flex items-center gap-4 flex-1" onClick={() => isMe ? null : setViewingUser(member)}>
                                        <div className="relative w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                            {member.avatar ? (
                                                <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-gray-500 text-white">
                                                    {member.name[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex justify-between items-center w-full">
                                                <span className="text-gray-100 font-medium text-base truncate">
                                                    {isMe ? "You" : member.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isMemberAdmin && (
                                                    <span className="text-xs text-[#00a884] border border-[#00a884] px-1 rounded-sm font-medium">Group Admin</span>
                                                )}
                                                {!isMe && member.email && <span className="text-xs text-gray-500 truncate">{member.email}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Context Menu Trigger (Only for admins managing others) */}
                                    {isAdmin && !isMe && (
                                        <div className="relative member-dropdown">
                                            <button
                                                onClick={(e) => toggleDropdown(member.id, e)}
                                                className={`p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition ${activeDropdown === member.id ? 'bg-gray-700 text-white' : ''}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                            </button>

                                            {/* Dropdown Menu */}
                                            {activeDropdown === member.id && (
                                                <div className="absolute right-0 top-10 bg-[#2a3942] rounded-md shadow-2xl py-2 w-48 z-50 animate-scale-up border border-gray-700">
                                                    {isMemberAdmin ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); dismissAdmin(member.id); setActiveDropdown(null); }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-gray-100 hover:bg-[#111b21] flex items-center gap-3 transition"
                                                        >
                                                            <span className="text-orange-400">Dismiss as admin</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); promoteMember(member.id); setActiveDropdown(null); }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-gray-100 hover:bg-[#111b21] flex items-center gap-3 transition"
                                                        >
                                                            <span className="text-green-400">Make group admin</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeMember(member.id); setActiveDropdown(null); }}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-100 hover:bg-[#111b21] flex items-center gap-3 transition"
                                                    >
                                                        <span className="text-red-400">Remove {member.name}</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setViewingUser(member); setActiveDropdown(null); }}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-100 hover:bg-[#111b21] flex items-center gap-3 transition"
                                                    >
                                                        <span>View info</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Exit */}
                    <div className="p-4 bg-[#111b21] border-t border-gray-800">
                        <button
                            onClick={leaveGroup}
                            className="flex items-center gap-3 text-red-500 hover:bg-gray-800/50 w-full p-2.5 rounded-lg transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            <span className="font-medium">Exit group</span>
                        </button>
                    </div>
                </div>
            </div>

            {viewingUser && (
                <UserProfileModal
                    user={viewingUser}
                    onClose={() => setViewingUser(null)}
                />
            )}
        </div>
    );
};

export default GroupInfoModal;
