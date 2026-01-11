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

        // [NEW] AI Assistant Hook: Check for /ai or /ask or DIRECT MESSAGE TO AI
        const receiver = await User.findByPk(req.body.receiverId || (await ConversationMember.findOne({ where: { conversationId, userId: { [Op.ne]: senderId } } }))?.userId);

        // Check if Recipient is the Bot
        const isDirectToBot = receiver && receiver.email === 'ai@linkup.bot';

        if (content.startsWith('/ai ') || content.startsWith('/ask ') || isDirectToBot) {
            const prompt = isDirectToBot ? content : content.replace(/^\/(ai|ask) /, '').trim();
            // Use NEW Meta AI Webhook for DMs, or fallback to old one
            const n8nUrl = isDirectToBot ? process.env.N8N_META_AI_WEBHOOK_URL : process.env.N8N_AI_CHAT_WEBHOOK_URL;

            if (n8nUrl) {
                console.log("Triggering AI Chat Webhook:", n8nUrl);
                // Fire and forget
                try {
                    axios.post(n8nUrl, {
                        prompt,
                        conversationId,
                        senderId // Pass sender ID so bot knows who asked
                    }).catch(err => console.error("n8n AI Webhook Error:", err.message));
                } catch (e) {
                    console.error("n8n Sync Error", e);
                }
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
        // [Fix] Caching: Append random seed to Pollinations URLs
        if (attachmentUrl && attachmentUrl.includes('pollinations.ai')) {
            // Logic remains valid for both `image.pollinations.ai` and `pollinations.ai/p/`
            const separator = attachmentUrl.includes('?') ? '&' : '?';
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

// [NEW] Smart Reply Generator
const getSmartReplies = async (req, res) => {
    try {
        const { conversationId } = req.body; // or params
        const userId = req.user.id;

        // 1. Fetch recent context (Last 10 messages)
        const messages = await Message.findAll({
            where: { conversationId },
            order: [['createdAt', 'DESC']],
            limit: 10,
            include: [{ model: User, attributes: ['name'] }]
        });

        // 2. Format context for AI
        // Reverse to chronological order (Oldest -> Newest)
        const context = messages.reverse().map(m => {
            const senderName = m.senderId === userId ? 'Me' : (m.User?.name || 'Partner');
            return `${senderName}: ${m.content || '[Media]'}`;
        }).join('\n');

        if (!context) return res.json({ replies: ["Hi!", "Hello", "How are you?"] });

        // 3. Call n8n Webhook
        const n8nUrl = process.env.N8N_SMART_REPLY_WEBHOOK_URL;
        if (!n8nUrl) {
            console.warn("Smart Reply: Missing N8N_SMART_REPLY_WEBHOOK_URL");
            return res.json({ replies: ["Thumbs up 👍", "Sounds good", "Okay"] });
        }

        const response = await axios.post(n8nUrl, {
            chat: context,
            prompt: "Based on the chat history above, suggest 3 short, separate, natural responses for 'Me'. Output detailed JSON array: ['Reply1', 'Reply2', 'Reply3']."
        });

        // 4. Handle AI Response
        // Expecting n8n to return: { output: ["msg1", "msg2", "msg3"] } or just the array
        let suggestions = [];

        // n8n might return various structures depending on the Agent node output
        // We'll trust the AI Agent sends back valid JSON string or object
        if (response.data && Array.isArray(response.data)) {
            suggestions = response.data;
        } else if (response.data && response.data.output) {
            // If AI returns a string, try to parse it
            if (typeof response.data.output === 'string') {
                // Try to remove markdown code blocks if any
                const clean = response.data.output.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    suggestions = JSON.parse(clean);
                } catch (e) {
                    suggestions = [response.data.output.substring(0, 20)]; // Fallback
                }
            } else if (Array.isArray(response.data.output)) {
                suggestions = response.data.output;
            }
        }

        // Fallback if AI fails
        if (!suggestions || suggestions.length === 0) {
            suggestions = ["Yes", "No", "I'm not sure"];
        }

        // Limit to 3 and ensure strings
        const finalReplies = suggestions.slice(0, 3).map(String);

        res.json({ replies: finalReplies });

    } catch (error) {
        console.error("Smart Reply Error:", error.message);
        // Fallback on error
        res.json({ replies: ["👍", "Okay", "Talk later"] });
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
    getSmartReplies
};
