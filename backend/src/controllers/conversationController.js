const { Conversation, ConversationMember, User, Message } = require('../models');
const { Op } = require('sequelize');

const getMessagePreview = (msg) => {
    if (!msg) return null;
    if (msg.deletedForEveryone) return 'This message was deleted';
    if (msg.messageType === 'text') return msg.content;
    if (msg.messageType === 'image') return '📷 Image';
    if (msg.messageType === 'video') return '🎥 Video';
    if (msg.messageType === 'audio') return '🎵 Audio';
    if (msg.messageType === 'file') return '📄 File';
    if (msg.messageType === 'system') return msg.content;
    return 'Message';
};

const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Find all conversation IDs for the user
        const memberships = await ConversationMember.findAll({
            where: { userId },
            attributes: ['conversationId'],
        });
        const conversationIds = memberships.map(m => m.conversationId);

        if (conversationIds.length === 0) {
            return res.json([]);
        }

        // 2. Fetch conversations with details
        const conversations = await Conversation.findAll({
            where: { id: conversationIds },
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'avatar', 'status', 'lastSeen', 'email'],
                    through: { attributes: ['role', 'isAdmin'] }, // Include role from join table
                }
            ],
        });

        // Format response
        const formattedConversations = await Promise.all(conversations.map(async (conv) => {
            const otherUser = conv.Users.find((u) => u.id != userId);

            // Fetch true last message reliably (check top 10 to skip deleted ones)
            const recentMessages = await Message.findAll({
                where: { conversationId: conv.id },
                order: [['createdAt', 'DESC']],
                limit: 10
            });

            let lastMessage = null;
            for (const msg of recentMessages) {
                const deletedBy = msg.deletedBy || [];
                if (!deletedBy.includes(userId)) {
                    lastMessage = msg;
                    break;
                }
            }

            // Calculate unread count (fetch all messages for this conv where sender is not me)
            // Note: Optimally this should be a DB query with JSON operator, but for compatibility we filter in JS
            const allMessages = await Message.findAll({
                where: {
                    conversationId: conv.id,
                    senderId: { [Op.ne]: userId }
                },
                attributes: ['seenBy']
            });

            const unreadCount = allMessages.filter(msg => {
                const seenBy = msg.seenBy || [];
                return !seenBy.includes(userId) && !seenBy.includes(String(userId));
            }).length;

            return {
                id: conv.id,
                name: conv.isGroup ? conv.groupName : otherUser?.name,
                avatar: conv.isGroup ? conv.groupImage : otherUser?.avatar,
                isGroup: conv.isGroup,
                lastMessage: getMessagePreview(lastMessage),
                lastMessageTime: lastMessage ? lastMessage.createdAt : null,
                otherUserId: otherUser?.id,
                email: otherUser?.email,
                status: otherUser?.status,
                lastSeen: otherUser?.lastSeen,
                members: conv.Users.map(u => ({
                    id: u.id,
                    name: u.name,
                    avatar: u.avatar,
                    status: u.status,
                    lastSeen: u.lastSeen,
                    role: u.ConversationMember ? u.ConversationMember.role : 'member',
                    isAdmin: (u.ConversationMember && u.ConversationMember.role === 'admin') || (u.ConversationMember && u.ConversationMember.isAdmin)
                })),
                createdBy: conv.createdBy,
                groupImage: conv.groupImage,
                groupName: conv.groupName,
                unreadCount: unreadCount || 0,
                requestStatus: conv.status
            };
        }));


        // Sort by last message time
        formattedConversations.sort((a, b) => {
            const dateA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
            const dateB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
            return dateB - dateA;
        });

        // Deduplicate private conversations (in case of DB anomalies)
        const uniqueConversations = [];
        const seenParticipants = new Set();

        for (const conv of formattedConversations) {
            if (!conv.isGroup) {
                if (conv.otherUserId && seenParticipants.has(String(conv.otherUserId))) {
                    continue;
                }
                if (conv.otherUserId) seenParticipants.add(String(conv.otherUserId));
            }
            uniqueConversations.push(conv);
        }

        res.json(uniqueConversations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createPrivateConversation = async (req, res) => {
    try {
        const { userId } = req.body; // Target user ID
        const currentUserId = req.user.id;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Restriction: Normal users cannot start chat with Admin
        if (req.user.role !== 'admin') {
            const targetUser = await User.findByPk(userId);
            if (targetUser && targetUser.role === 'admin') {
                return res.status(403).json({ message: 'You cannot initiate a chat with an Admin.' });
            }
        }

        console.log(`Creating private chat between ${currentUserId} and ${userId}`);

        // Check if conversation already exists
        // ... (existing logic) ...
        // Better approach for checking existence:
        // Find all conversation IDs for current user
        const user1Convs = await ConversationMember.findAll({ where: { userId: currentUserId } });
        const user1ConvIds = user1Convs.map(c => c.conversationId);

        // Find if target user is in any of these conversations which are not groups
        const commonConv = await ConversationMember.findOne({
            where: {
                userId: userId,
                conversationId: { [Op.in]: user1ConvIds },
            },
            include: [{
                model: Conversation,
                where: { isGroup: false }
            }]
        });

        if (commonConv) {
            const existingConvId = commonConv.conversationId;
            // Fetch details to return
            const fullConv = await Conversation.findByPk(existingConvId, {
                include: [
                    {
                        model: User,
                        attributes: ['id', 'name', 'avatar', 'status'],
                        through: { attributes: [] },
                    }
                ]
            });

            const targetUserId = parseInt(userId);
            const otherUser = fullConv.Users.find(u => u.id === targetUserId);

            const formattedConv = {
                id: fullConv.id,
                name: otherUser?.name || 'Unknown User',
                avatar: otherUser?.avatar,
                isGroup: false,
                lastMessage: null, // Returning null is okay for checking specific user, but ideally we should fetch it. 
                // For simplicity in this logic, we'll leave it null or client will fetch messages and update sidebar. 
                // But better to at least be consistent with getConversations if possible. 
                // Let's stick to null here as the user will likely select it and fetch messages.
                // Or better, let's try to get it if we can, but that requires extra query. 
                // Given the user constraint, let's leave as is for now unless requested.
                lastMessage: null,
                lastMessageTime: fullConv.createdAt,
                otherUserId: otherUser?.id,
                status: otherUser?.status,
                requestStatus: fullConv.status,
            };
            return res.json(formattedConv);
        }

        // Create new conversation
        const conversation = await Conversation.create({
            isGroup: false,
            createdBy: currentUserId,
            status: 'pending'
        });
        await ConversationMember.bulkCreate([
            { conversationId: conversation.id, userId: currentUserId },
            { conversationId: conversation.id, userId: userId },
        ]);

        // Fetch details to return
        const newConv = await Conversation.findByPk(conversation.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'avatar', 'status'],
                    through: { attributes: [] },
                }
            ]
        });

        if (!newConv) {
            throw new Error('Failed to fetch created conversation');
        }

        // Ensure userId is integer for comparison
        const targetUserId = parseInt(userId);
        const otherUser = newConv.Users.find(u => u.id === targetUserId);

        console.log('New Private Chat Created:', {
            id: newConv.id,
            targetUserId,
            foundUser: !!otherUser
        });

        const formattedConv = {
            id: newConv.id,
            name: otherUser?.name || 'Unknown User',
            avatar: otherUser?.avatar,
            isGroup: false,
            lastMessage: null,
            lastMessageTime: newConv.createdAt,
            otherUserId: otherUser?.id,
            status: otherUser?.status,
        };

        res.status(201).json(formattedConv);
    } catch (error) {
        console.error('Error in createPrivateConversation:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const createGroupConversation = async (req, res) => {
    try {
        const { name, memberIds, groupImage } = req.body; // memberIds is array of userIds
        const currentUserId = req.user.id;

        if (!name || !memberIds || memberIds.length === 0) {
            return res.status(400).json({ message: 'Group name and members are required.' });
        }

        // Restriction: Normal users cannot add Admin to group
        if (req.user.role !== 'admin') {
            const adminMembers = await User.count({
                where: {
                    id: memberIds,
                    role: 'admin',
                },
            });

            if (adminMembers > 0) {
                return res.status(403).json({ message: 'You cannot add Admins to a group.' });
            }
        }

        const conversation = await Conversation.create({
            isGroup: true,
            groupName: name,
            groupImage: groupImage || null,
            createdBy: currentUserId,
        });

        const members = [
            { conversationId: conversation.id, userId: currentUserId, isAdmin: true },
            ...memberIds.map(id => ({ conversationId: conversation.id, userId: id, isAdmin: false }))
        ];

        await ConversationMember.bulkCreate(members);

        // System message: Group created
        const creator = await User.findByPk(currentUserId);
        await Message.create({
            conversationId: conversation.id,
            senderId: currentUserId,
            content: `Group "${name}" created by ${creator.name}`,
            messageType: 'system',
        });

        // Fetch details
        const newConv = await Conversation.findByPk(conversation.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'avatar'],
                    through: { attributes: [] },
                }
            ]
        });

        const formattedConv = {
            id: newConv.id,
            name: newConv.groupName,
            avatar: newConv.groupImage,
            isGroup: true,
            lastMessage: `Group "${name}" created by ${creator.name}`,
            lastMessageTime: newConv.createdAt,
            members: newConv.Users,
            createdBy: newConv.createdBy,
            groupImage: newConv.groupImage,
            groupName: newConv.groupName
        };

        res.status(201).json(formattedConv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addGroupMember = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req.body;
        const requesterId = req.user.id;

        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation || !conversation.isGroup) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (conversation.createdBy !== requesterId) {
            return res.status(403).json({ message: 'Only admin can add members' });
        }

        const existingMember = await ConversationMember.findOne({
            where: { conversationId, userId },
        });

        if (existingMember) {
            return res.status(400).json({ message: 'User already in group' });
        }

        await ConversationMember.create({ conversationId, userId });

        const userAdded = await User.findByPk(userId, { attributes: ['id', 'name', 'avatar'] });
        const requester = await User.findByPk(requesterId);

        // System message
        await Message.create({
            conversationId,
            senderId: requesterId,
            content: `${requester.name} added ${userAdded.name}`,
            messageType: 'system',
        });

        res.json(userAdded);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const removeGroupMember = async (req, res) => {
    try {
        const { conversationId, userId } = req.params;
        const requesterId = req.user.id;

        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation || !conversation.isGroup) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (conversation.createdBy !== requesterId) {
            return res.status(403).json({ message: 'Only admin can remove members' });
        }

        await ConversationMember.destroy({
            where: { conversationId, userId },
        });

        const userRemoved = await User.findByPk(userId);
        const requester = await User.findByPk(requesterId);

        // System message
        await Message.create({
            conversationId,
            senderId: requesterId,
            content: `${requester.name} removed ${userRemoved.name}`,
            messageType: 'system',
        });

        res.json({ success: true, userId: parseInt(userId) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const leaveGroup = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const member = await ConversationMember.findOne({ where: { conversationId, userId } });
        if (!member) {
            return res.status(404).json({ message: 'You are not a member of this group' });
        }

        // Auto-promote logic if admin leaves
        if (member.role === 'admin' || member.isAdmin) {
            const otherAdmins = await ConversationMember.count({
                where: {
                    conversationId,
                    userId: { [Op.ne]: userId },
                    [Op.or]: [{ role: 'admin' }, { isAdmin: true }]
                }
            });

            if (otherAdmins === 0) {
                // Promote oldest member
                const nextAdmin = await ConversationMember.findOne({
                    where: { conversationId, userId: { [Op.ne]: userId } },
                    order: [['createdAt', 'ASC']]
                });
                if (nextAdmin) {
                    nextAdmin.role = 'admin';
                    nextAdmin.isAdmin = true;
                    await nextAdmin.save();
                }
            }
        }

        await ConversationMember.destroy({
            where: { conversationId, userId },
        });

        const remainingMembers = await ConversationMember.count({ where: { conversationId } });
        if (remainingMembers === 0) {
            await Conversation.destroy({ where: { id: conversationId } });
            await Message.destroy({ where: { conversationId } });
        }

        res.json({ message: 'Left group successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const acceptConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Only the receiver can accept (requestor is createdBy)
        if (conversation.createdBy === userId) {
            return res.status(400).json({ message: 'You cannot accept your own request.' });
        }

        conversation.status = 'accepted';
        await conversation.save();

        res.json({ message: 'Conversation accepted.', conversationId: conversation.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const rejectConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Only the receiver can reject/delete (or admin? or sender can cancel?)
        // Let's allow receiver to reject (delete) or sender to cancel (delete)
        if (conversation.createdBy !== userId) {
            // Ensure user is member
            const isMember = await ConversationMember.findOne({ where: { conversationId, userId } });
            if (!isMember) return res.status(403).json({ message: 'Not authorized.' });
        }

        await conversation.destroy(); // Hard delete for rejection

        res.json({ message: 'Conversation rejected/deleted.', conversationId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const clearConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        // Fetch all messages
        const messages = await Message.findAll({
            where: { conversationId }
        });

        const updates = [];
        for (const msg of messages) {
            const deletedBy = msg.deletedBy || [];
            // Check if not already deleted by user
            // Note: deletedBy is JSON array of integers
            if (!deletedBy.includes(userId) && !deletedBy.includes(String(userId))) {
                msg.deletedBy = [...deletedBy, userId];
                updates.push(msg.save());
            }
        }
        await Promise.all(updates);

        res.json({ message: 'Conversation cleared' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateGroupInfo = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { groupName, groupImage, description } = req.body;
        const userId = req.user.id;

        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        if (conversation.createdBy !== userId) {
            return res.status(403).json({ message: 'Only admin can update group info' });
        }

        if (groupName) conversation.groupName = groupName;
        if (groupImage) conversation.groupImage = groupImage;
        if (description !== undefined) conversation.description = description;

        await conversation.save();
        res.json(conversation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const promoteAdmin = async (req, res) => {
    try {
        const { conversationId, userId } = req.params;
        const requesterId = req.user.id;

        const requester = await ConversationMember.findOne({ where: { conversationId, userId: requesterId } });
        if (!requester || (requester.role !== 'admin' && !requester.isAdmin)) {
            return res.status(403).json({ message: 'Only admins can promote members' });
        }

        const targetMember = await ConversationMember.findOne({ where: { conversationId, userId } });
        if (!targetMember) return res.status(404).json({ message: 'User not in group' });

        targetMember.role = 'admin';
        targetMember.isAdmin = true;
        await targetMember.save();

        res.json({ message: 'User promoted to admin' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const dismissAdmin = async (req, res) => {
    try {
        const { conversationId, userId } = req.params;
        const requesterId = req.user.id;

        const requester = await ConversationMember.findOne({ where: { conversationId, userId: requesterId } });
        if (!requester || (requester.role !== 'admin' && !requester.isAdmin)) {
            return res.status(403).json({ message: 'Only admins can dismiss admins' });
        }

        const targetMember = await ConversationMember.findOne({ where: { conversationId, userId } });
        if (!targetMember) return res.status(404).json({ message: 'User not in group' });

        targetMember.role = 'member';
        targetMember.isAdmin = false;
        await targetMember.save();

        res.json({ message: 'User dismissed as admin' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getConversations,
    createPrivateConversation,
    createGroupConversation,
    addGroupMember,
    removeGroupMember,
    leaveGroup,
    acceptConversation,
    rejectConversation,
    clearConversation,
    updateGroupInfo,
    promoteAdmin,
    dismissAdmin
};
