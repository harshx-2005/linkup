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

    // Initial State from Props
    const [groupImage, setGroupImage] = useState(conversation?.groupImage || '');
    const [groupName, setGroupName] = useState(conversation?.groupName || '');
    const [isEditingName, setIsEditingName] = useState(false);

    useEffect(() => {
        if (conversation && conversation.members) {
            setMembers(conversation.members);
            setDescription(conversation.description || '');
            setGroupImage(conversation.groupImage);
            setGroupName(conversation.groupName);

            const me = conversation.members.find(m => m.id === currentUser.id);
            if (me && (me.role === 'admin' || me.isAdmin || conversation.createdBy === currentUser.id)) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        }
    }, [conversation, currentUser, onClose]);

    // Close on Outside Click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target) && !viewingUser) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, viewingUser]);


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
            setGroupImage(imageUrl);
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveName = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/conversations/${conversation.id}`, { groupName }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEditingName(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Failed to update name', error);
        }
    };

    const handleSaveDesc = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/conversations/${conversation.id}`, { description }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEditingDesc(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Failed to update desc', error);
        }
    };

    // Member Management Actions
    const promoteMember = async (userId) => updateMemberRole(userId, 'promote');
    const dismissAdmin = async (userId) => updateMemberRole(userId, 'dismiss');

    const updateMemberRole = async (userId, action) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/conversations/${conversation.id}/members/${userId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: action === 'promote' ? 'admin' : 'member', isAdmin: action === 'promote' } : m));
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    const removeMember = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/conversations/${conversation.id}/members/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMembers(prev => prev.filter(m => m.id !== userId));
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error removing member:', error);
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
        }
    };

    const handleSearch = async (query) => {
        setSearch(query);
        if (!query.trim()) { setSearchResults([]); return; }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/users?search=${query}`, { headers: { Authorization: `Bearer ${token}` } });
            setSearchResults(res.data.filter(u => !members.some(m => m.id === u.id)));
        } catch (error) { console.error(error); }
    };

    const leaveGroup = async () => {
        if (!confirm('Leave this group?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/conversations/${conversation.id}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
            window.location.reload();
        } catch (e) { console.error(e); }
    };

    const [activeDropdown, setActiveDropdown] = useState(null);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div
                ref={modalRef}
                className="bg-[#1f2c34] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-800 animate-scale-up"
            >
                {/* Header with Gradient and Image */}
                <div className="relative bg-gradient-to-br from-indigo-900/40 to-[#1f2c34] pb-4">
                    <button onClick={onClose} className="absolute top-4 left-4 z-10 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white transition backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>

                    <div className="flex flex-col items-center mt-8">
                        <div className="relative group w-28 h-28 rounded-full cursor-pointer ring-4 ring-[#1f2c34] shadow-xl">
                            <div className="w-full h-full rounded-full overflow-hidden">
                                {groupImage ? (
                                    <img src={groupImage} alt="Group" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full bg-linear-to-br from-green-500 to-teal-600 flex items-center justify-center text-4xl font-bold text-white">
                                        {groupName[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            {isAdmin && (
                                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[1px]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageChange} />
                        </div>

                        {/* Name Editor */}
                        <div className="mt-3 flex items-center gap-2 group/name px-4">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input value={groupName} onChange={e => setGroupName(e.target.value)} className="bg-transparent border-b border-[#00a884] text-white text-xl font-bold text-center focus:outline-none w-full" autoFocus />
                                    <button onClick={handleSaveName} className="text-[#00a884]"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold text-white">{groupName}</h2>
                                    {isAdmin && <button onClick={() => setIsEditingName(true)} className="text-gray-500 hover:text-white opacity-0 group-hover/name:opacity-100 transition"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>}
                                </>
                            )}
                        </div>
                        <p className="text-gray-400 text-sm mt-0.5">Group • {members.length} members</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#111b21] pb-20">
                    {/* Description Section */}
                    <div className="p-4 border-b border-gray-800">
                        {isEditingDesc ? (
                            <div className="bg-[#202c33] p-3 rounded-lg">
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-transparent text-gray-200 text-sm resize-none focus:outline-none" rows={2} placeholder="Add description..." autoFocus />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={() => setIsEditingDesc(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                                    <button onClick={handleSaveDesc} className="text-xs text-[#00a884] font-bold">Save</button>
                                </div>
                            </div>
                        ) : (
                            <div onClick={() => isAdmin && setIsEditingDesc(true)} className={`p-3 rounded-lg border border-dashed border-gray-700 hover:bg-[#202c33] cursor-pointer transition ${!description && 'py-4 flex justify-center'}`}>
                                <p className={`text-sm ${description ? 'text-gray-300' : 'text-gray-500 italic'}`}>{description || "Add group description"}</p>
                            </div>
                        )}
                    </div>

                    {/* Add Member */}
                    {isAdmin && (
                        <div className="px-4 py-2">
                            <div onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-3 p-2 hover:bg-[#202c33] rounded-lg cursor-pointer transition group">
                                <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </div>
                                <span className="font-medium text-gray-200">Add participants</span>
                            </div>

                            {isAdding && (
                                <div className="mt-2 bg-[#202c33] p-2 rounded-lg animate-fade-in">
                                    <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search..." className="w-full bg-[#111b21] px-3 py-2 rounded text-sm text-white focus:outline-none" autoFocus />
                                    <div className="max-h-40 overflow-y-auto mt-2 space-y-1">
                                        {searchResults.map(u => (
                                            <div key={u.id} onClick={() => addMember(u.id)} className="flex items-center gap-2 p-2 hover:bg-[#111b21] rounded cursor-pointer">
                                                <img src={u.avatar || 'https://placehold.co/40'} className="w-8 h-8 rounded-full" alt="" />
                                                <span className="text-sm text-gray-200">{u.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Members List */}
                    <div className="px-2 mt-2 space-y-0.5">
                        {members.map(member => (
                            <div key={member.id} className="group relative flex items-center justify-between p-2 rounded-lg hover:bg-[#202c33] transition cursor-pointer">
                                <div className="flex items-center gap-3" onClick={() => member.id !== currentUser.id && setViewingUser(member)}>
                                    <div className="relative">
                                        <img src={member.avatar || 'https://placehold.co/40'} className="w-10 h-10 rounded-full object-cover" alt="" />
                                        {(member.role === 'admin' || member.isAdmin) && (
                                            <div className="absolute -bottom-1 -right-1 bg-[#00a884] text-white text-[9px] font-bold px-1 rounded-full border border-[#111b21]">ADMIN</div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-200">{member.id === currentUser.id ? 'You' : member.name}</p>
                                        <p className="text-xs text-gray-500">{member.email}</p>
                                    </div>
                                </div>

                                {isAdmin && member.id !== currentUser.id && (
                                    <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === member.id ? null : member.id); }} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                        </button>
                                        {activeDropdown === member.id && (
                                            <div className="absolute right-0 top-8 bg-[#2a3942] w-40 rounded-lg shadow-xl z-20 overflow-hidden border border-gray-700 animate-scale-up">
                                                <button onClick={() => { member.isAdmin ? dismissAdmin(member.id) : promoteMember(member.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#111b21]">
                                                    {member.isAdmin ? 'Dismiss as Admin' : 'Make Group Admin'}
                                                </button>
                                                <button onClick={() => { removeMember(member.id); setActiveDropdown(null); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[#111b21]">
                                                    Remove {member.name}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-4 mt-4 mb-8">
                        <button onClick={leaveGroup} className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 font-bold text-sm hover:bg-red-500/20 transition flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            Exit Group
                        </button>
                    </div>
                </div>
            </div>

            {viewingUser && <UserProfileModal user={viewingUser} onClose={() => setViewingUser(null)} />}
        </div>
    );
};

export default GroupInfoModal;
