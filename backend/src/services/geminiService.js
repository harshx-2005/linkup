const axios = require('axios');
const { Message } = require('../models');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use 1.5-flash for stability
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// Helper to sanitize JSON
const cleanJson = (text) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const generateSmartReplies = async (conversationContext) => {
    try {
        console.log("⚡ [GeminiService] Generating Smart Replies...");
        if (!GEMINI_API_KEY) {
            console.error("❌ [GeminiService] Missing GEMINI_API_KEY");
            return ["Check API Key", "Error", "System"];
        }

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

        const rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
            console.error("❌ [GeminiService] Empty response from API");
            return ["👍", "Okay", "Talk later"];
        }

        console.log("✅ [GeminiService] Smart Reply Response:", rawText);

        const replies = JSON.parse(cleanJson(rawText));

        return Array.isArray(replies) ? replies.slice(0, 3) : ["👍", "Okay", "Talk later"];
    } catch (error) {
        console.error("❌ [GeminiService] Smart Reply Error:", error.response?.data || error.message);
        return ["👍", "Okay", "Talk later"];
    }
};

const getAiResponse = async (userPrompt, conversationId, senderName) => {
    try {
        console.log(`🤖 [GeminiService] Chat Request from ${senderName}: ${userPrompt}`);

        if (!GEMINI_API_KEY) {
            console.error("❌ [GeminiService] Missing GEMINI_API_KEY");
            return "System Error: The Server is missing the GEMINI_API_KEY. Please check Render Environment Variables.";
        }

        // Fetch last 10 messages for context
        const history = await Message.findAll({
            where: { conversationId },
            order: [['createdAt', 'DESC']],
            limit: 10,
            attributes: ['content', 'senderId', 'createdAt'],
            include: [{ association: 'User', attributes: ['name'] }]
        });

        // Simple context formatting
        const conversationHistory = history.reverse().map(m => `${m.User?.name || 'User'}: ${m.content}`).join('\n');

        const systemInstruction = `You are LinkUp AI, a helpful and friendly assistant inside the LinkUp chat app.
        You are currently chatting with ${senderName}.
        
        Recent Conversation History:
        ${conversationHistory}
        
        Answer the user's latest message: "${userPrompt}"
        Keep your answers concise, helpful, and friendly.`;

        // 1.5 Flash supports system instructions but putting everything in 'contents' is often more robust for simple use cases
        // Let's use the 'parts' text approach
        const response = await axios.post(API_URL, {
            contents: [{ parts: [{ text: systemInstruction }] }]
        });

        const reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) {
            console.error("❌ [GeminiService] Empty response from Chat API");
            return "I'm having trouble thinking right now. 😵";
        }

        console.log("✅ [GeminiService] Bot Reply:", reply);
        return reply;

    } catch (error) {
        console.error("❌ [GeminiService] Chat Error:", error.response?.data || error.message);
        return "I'm having trouble connecting to my brain right now. 🤯 (Check Server Logs)";
    }
};

module.exports = { generateSmartReplies, getAiResponse };
