import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import OtpVerification from '../components/OtpVerification';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otpEmail, setOtpEmail] = useState(''); // Stores email when OTP screen needs to be shown
    const { register } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await register(name, email, password);
            if (res.isVerified === false) {
                setOtpEmail(res.email || email);
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // If OTP verification is needed, render OtpVerification card
    if (otpEmail) {
        return (
            <div className="min-h-screen flex items-center justify-center relative p-4 overflow-hidden">
                <OtpVerification
                    email={otpEmail}
                    onVerifySuccess={() => navigate('/')}
                    onBack={() => setOtpEmail('')}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative p-4 overflow-hidden">
            {/* Ambient Ambient Glow Circles */}
            <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
            <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

            <div className="bg-[#121215]/80 backdrop-blur-2xl p-8 rounded-3xl border border-white/5 shadow-2xl w-full max-w-md relative overflow-hidden transition-all duration-300">
                <div className="absolute -right-16 -top-16 w-36 h-36 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                        LinkUp
                    </h1>
                    <p className="text-gray-400 text-sm mt-2">
                        Create an account to start messaging in real-time
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-6 text-center animate-pulse">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition text-sm"
                            placeholder="John Doe"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition text-sm"
                            placeholder="name@example.com"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition text-sm"
                            placeholder="••••••••"
                            required
                            minLength="6"
                            disabled={loading}
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 px-4 rounded-2xl font-bold text-white shadow-lg transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer ${
                            loading
                                ? 'bg-blue-600/50 cursor-not-allowed opacity-75'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98] shadow-blue-500/10 hover:shadow-blue-500/20'
                        }`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Registering...</span>
                            </>
                        ) : (
                            <span>Register</span>
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                    Already have an account? <Link to="/login" className="text-blue-400 font-bold hover:underline transition">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
