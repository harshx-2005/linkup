const axios = require('axios');
const { Message } = require('../models');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

// Helper to sanitize JSON
const cleanJson = (text) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const generateSmartReplies = async (conversationContext) => {
    try {
        const prompt = `
        You are a smart reply assistant.
        Based on the following chat history, generate 3 short, natural, and casual replies for the last user ('Me').
        Context:
        ${conversationContext}
        
        Output Strictly as a JSON array of strings. Example: ["Okay", "Sounds good", "See you"]
        `;

        const response = await axios.post(API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
        });

        const rawText = response.data.candidates[0].content.parts[0].text;
        const replies = JSON.parse(cleanJson(rawText));

        return Array.isArray(replies) ? replies.slice(0, 3) : ["👍", "Okay", "Talk later"]; // Fallback
    } catch (error) {
        console.error("Gemini Smart Reply Error:", error.response?.data || error.message);
        return ["👍", "Okay", "Talk later"];
    }
};

const getAiResponse = async (userPrompt, conversationId, senderName) => {
    try {
        // Fetch last 10 messages for context
        // This makes the bot aware of the conversation flow
        const history = await Message.findAll({
            where: { conversationId },
            order: [['createdAt', 'DESC']],
            limit: 10,
            attributes: ['content', 'senderId', 'createdAt'],
            include: [{ association: 'User', attributes: ['name'] }] // Assuming alias exists
        });

        // Format history
        // Note: We need to handle this carefully to distinguish User vs Bot.
        // For now, let's just stick to a simple instruction with the new prompt.

        const systemInstruction = `You are Meta AI, a helpful and friendly assistant inside the LinkUp chat app.
        You are chatting with ${senderName}. Keep your answers concise and helpful.`;

        const response = await axios.post(API_URL, {
            contents: [{ parts: [{ text: userPrompt }] }],
            system_instruction: { parts: [{ text: systemInstruction }] } // Gemini 1.5+ supports system instructions
        });

        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini Chat Error:", error.response?.data || error.message);
        return "I'm having trouble connecting right now. Please try again later. 🤖";
    }
};

module.exports = { generateSmartReplies, getAiResponse };
