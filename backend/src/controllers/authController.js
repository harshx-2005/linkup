const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully.',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            },
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

module.exports = {
    register,
    login,
    adminLogin,
    getMe,
    updateProfile,
};
