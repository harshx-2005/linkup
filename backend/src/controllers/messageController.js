const { Message, User, Conversation, Block, ConversationMember } = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../socket'); // Import socket

const getMessages = async (req, res) => {
    // ... (existing getMessages logic)
    try {
        const { conversationId } = req.params;
        const currentUserId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const messages = await Message.findAll({
            where: { conversationId },
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'avatar'],
                },
            ],
            order: [['createdAt', 'DESC']], // Fetch newest first for pagination
            limit,
            offset,
        });

        // Loop to check if deliveredTo needs migration or default (DB default handles it but safe to check)
        // messages.forEach(m => { if(!m.deliveredTo) m.deliveredTo = [] });


        // Reverse to show oldest first in chat (standard chat order)
        const sortedMessages = messages.reverse();

        // Filter out messages deleted by current user
        const visibleMessages = sortedMessages.filter(msg => {
            if (msg.deletedForEveryone) return true; // Keep these to show as "deleted"
            const deletedBy = msg.deletedBy || [];
            return !deletedBy.includes(currentUserId);
        });

        // ... (rest of logic) ...

        // Map to show "This message was deleted" if deletedForEveryone is true?
        // Usually we keep the message object but change content.
        // But for simplicity, let's just filter out "deleted for me" and handle "deleted for everyone" in frontend or here.
        // If deletedForEveryone, usually we send it but with content "This message was deleted".

        const formattedMessages = visibleMessages.map(msg => {
            if (msg.deletedForEveryone) {
                return {
                    ...msg.toJSON(),
                    content: 'This message was deleted',
                    messageType: 'text',
                    attachmentUrl: null,
                    deletedForEveryone: true
                };
            }
            return msg;
        });

        res.json(formattedMessages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// [NEW] Axios for n8n
const axios = require('axios');

const sendMessage = async (req, res) => {
    try {
        const { conversationId, content, messageType, attachmentUrl } = req.body;

        let senderId;
        if (req.user) {
            senderId = req.user.id;
        } else {
            // [Fix] Handle unauthenticated Bot/AI requests
            // Attempt to attribute the message to the last active user in the conversation (usually the one who typed /imagine)
            try {
                const lastMsg = await Message.findOne({
                    where: { conversationId },
                    order: [['createdAt', 'DESC']],
                    attributes: ['senderId']
                });
                if (lastMsg) {
                    senderId = lastMsg.senderId;
                } else {
                    // Fallback: Pick any member
                    const member = await ConversationMember.findOne({ where: { conversationId } });
                    if (member) senderId = member.userId;
                    else return res.status(400).json({ message: "Invalid Conversation ID" });
                }
            } catch (e) {
                console.error("Bot Sender Inference Error:", e);
                return res.status(500).json({ message: "Bot Error" });
            }
        }

        // [NEW] AI Hook: Check for /imagine
        if (content.startsWith('/imagine ')) {
            const prompt = content.replace('/imagine ', '').trim();
            const n8nUrl = process.env.N8N_WEBHOOK_URL;

            if (n8nUrl) {
                // Trigger n8n asynchronously
                // We do NOT save the /imagine command as a permanent message if we want to keep chat clean, 
                // OR we save it so the user sees what they typed. Saving it is better UX.

                console.log("Triggering n8n Webhook:", n8nUrl);
                // Let's fire and forget the webhook
                try {
                    axios.post(n8nUrl, {
                        prompt,
                        conversationId,
                        userId: senderId
                    }).catch(err => console.error("n8n Webhook Error:", err.message));
                } catch (e) {
                    console.error("n8n Sync Error", e);
                }

                // Continue to save the user's command as a normal text message
            }
        }

        // Validation: Block Status & Pending Request
        const conversation = await Conversation.findByPk(conversationId);
        if (conversation && !conversation.isGroup) {
            // Find other user
            const members = await ConversationMember.findAll({ where: { conversationId } });
            const otherMember = members.find(m => m.userId !== senderId);

            if (otherMember) {
                const otherUserId = otherMember.userId;

                // Check Blocks
                const blockExists = await Block.findOne({
                    where: {
                        [Op.or]: [
                            { blockerId: senderId, blockedId: otherUserId },
                            { blockerId: otherUserId, blockedId: senderId }
                        ]
                    }
                });

                if (blockExists) {
                    return res.status(403).json({ message: "You cannot message this user." });
                }

                // Check Pending Status (Receiver cannot send until accepted)
                // If createdBy is not sender, and status is pending -> Sender is Receiver of request.
                // Receiver must accept first.
                if (conversation.status === 'pending' && conversation.createdBy !== senderId) {
                    return res.status(403).json({ message: "You must accept the request to reply." });
                }
            }
        }

        // [Fix] Caching: Append random seed to Pollinations URLs
        if (attachmentUrl && attachmentUrl.includes('pollinations.ai')) {
            const separator = attachmentUrl.includes('?') ? '&' : '?';
            // We re-assign message.attachmentUrl effectively by modifying the variable before creation
            // Note: const { attachmentUrl } was used above, but we can't reassign const.
            // Let's change destructuring to let or use a new variable.
        }

        const message = await Message.create({
            conversationId,
            senderId,
            content,
            messageType: messageType || 'text',
            attachmentUrl: (attachmentUrl && attachmentUrl.includes('pollinations.ai'))
                ? `${attachmentUrl}${attachmentUrl.includes('?') ? '&' : '?'}seed=${Date.now()}`
                : attachmentUrl,
        });

        // Fetch message with sender details
        const fullMessage = await Message.findByPk(message.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'avatar'],
                },
            ],
        });

        // Emit real-time update
        const io = getIO();
        io.to(String(conversationId)).emit('newMessage', fullMessage);

        res.status(201).json(fullMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const markMessagesAsSeen = async (req, res) => {
    try {
        const { conversationId } = req.body;
        const userId = req.user.id;

        // Fetch messages not seen by user
        const messages = await Message.findAll({
            where: {
                conversationId,
                senderId: { [Op.ne]: userId },
            }
        });

        const updates = [];
        for (const msg of messages) {
            const seenBy = msg.seenBy || [];
            if (!seenBy.includes(userId)) {
                msg.seenBy = [...seenBy, userId];
                updates.push(msg.save());
            }
        }
        await Promise.all(updates);

        res.status(200).json({ message: 'Messages marked as seen' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const markMessagesAsDelivered = async (req, res) => {
    try {
        const { conversationId } = req.body;
        const userId = req.user.id;

        // Fetch messages not delivered to user
        const messages = await Message.findAll({
            where: {
                conversationId,
                senderId: { [Op.ne]: userId },
            }
        });

        const updates = [];
        for (const msg of messages) {
            const deliveredTo = msg.deliveredTo || [];
            if (!deliveredTo.includes(userId)) {
                // Determine if we need to update
                // If it's already 'seen', it implies delivered, but let's be explicit
                msg.deliveredTo = [...deliveredTo, userId];
                updates.push(msg.save());
            }
        }
        await Promise.all(updates);

        res.status(200).json({ message: 'Messages marked as delivered' });
    } catch (error) {
        console.error('Error marking delivered:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteForEveryone } = req.body; // Expect this flag
        const userId = req.user.id;

        const message = await Message.findByPk(id);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (deleteForEveryone) {
            let isAuthorized = message.senderId === userId;

            if (!isAuthorized) {
                // Check if user is Group Admin
                const member = await ConversationMember.findOne({
                    where: {
                        conversationId: message.conversationId,
                        userId: userId
                    }
                });

                if (member && (member.role === 'admin' || member.isAdmin)) {
                    isAuthorized = true;
                }
            }

            if (!isAuthorized) {
                return res.status(403).json({ message: 'Unauthorized to delete for everyone' });
            }

            message.deletedForEveryone = true;
            await message.save();
        } else {
            // Delete for me - Allowed for any participant (sender or receiver)
            // We should verify user is part of conversation, but for now assuming access implies membership or public.
            // Ideally check ConversationMember.

            const deletedBy = message.deletedBy || [];
            if (!deletedBy.includes(userId)) {
                message.deletedBy = [...deletedBy, userId];
                await message.save();
            }
        }

        res.json({ message: 'Message deleted', deletedForEveryone: !!deleteForEveryone });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const editMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const message = await Message.findByPk(id);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (message.senderId !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (message.deletedForEveryone) {
            return res.status(400).json({ message: 'Cannot edit deleted message' });
        }

        message.content = content;
        await message.save();
        res.json(message);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getMessages,
    sendMessage,
    markMessagesAsSeen,
    markMessagesAsDelivered,
    deleteMessage,
    editMessage,
};
