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

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                ref={modalRef}
                className="bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-800 animate-fade-in-up"
            >
                {/* Header */}
                <div className="relative bg-gray-800 p-6 flex flex-col items-center border-b border-gray-700">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>

                    {/* Role-based avatar upload */}
                    <div className="relative group w-24 h-24 mb-4 rounded-full mx-auto">
                        <div className="w-full h-full rounded-full overflow-hidden shadow-lg ring-4 ring-gray-700/50">
                            {groupImage ? (
                                <img src={groupImage} alt="Group" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                                    {conversation.groupName[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        {isAdmin && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-200 backdrop-blur-xs"
                            >
                                {uploading ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                )}
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-1">{conversation.groupName}</h2>
                    <p className="text-gray-400 text-sm">Group • {members.length} members</p>
                </div>

                {/* Content Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">

                    {/* Description Section */}
                    <div className="p-4 border-b border-gray-800">
                        {isEditingDesc ? (
                            <div className="space-y-2">
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-gray-700 text-white rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none"
                                    rows="3"
                                    placeholder="Add group description..."
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1 text-xs text-gray-400 hover:text-white">Cancel</button>
                                    <button onClick={saveDescription} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded">Save</button>
                                </div>
                            </div>
                        ) : (
                            <div className="group flex justify-between items-start">
                                <p className={`text-sm ${description ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                                    {description || "Add group description"}
                                </p>
                                {isAdmin && (
                                    <button onClick={() => setIsEditingDesc(true)} className="text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Members Section */}
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">{members.length} Participants</h3>
                            <button className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                Search
                            </button>
                        </div>

                        {/* Add Member Button (Admin Only) */}
                        {isAdmin && (
                            <div className="mb-4">
                                {!isAdding ? (
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="w-full py-3 px-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-left flex items-center gap-3 transition group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white group-hover:scale-110 transition">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </div>
                                        <span className="font-medium text-blue-400">Add Participant</span>
                                    </button>
                                ) : (
                                    <div className="bg-gray-800 p-3 rounded-xl animate-fade-in">
                                        <div className="flex items-center gap-2 mb-2">
                                            <input
                                                type="text"
                                                placeholder="Type name to add..."
                                                value={search}
                                                onChange={(e) => handleSearch(e.target.value)}
                                                className="flex-1 bg-gray-700 text-white p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                                autoFocus
                                            />
                                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-white">Cancel</button>
                                        </div>
                                        {searchResults.map(user => (
                                            <div key={user.id} onClick={() => addMember(user.id)} className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg cursor-pointer">
                                                <img src={user.avatar || 'https://placehold.co/40'} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                <span className="text-sm font-medium">{user.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-1">
                            {members.map(member => {
                                const isMemberAdmin = member.role === 'admin' || member.isAdmin;
                                return (
                                    <div
                                        key={member.id}
                                        onClick={() => setViewingUser(member)}
                                        className="flex items-center justify-between p-3 hover:bg-gray-800/10 rounded-xl transition group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden relative">
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-linear-to-br from-gray-600 to-gray-700">
                                                        {member.name[0].toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium text-sm flex items-center gap-2">
                                                    {member.name}
                                                    {member.id === currentUser.id && <span className="bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide">You</span>}
                                                </span>
                                                {/* Status or Admin Badge */}
                                                {isMemberAdmin && (
                                                    <span className="text-blue-400 text-xs bg-blue-400/10 px-1.5 py-0.5 rounded inline-block w-fit mt-0.5">Admin</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons for Admins */}
                                        {isAdmin && member.id !== currentUser.id && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                {isMemberAdmin ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); dismissAdmin(member.id); }}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-orange-400 hover:bg-gray-700 rounded-full transition"
                                                        title="Dismiss as Admin"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); promoteMember(member.id); }}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-full transition"
                                                        title="Make Group Admin"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeMember(member.id); }}
                                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-full transition"
                                                    title="Remove User"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 pt-2 border-t border-gray-800">
                        <button
                            onClick={leaveGroup}
                            className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 py-3 rounded-xl transition font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            Exit Group
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
