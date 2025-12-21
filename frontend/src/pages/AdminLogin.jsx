import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const { setAuth } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/auth/admin-login', { email, password, secretKey });
            setAuth(res.data.token, res.data.user);
            toast.success('Admin access granted.');
            navigate('/admin');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Admin login failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                        Admin Portal
                    </h1>
                    <p className="text-gray-400 text-sm mt-2">Restricted Access</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-2">Secret Key</label>
                        <input
                            type="password"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                            placeholder="Enter Admin Secret Key"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 rounded-lg shadow-lg transform hover:-translate-y-0.5 transition-all"
                    >
                        Authenticate
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-gray-500 hover:text-gray-400 text-sm"
                    >
                        Return to User Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
