import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const OtpVerification = ({ email, onVerifySuccess, onBack }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timer, setTimer] = useState(60);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const inputsRef = useRef([]);

    const { verifyOtp, resendOtp } = useAuth();

    // Timer Countdown
    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [timer]);

    // Focus first input on mount
    useEffect(() => {
        if (inputsRef.current[0]) {
            inputsRef.current[0].focus();
        }
    }, []);

    const handleChange = (e, index) => {
        const value = e.target.value;
        if (isNaN(Number(value))) return; // Only allow numbers

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1); // Get last character
        setOtp(newOtp);
        setError('');

        // Move focus to next input if filled
        if (value && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace') {
            setError('');
            if (!otp[index] && index > 0) {
                // If current input is empty, clear previous input and focus it
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                inputsRef.current[index - 1]?.focus();
            } else if (otp[index]) {
                // Clear current input
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            }
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').trim();
        if (/^\d{6}$/.test(text)) {
            const digits = text.split('');
            setOtp(digits);
            setError('');
            inputsRef.current[5]?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length < 6) {
            setError('Please enter all 6 digits.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const res = await verifyOtp(email, otpCode);
            setSuccessMessage(res.message || 'Verification successful!');
            setTimeout(() => {
                onVerifySuccess(res);
            }, 800);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Please try again.');
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
            await resendOtp(email);
            setSuccessMessage('A new OTP has been sent to your email.');
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
        <div className="w-full max-w-md mx-auto bg-gray-900/60 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
            {/* Ambient Background Glow */}
            <div className="absolute -right-16 -top-16 w-36 h-36 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Back Button */}
            <button
                onClick={onBack}
                className="absolute top-6 left-6 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition cursor-pointer"
                title="Go Back"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </button>

            <div className="text-center mt-6 mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/20 text-blue-400 text-2xl font-bold mb-4 shadow-lg">
                    ✉️
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Verify Your Email</h2>
                <p className="text-sm text-gray-400 mt-2 px-4 leading-relaxed">
                    We sent a 6-digit code to <span className="text-blue-400 font-semibold">{email}</span>. Please enter it below.
                </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl mb-6 text-center animate-pulse">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs px-4 py-3 rounded-xl mb-6 text-center">
                    {successMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex justify-between items-center gap-2 px-1">
                    {otp.map((digit, idx) => (
                        <input
                            key={idx}
                            ref={el => inputsRef.current[idx] = el}
                            type="text"
                            inputMode="numeric"
                            maxLength="1"
                            value={digit}
                            onChange={(e) => handleChange(e, idx)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            onPaste={handlePaste}
                            className="w-12 h-14 text-center text-xl font-bold rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 shadow-inner"
                            disabled={loading}
                        />
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={loading || otp.includes('')}
                    className={`w-full py-3.5 px-4 rounded-2xl font-bold text-white shadow-lg transition-all duration-300 relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer ${
                        loading || otp.includes('')
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
                            <span>Verifying...</span>
                        </>
                    ) : (
                        <span>Verify OTP</span>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center text-sm">
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
    );
};

export default OtpVerification;
