import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import axios from 'axios';

const SettingsModal = ({ onClose }) => {
    const { user, logout, updateUser } = useAuth();
    const {
        soundEnabled, setSoundEnabled,
        notificationsEnabled, setNotificationsEnabled
    } = useSettings();

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [editBio, setEditBio] = useState(user?.bio || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            logout();
            onClose();
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('/api/auth/update-profile', {
                name: editName,
                bio: editBio
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            updateUser(res.data.user);
            setIsEditing(false);
        } catch (error) {
            console.error("Profile update failed", error);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#18181b] w-full max-w-md rounded-2xl border border-[#27272a] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">

                {/* Header */}
                <div className="p-5 border-b border-[#27272a] flex justify-between items-center bg-[#202023]">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Profile Section */}
                    <div className="flex flex-col gap-4 p-4 bg-[#202023] rounded-xl border border-[#2f2f35]">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-blue-500/50 flex-shrink-0">
                                <img
                                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || user?.name}&background=random`}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-[#2a2a2e] text-white border border-[#3f3f46] rounded p-1.5 text-sm focus:outline-none focus:border-blue-500"
                                            placeholder="Display Name"
                                        />
                                        <input
                                            type="text"
                                            value={editBio}
                                            onChange={(e) => setEditBio(e.target.value)}
                                            className="w-full bg-[#2a2a2e] text-gray-300 border border-[#3f3f46] rounded p-1.5 text-xs focus:outline-none focus:border-blue-500"
                                            placeholder="About / Bio"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className="font-bold text-lg text-white truncate">{user?.name || user?.username || 'User'}</h3>
                                        <p className="text-sm text-gray-400 truncate">{user?.email}</p>
                                        {user?.bio && <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{user.bio}</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-white/5">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition font-bold"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 hover:text-blue-300 transition font-medium border border-white/5"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Preferences</h4>

                        <div
                            className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition cursor-pointer"
                            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${notificationsEnabled ? 'bg-green-500/20 text-green-500' : 'bg-gray-700/50 text-gray-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                </div>
                                <div>
                                    <div className="text-gray-200 font-medium">Notifications</div>
                                    <div className="text-xs text-gray-500">Show message alerts</div>
                                </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </div>

                        <div
                            className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition cursor-pointer"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${soundEnabled ? 'bg-purple-500/20 text-purple-500' : 'bg-gray-700/50 text-gray-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                </div>
                                <div>
                                    <div className="text-gray-200 font-medium">Sound</div>
                                    <div className="text-xs text-gray-500">Play sound on incoming message</div>
                                </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${soundEnabled ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-[#27272a] my-2"></div>

                    {/* Actions */}
                    <button
                        onClick={handleLogout}
                        className="w-full p-3.5 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white flex items-center justify-center gap-2 font-bold transition-all cursor-pointer group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Sign Out
                    </button>

                    <div className="text-center text-xs text-gray-600 pt-2">
                        LinkUp Desktop v1.0.3
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
