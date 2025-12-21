const { User } = require('../models');
const { Op } = require('sequelize');

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, bio, avatar } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (name) user.name = name;
        if (bio) user.bio = bio;
        if (avatar) user.avatar = avatar;

        await user.save();

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            status: user.status,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getUsers = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { search } = req.query;

        const whereClause = {
            id: { [Op.ne]: currentUserId }, // Exclude current user
        };

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const users = await User.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'avatar', 'email'],
        });

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = {
    updateProfile,
    getUsers,
};
