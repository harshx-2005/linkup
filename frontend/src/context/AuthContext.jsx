import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await axios.get('/api/auth/me', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setUser(res.data);
                } catch (error) {
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkUser();
    }, []);

    const login = async (email, password) => {
        const res = await axios.post('/api/auth/login', { email, password });
        if (res.data.isVerified !== false) {
            localStorage.setItem('token', res.data.token);
            setUser(res.data.user);
        }
        return res.data;
    };

    const register = async (name, email, password) => {
        const res = await axios.post('/api/auth/register', { name, email, password });
        if (res.data.isVerified !== false) {
            localStorage.setItem('token', res.data.token);
            setUser(res.data.user);
        }
        return res.data;
    };

    const verifyOtp = async (email, otp) => {
        const res = await axios.post('/api/auth/verify-otp', { email, otp });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const resendOtp = async (email) => {
        const res = await axios.post('/api/auth/resend-otp', { email });
        return res.data;
    };

    const forgotPassword = async (email) => {
        const res = await axios.post('/api/auth/forgot-password', { email });
        return res.data;
    };

    const resetPassword = async (email, otp, newPassword) => {
        const res = await axios.post('/api/auth/reset-password', { email, otp, newPassword });
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    const setAuth = (token, userData) => {
        localStorage.setItem('token', token);
        setUser(userData);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, setAuth, verifyOtp, resendOtp, forgotPassword, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
};
