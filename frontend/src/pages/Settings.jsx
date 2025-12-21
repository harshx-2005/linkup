import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Settings = () => {
    const { user, updateUser, logout } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'privacy'
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const [blockedUsers, setBlockedUsers] = useState([]);

    // ... existing handleFileSelect ...

    useEffect(() => {
        if (activeTab === 'privacy') {
            fetchBlockedUsers();
        }
    }, [activeTab]);

    const fetchBlockedUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/blocks', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBlockedUsers(res.data);
        } catch (error) {
            console.error("Error fetching blocked users:", error);
        }
    };

    const handleUnblock = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/blocks/unblock', { blockedId: userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("User unblocked");
            setBlockedUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error("Error unblocking:", error);
            toast.error("Failed to unblock");
        }
    };

    const handleFileSelect = async (e) => {
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
            setAvatar(res.data.url);
            toast.success("Avatar uploaded! Don't forget to save.");
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Avatar upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('/api/users/profile', {
                name,
                bio,
                avatar,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            updateUser(res.data);
            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex">
            {/* Sidebar Navigation for Settings */}
            <div className="w-1/4 bg-gray-800 border-r border-gray-700 flex flex-col p-6">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-gray-400 hover:text-white mb-8 transition group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    Back to Chat
                </button>
                <h1 className="text-2xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                    Settings
                </h1>

                {user?.role === 'admin' && (
                    <button
                        onClick={() => navigate('/admin')}
                        className="w-full text-left px-4 py-3 mb-4 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-200 border border-red-900/50 transition-all font-bold flex items-center gap-2"
                    >
                        <span>🛡️</span> Admin Dashboard
                    </button>
                )}

                <nav className="space-y-2 flex-1">
                    {['profile', 'privacy'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-all ${activeTab === tab
                                ? 'bg-gray-700 text-white font-medium shadow-lg'
                                : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </nav>

                <div className="mt-8 pt-4 border-t border-gray-700">
                    <button
                        onClick={logout}
                        className="w-full text-left px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/10 hover:text-red-300 transition flex items-center gap-3 font-medium group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                        </svg>
                        Log Out
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-10 overflow-y-auto">
                <div className="max-w-3xl mx-auto">
                    {activeTab === 'profile' && (
                        <div className="animate-fade-in">
                            <h2 className="text-3xl font-bold mb-1">Edit Profile</h2>
                            <p className="text-gray-400 mb-8">Customize how others see you.</p>

                            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {/* Avatar Section */}
                                    <div className="flex items-center gap-8">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-700 group-hover:border-blue-500 transition-all bg-gray-600">
                                                {avatar ? (
                                                    <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                                                        {name[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                <span className="text-xs font-bold">CHANGE</span>
                                            </div>
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{name || 'User'}</h3>
                                            <p className="text-gray-400 text-sm mb-3">
                                                {avatar ? 'Custom avatar uploaded' : 'Default avatar'}
                                            </p>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileSelect}
                                                accept="image/*"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-6">
                                        <div>
                                            <label className="block text-gray-400 text-sm font-medium mb-2">Display Name</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                                placeholder="Enter your name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-gray-400 text-sm font-medium mb-2">Bio / Status</label>
                                            <textarea
                                                value={bio}
                                                onChange={(e) => setBio(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition h-32 resize-none"
                                                placeholder="Tell us a bit about yourself..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-700 flex justify-end">
                                        <button
                                            type="submit"
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transform hover:-translate-y-0.5 transition-all"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="animate-fade-in">
                            <h2 className="text-3xl font-bold mb-1">Privacy & Security</h2>
                            <p className="text-gray-400 mb-8">Manage your interactions.</p>

                            <div className="space-y-6">
                                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                    <h3 className="text-lg font-semibold mb-2">Direct Message Requests</h3>
                                    <p className="text-gray-400 text-sm mb-4">Decide who can message you.</p>
                                    <div className="p-4 bg-gray-900 rounded-lg text-center text-gray-500">
                                        You have 0 pending requests.
                                    </div>
                                </div>

                                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                                    <h3 className="text-lg font-semibold mb-2">Blocked Users</h3>
                                    <p className="text-gray-400 text-sm mb-4">Users you have blocked cannot contact you.</p>

                                    {blockedUsers.length === 0 ? (
                                        <div className="p-4 bg-gray-900 rounded-lg text-center text-gray-500">
                                            No blocked users.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {blockedUsers.map(user => (
                                                <div key={user.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={user.avatar || 'https://placehold.co/40'}
                                                            alt={user.name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                        <span className="font-semibold text-white">{user.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnblock(user.id)}
                                                        className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded transition"
                                                    >
                                                        Unblock
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
