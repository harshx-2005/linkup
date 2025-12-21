const { User, Message, Conversation, ConversationMember, Block, sequelize } = require('../models');
const { Op } = require('sequelize');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteUser = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting yourself (optional safety, though frontend might catch it)
        if (req.user && req.user.id === parseInt(id)) {
            await t.rollback();
            return res.status(400).json({ message: 'Cannot delete your own admin account' });
        }

        // 1. Remove from all conversations (Membership)
        await ConversationMember.destroy({ where: { userId: id }, transaction: t });

        // 2. Delete all their messages
        await Message.destroy({ where: { senderId: id }, transaction: t });

        // 3. Delete Blocks (both directions)
        await Block.destroy({
            where: {
                [Op.or]: [{ blockerId: id }, { blockedId: id }]
            },
            transaction: t
        });

        // 4. Unlink created conversations
        await Conversation.update({ createdBy: null }, { where: { createdBy: id }, transaction: t });

        // 5. Delete User
        await user.destroy({ transaction: t });

        await t.commit();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        await t.rollback();
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Server error during deletion', error: error.message });
    }
};

const getSystemStats = async (req, res) => {
    try {
        const userCount = await User.count();
        const messageCount = await Message.count();
        const conversationCount = await Conversation.count();

        res.json({
            users: userCount,
            messages: messageCount,
            conversations: conversationCount,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllUsers,
    deleteUser,
    getSystemStats,
};
