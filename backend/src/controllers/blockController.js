const { Block, User, Conversation, ConversationMember } = require('../models');
const { Op } = require('sequelize');

const blockUser = async (req, res) => {
    try {
        const blockerId = req.user.id;
        const { blockedId } = req.body;

        if (blockerId == blockedId) {
            return res.status(400).json({ message: "You cannot block yourself." });
        }

        const existingBlock = await Block.findOne({ where: { blockerId, blockedId } });
        if (existingBlock) {
            return res.status(400).json({ message: "User is already blocked." });
        }

        await Block.create({ blockerId, blockedId });

        res.json({ message: "User blocked successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};

const unblockUser = async (req, res) => {
    try {
        const blockerId = req.user.id;
        const { blockedId } = req.body;

        const deleted = await Block.destroy({ where: { blockerId, blockedId } });
        if (!deleted) {
            return res.status(400).json({ message: "User was not blocked." });
        }

        res.json({ message: "User unblocked successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};

const getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const blocked = await Block.findAll({
            where: { blockerId: userId },
            include: [{
                model: User,
                as: 'Blocked',
                attributes: ['id', 'name', 'avatar']
            }]
        });

        res.json(blocked.map(b => b.Blocked));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};

module.exports = { blockUser, unblockUser, getBlockedUsers };
