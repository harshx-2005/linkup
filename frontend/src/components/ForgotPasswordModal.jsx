import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const ForgotPasswordModal = ({ onClose, onResetSuccess }) => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [timer, setTimer] = useState(60);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    const { forgotPassword, resetPassword, resendOtp } = useAuth();
    const inputsRef = useRef([]);

    // Timer Countdown for Step 2
    useEffect(() => {
        let interval = null;
        if (step === 2 && timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    // Focus OTP input on Step 2 transition
    useEffect(() => {
        if (step === 2 && inputsRef.current[0]) {
            inputsRef.current[0].focus();
        }
    }, [step]);

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setError('');
        try {
            await forgotPassword(email);
            setStep(2);
            setTimer(60);
            setSuccessMessage('Password reset OTP sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Please verify your email.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (e, index) => {
        const value = e.target.value;
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);
        setError('');

        if (value && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (e, index) => {
        if (e.key === 'Backspace') {
            setError('');
            if (!otp[index] && index > 0) {
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                inputsRef.current[index - 1]?.focus();
            } else if (otp[index]) {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            }
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').trim();
        if (/^\d{6}$/.test(text)) {
            const digits = text.split('');
            setOtp(digits);
            setError('');
            inputsRef.current[5]?.focus();
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length < 6) {
            setError('Please enter all 6 OTP digits.');
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            await resetPassword(email, otpCode, newPassword);
            setSuccessMessage('Password reset successful!');
            setTimeout(() => {
                onResetSuccess();
                onClose();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Please check OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;
        setResending(true);
        setError('');
        setSuccessMessage('');
        try {
            await forgotPassword(email); // Re-trigger forgotPassword for reset OTP
            setSuccessMessage('A new reset OTP has been sent to your email.');
            setTimer(60);
            setOtp(['', '', '', '', '', '']);
            inputsRef.current[0]?.focus();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#121215]/95 border border-white/5 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95">
                {/* Ambient Background Glow */}
                <div className="absolute -right-16 -top-16 w-36 h-36 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition cursor-pointer"
                    title="Close"
                    disabled={loading}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {step === 1 ? (
                    <div>
                        <div className="text-center mt-4 mb-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/20 text-blue-400 text-2xl font-bold mb-4 shadow-lg">
                                🔑
                            </div>
                            <h2 className="text-2xl font-extrabold text-white tracking-tight">Forgot Password?</h2>
                            <p className="text-sm text-gray-400 mt-2 px-4 leading-relaxed">
                                Enter your email and we'll send you an OTP to reset your password.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-4 text-center animate-pulse">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm font-semibold mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition text-sm"
                                    placeholder="yourname@example.com"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-white shadow-lg transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer ${
                                    loading || !email
                                        ? 'bg-blue-600/50 cursor-not-allowed opacity-75'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98]'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Sending OTP...</span>
                                    </>
                                ) : (
                                    <span>Send OTP Code</span>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div>
                        <div className="text-center mt-4 mb-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/20 text-blue-400 text-2xl font-bold mb-4 shadow-lg">
                                ✉️
                            </div>
                            <h2 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h2>
                            <p className="text-sm text-gray-400 mt-2 px-4 leading-relaxed">
                                Enter the OTP code sent to <span className="text-blue-400 font-semibold">{email}</span> and your new password.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-4 text-center animate-pulse">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-4 py-3 rounded-xl mb-4 text-center">
                                {successMessage}
                            </div>
                        )}

                        <form onSubmit={handleResetSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm font-semibold mb-2">Enter OTP</label>
                                <div className="flex justify-between items-center gap-2 mb-4">
                                    {otp.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={el => inputsRef.current[idx] = el}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handleOtpChange(e, idx)}
                                            onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                                            onPaste={handleOtpPaste}
                                            className="w-10 h-12 text-center text-lg font-bold rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition shadow-inner"
                                            disabled={loading}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm font-semibold mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition text-sm"
                                    placeholder="Minimum 6 characters"
                                    required
                                    minLength="6"
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.includes('') || !newPassword}
                                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-white shadow-lg transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer ${
                                    loading || otp.includes('') || !newPassword
                                        ? 'bg-blue-600/50 cursor-not-allowed opacity-75'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.98]'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Resetting Password...</span>
                                    </>
                                ) : (
                                    <span>Reset Password</span>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm">
                            <span className="text-gray-400">Didn't receive the code? </span>
                            {timer > 0 ? (
                                <span className="text-gray-500 font-medium">
                                    Resend in <span className="text-blue-400 font-semibold">{timer}s</span>
                                </span>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    disabled={resending}
                                    className="text-blue-400 hover:text-blue-300 font-bold hover:underline transition focus:outline-none cursor-pointer"
                                >
                                    {resending ? 'Sending...' : 'Resend OTP'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordModal;
