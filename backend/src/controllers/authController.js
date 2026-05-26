const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendOtpEmail } = require('../services/emailService');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(400).json({ message: 'User already exists.' });
            }
            // User exists but is not verified, update record with new info and new OTP
            const hashedPassword = await bcrypt.hash(password, 10);
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

            existingUser.name = name;
            existingUser.password = hashedPassword;
            existingUser.otpCode = otp;
            existingUser.otpExpires = otpExpires;
            await existingUser.save();

            await sendOtpEmail(email, otp, 'verification');

            return res.status(200).json({
                message: 'Verification OTP sent to your email.',
                isVerified: false,
                email: existingUser.email
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            isVerified: false,
            otpCode: otp,
            otpExpires: otpExpires
        });

        await sendOtpEmail(email, otp, 'verification');

        res.status(201).json({
            message: 'Verification OTP sent to your email.',
            isVerified: false,
            email: user.email
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const adminLogin = async (req, res) => {
    try {
        const { email, password, secretKey } = req.body;

        if (secretKey !== process.env.ADMIN_SECRET_KEY) {
            return res.status(403).json({ message: 'Invalid Admin Secret Key.' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Not an admin account.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Update status to online (and lastSeen)
        try {
            await User.update({ status: 'online', lastSeen: new Date() }, { where: { id: user.id } });
        } catch (err) {
            console.error("Error updating user status:", err);
        }

        res.json({
            message: 'Admin Login successful.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        if (!user.isVerified) {
            // Re-generate OTP and resend
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

            user.otpCode = otp;
            user.otpExpires = otpExpires;
            await user.save();

            await sendOtpEmail(user.email, otp, 'verification');

            return res.status(200).json({
                message: 'Email not verified. A verification OTP has been sent to your email.',
                isVerified: false,
                email: user.email
            });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Update status to online (and lastSeen)
        try {
            await User.update({ status: 'online', lastSeen: new Date() }, { where: { id: user.id } });
        } catch (err) {
            console.error("Error updating user status:", err);
            // Don't block login if status update fails
        }

        res.json({
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role, // Added role here too for consistency
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getMe = async (req, res) => {
    try {
        // Fetch fresh plain object to avoid serialization issues with middleware instance
        // req.user.id comes from middleware (which decoded token)
        const user = await User.findByPk(req.user.id, { raw: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove safety fields
        delete user.password;

        res.json(user);
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, bio } = req.body;
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        if (bio !== undefined) user.bio = bio; // Allow empty string

        await user.save();

        res.json({
            message: 'Profile updated successfully.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }

        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ message: 'Invalid OTP code.' });
        }

        if (new Date() > new Date(user.otpExpires)) {
            return res.status(400).json({ message: 'OTP has expired.' });
        }

        // Activate User
        user.isVerified = true;
        user.otpCode = null;
        user.otpExpires = null;
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'OTP verified successfully.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User is already verified.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        user.otpCode = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await sendOtpEmail(user.email, otp, 'verification');

        res.json({ message: 'OTP code sent successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'User with this email does not exist.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        user.otpCode = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await sendOtpEmail(user.email, otp, 'reset');

        res.json({ message: 'Password reset OTP sent to your email.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }

        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ message: 'Invalid OTP code.' });
        }

        if (new Date() > new Date(user.otpExpires)) {
            return res.status(400).json({ message: 'OTP has expired.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.otpCode = null;
        user.otpExpires = null;
        user.isVerified = true; // Auto verify user
        await user.save();

        res.json({ message: 'Password reset successfully. You can now login.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = {
    register,
    login,
    adminLogin,
    getMe,
    updateProfile,
    verifyOtp,
    resendOtp,
    forgotPassword,
    resetPassword,
};
