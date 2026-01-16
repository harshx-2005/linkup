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
// [NEW] Native Gemini Service
const geminiService = require('../services/geminiService');

const sendMessage = async (req, res) => {
    try {
        const { conversationId, content, messageType, attachmentUrl } = req.body;

        let senderId;
        if (req.user) {
            senderId = req.user.id;
        } else {
            // ... (Bot/AI requests logic - largely unused if we handle via function calls, but keep for safety)
            // For native integration, the bot replies are created programmatically below, 
            // so this logic is mostly for if an external service called this endpoint (unlikely now).
            try {
                const lastMsg = await Message.findOne({
                    where: { conversationId },
                    order: [['createdAt', 'DESC']],
                    attributes: ['senderId']
                });
                if (lastMsg) {
                    senderId = lastMsg.senderId;
                } else {
                    const member = await ConversationMember.findOne({ where: { conversationId } });
                    if (member) senderId = member.userId;
                    else return res.status(400).json({ message: "Invalid Conversation ID" });
                }
            } catch (e) {
                console.error("Bot Sender Inference Error:", e);
                return res.status(500).json({ message: "Bot Error" });
            }
        }

        // ... (User message creation) ...
        // [Fix] Caching: Append random seed to Pollinations URLs
        if (attachmentUrl && attachmentUrl.includes('pollinations.ai')) {
            // Logic remains valid
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
        io.to(String(conversationId)).emit('receive_message', fullMessage);

        res.status(201).json(fullMessage);

        /**
         * [NEW] NATIVE AI LOGIC
         * We process this AFTER sending the user's message to ensure speed.
         */

        // 1. Identify if AI should reply
        const receiverMember = await ConversationMember.findOne({
            where: { conversationId, userId: { [Op.ne]: senderId } },
            include: [{ model: User, attributes: ['email', 'name'] }]
        });

        const receiver = receiverMember ? receiverMember.User : null;
        const isDirectToBot = receiver && receiver.email === 'ai@linkup.bot';
        const isCommand = content.startsWith('/ai ') || content.startsWith('/ask ');

        if ((isDirectToBot || isCommand) && messageType !== 'image') {
            console.log("🤖 AI Triggered via Native Service");

            // Extract Prompt
            const prompt = isCommand ? content.replace(/^\/(ai|ask) /, '').trim() : content;
            const senderName = req.user ? req.user.name : "User";

            // Call Gemini Service
            // We don't await this block to keep the API fast? 
            // Actually, for simplicity/reliability, let's await it or fire-and-forget properly.
            // Fire-and-forget allows the UI to update with the User's message first.
            (async () => {
                let imageUrl = null;

                if (messageType === 'image') {
                    // content field holds the filename, attachmentUrl holds the URL
                    imageUrl = attachmentUrl || content;
                } else if (messageType === 'text') {
                    // [NEW] Look back for a recent image (within 2 minutes) from the same user
                    // This handles "captioning" where text is sent shortly after image
                    const tenMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
                    const lastImageMsg = await Message.findOne({
                        where: {
                            conversationId,
                            senderId,
                            messageType: 'image',
                            createdAt: { [Op.gt]: tenMinutesAgo }
                        },
                        order: [['createdAt', 'DESC']]
                    });

                    if (lastImageMsg) {
                        // Prefer attachmentUrl if available
                        imageUrl = lastImageMsg.attachmentUrl || lastImageMsg.content;
                        console.log(`📸 [MessageController] Found previous image context: ${imageUrl}`);
                    }
                }

                const aiResponseText = await geminiService.getAiResponse(prompt, conversationId, senderName, imageUrl);

                if (aiResponseText) {
                    // Find AI User ID (assuming receiver was the bot, or we need to find it)
                    let botUserId = receiver ? receiver.id : null;
                    if (!botUserId) {
                        // Find the 'ai@linkup.bot' user
                        const aiUser = await User.findOne({ where: { email: 'ai@linkup.bot' } });
                        if (aiUser) botUserId = aiUser.id;
                    }

                    if (botUserId) {
                        try {
                            // Create Bot Reply
                            const botMsg = await Message.create({
                                conversationId,
                                senderId: botUserId,
                                content: aiResponseText,
                                messageType: 'text'
                            });

                            // Fetch and Emit
                            const fullBotMsg = await Message.findByPk(botMsg.id, {
                                include: [{ model: User, attributes: ['id', 'name', 'avatar'] }]
                            });

                            const io = getIO();
                            if (io) {
                                io.to(String(conversationId)).emit('receive_message', fullBotMsg);
                                console.log(`✅ [MessageController] Emitted Bot Reply to Room: ${conversationId}`);
                            } else {
                                console.error("❌ [MessageController] IO Object not found!");
                            }
                        } catch (err) {
                            console.error("Failed to save Bot Message:", err);
                        }
                    }
                }
            })();
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// [NEW] Smart Reply Generator (Native)
const getSmartReplies = async (req, res) => {
    try {
        const { conversationId } = req.body;
        const userId = req.user.id;

        // 1. Fetch recent context
        const messages = await Message.findAll({
            where: { conversationId },
            order: [['createdAt', 'DESC']],
            limit: 10,
            include: [{ model: User, attributes: ['name'] }]
        });

        // 2. Format context for AI
        const context = messages.reverse().map(m => {
            const senderName = m.senderId === userId ? 'Me' : (m.User?.name || 'Partner');
            return `${senderName}: ${m.content || '[Media]'}`;
        }).join('\n');

        if (!context) return res.json({ replies: ["Hi!", "Hello", "How are you?"] });

        // 3. Call Native Service
        console.log("✨ Generating Smart Replies Natively...");
        const replies = await geminiService.generateSmartReplies(context);

        res.json({ replies });

    } catch (error) {
        console.error("Smart Reply Error:", error.message);
        res.json({ replies: ["👍", "Okay", "Talk later"] });
    }
};

const markMessagesAsSeen = async (req, res) => {
    // ... (existing implementation)
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
    // ... (existing implementation)
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
    // ... (existing implementation)
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
    // ... (existing implementation)
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

const summarizeConversation = async (req, res) => {
    try {
        const { conversationId } = req.body;
        // Basic check
        if (!conversationId) return res.status(400).json({ error: "conversationId required" });

        const summary = await geminiService.generateSummary(conversationId);
        res.json({ summary });
    } catch (error) {
        console.error("Summarize Error:", error);
        res.status(500).json({ error: "Failed to summarize" });
    }
};

const rewriteMessage = async (req, res) => {
    try {
        const { text, tone } = req.body;
        if (!text || !tone) return res.status(400).json({ error: "text and tone required" });

        const rewritten = await geminiService.rewriteMessage(text, tone);
        res.json({ rewritten });
    } catch (error) {
        console.error("Rewrite Error:", error);
        res.status(500).json({ error: "Failed to rewrite" });
    }
};

module.exports = {
    getMessages,
    sendMessage,
    markMessagesAsSeen,
    markMessagesAsDelivered,
    deleteMessage,
    editMessage,
    getSmartReplies,
    summarizeConversation,
    rewriteMessage
};
