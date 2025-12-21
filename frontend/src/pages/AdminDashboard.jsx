import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import socket from '../socket/socket';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, messages: 0, conversations: 0 });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        fetchData();

        // Socket connection for real-time updates
        if (!socket.connected) {
            socket.on('connect', () => {
                console.log('Connected to socket in Admin Dashboard');
            });
            socket.connect();
        }

        const handleUserOnline = (userId) => {
            setUsers(prevUsers => prevUsers.map(u =>
                u.id === userId ? { ...u, status: 'online' } : u
            ));
        };

        const handleUserOffline = (userId) => {
            setUsers(prevUsers => prevUsers.map(u =>
                u.id === userId ? { ...u, status: 'offline' } : u
            ));
        };

        socket.on('user_online', handleUserOnline);
        socket.on('user_offline', handleUserOffline);

        return () => {
            socket.off('user_online', handleUserOnline);
            socket.off('user_offline', handleUserOffline);
            // Don't disconnect here if we want to keep it persistent, or maybe we should?
            // Usually dashboard might share socket instance.
        };
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const statsRes = await axios.get('/api/admin/stats', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const usersRes = await axios.get('/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            if (error.response?.status === 403) {
                alert('Access denied. Admin only.');
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(users.filter(u => u.id !== userId));
            alert('User deleted successfully');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <div className="flex gap-3">
                        <button onClick={() => navigate('/')} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded flex items-center gap-2 transition group">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                            Back to Chat
                        </button>
                        <button onClick={logout} className="bg-red-800 hover:bg-red-700 active:bg-red-900 px-4 py-2 rounded text-red-100 font-bold border border-red-900/50 flex items-center gap-2 transition group">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                            </svg>
                            Log Out
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-gray-400 text-sm uppercase font-bold mb-2">Total Users</h3>
                        <p className="text-4xl font-bold text-blue-400">{stats.users}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-gray-400 text-sm uppercase font-bold mb-2">Total Messages</h3>
                        <p className="text-4xl font-bold text-green-400">{stats.messages}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-gray-400 text-sm uppercase font-bold mb-2">Total Conversations</h3>
                        <p className="text-4xl font-bold text-purple-400">{stats.conversations}</p>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold">User Management</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-700 text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Joined</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-750">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 overflow-hidden">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                                                            {user.name[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-medium">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-purple-900 text-purple-300' : 'bg-gray-700 text-gray-300'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${user.status === 'online' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="text-red-400 hover:text-red-300 font-medium text-sm"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
