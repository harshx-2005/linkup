const axios = require('axios');
const { Message } = require('../models');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// List of models to try in order of preference
const MODELS = [
    'gemini-2.5-flash',      // Available
    'gemini-2.0-flash',      // Available
    'gemini-flash-latest',   // Available (Flash 1.5 alias)
    'gemini-2.5-pro',        // Available
    'gemini-pro-latest'      // Available
];

// Helper to sanitize JSON
const cleanJson = (text) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Robust API Caller that tries models sequentially
 */
const callGeminiAPI = async (payload) => {
    if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

    let lastError = null;

    for (const model of MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            console.log(`Trying Gemini Model: ${model}...`);

            const response = await axios.post(url, payload);

            if (response.data && response.data.candidates && response.data.candidates.length > 0) {
                console.log(`✅ [GeminiService] Success with model: ${model}`);
                return response.data;
            }
        } catch (error) {
            console.warn(`⚠️ [GeminiService] Failed with ${model}: ${error.response?.data?.error?.message || error.message}`);
            lastError = error;
        }
    }

    throw lastError || new Error("All Gemini models failed.");
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

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
        };

        const data = await callGeminiAPI(payload);
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) return ["👍", "Okay", "Talk later"];

        const replies = JSON.parse(cleanJson(rawText));
        return Array.isArray(replies) ? replies.slice(0, 3) : ["👍", "Okay", "Talk later"];

    } catch (error) {
        console.error("❌ [GeminiService] Smart Reply Final Error:", error.message);
        return ["👍", "Okay", "Talk later"];
    }
};

const getAiResponse = async (userPrompt, conversationId, senderName) => {
    try {
        console.log(`🤖 [GeminiService] Chat Request from ${senderName}: ${userPrompt}`);

        // Fetch last 10 messages for context
        const history = await Message.findAll({
            where: { conversationId },
            order: [['createdAt', 'DESC']],
            limit: 10,
            attributes: ['content', 'senderId', 'createdAt'],
            include: [{ association: 'User', attributes: ['name'] }]
        });

        // Filter out ANY message that looks like an error report from the bot
        const conversationHistory = history.reverse()
            .filter(m => {
                const text = m.content.toLowerCase();
                return !text.includes("check server logs") &&
                    !text.includes("trouble connecting") &&
                    !text.includes("technical difficulties") &&
                    !text.includes("apologies");
            })
            .map(m => `${m.User?.name || 'User'}: ${m.content}`)
            .join('\n');

        console.log("📝 [GeminiService] Context Sent to AI:\n", conversationHistory);

        const systemInstruction = `You are LinkUp AI, a helpful and friendly assistant inside the LinkUp chat app.
        You are currently chatting with ${senderName}.
        
        Recent Conversation History:
        ${conversationHistory}
        
        IMPORTANT: Use the above history for context, but IGNORE any previous technical error messages or apologies from "LinkUp AI". You are fully functional now.
        
        Answer the user's latest message: "${userPrompt}"
        Keep your answers concise, helpful, and friendly.`;

        const payload = {
            contents: [{ parts: [{ text: systemInstruction }] }]
        };

        const data = await callGeminiAPI(payload);
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) return "I'm having trouble thinking right now. 😵";

        console.log("✅ [GeminiService] Bot Reply:", reply);
        return reply;

    } catch (error) {
        console.error("❌ [GeminiService] Chat Final Error:", error.message);
        return "I'm having trouble connecting to my brain right now. 🤯 (Check Server Logs)";
    }
};

module.exports = { generateSmartReplies, getAiResponse };
