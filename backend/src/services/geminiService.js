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

// Helper to convert file format to MIME type
const getMimeType = (url) => {
    if (url.endsWith('.png')) return 'image/png';
    if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
    if (url.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg'; // Fallback
};

const getAiResponse = async (userPrompt, conversationId, senderName, imageAttachment = null) => {
    try {
        console.log(`🤖 [GeminiService] Chat Request from ${senderName}: ${userPrompt} ${imageAttachment ? '[Image Attached]' : ''}`);

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
                const text = (m.content || "").toLowerCase();
                return !text.includes("check server logs") &&
                    !text.includes("trouble connecting") &&
                    !text.includes("technical difficulties") &&
                    !text.includes("apologies");
            })
            .map(m => `${m.User?.name || 'User'}: ${m.content}`)
            .join('\n');

        const systemInstruction = `You are LinkUp AI, a helpful and friendly assistant inside the LinkUp chat app.
        You are currently chatting with ${senderName}.
        
        Recent Conversation History:
        ${conversationHistory}
        
        IMPORTANT: Use the above history for context, but IGNORE any previous technical error messages or apologies from "LinkUp AI". You are fully functional now.
        
        Answer the user's latest message: "${userPrompt}"
        Keep your answers concise, helpful, and friendly.`;

        const parts = [{ text: systemInstruction }];

        // Handle Image Attachment (Multimodal)
        if (imageAttachment) {
            try {
                // Determine mime type
                const mimeType = getMimeType(imageAttachment);
                console.log(`📸 [GeminiService] Fetching Image: ${imageAttachment} (${mimeType})`);

                // Fetch with headers to look like a browser/legitimate client
                const imageResponse = await axios.get(imageAttachment, {
                    responseType: 'arraybuffer',
                    headers: {
                        'User-Agent': 'LinkUp-AI-Agent/1.0',
                        'Accept': 'image/*,*/*'
                    }
                });

                console.log(`📸 [GeminiService] Image Fetched. Status: ${imageResponse.status}, Size: ${imageResponse.data.length} bytes`);

                const base64Data = Buffer.from(imageResponse.data).toString('base64');

                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
            } catch (imgErr) {
                console.error("❌ [GeminiService] Failed to fetch image:", imgErr.message);

                // Fallback: If it's a Cloudinary URL, sometimes transformations help or debugging the URL
                const errorMsg = imgErr.response ? `Status ${imgErr.response.status}` : imgErr.message;

                parts.push({ text: `\n[System Note: I tried to download the image you sent (${imageAttachment}), but I failed. Error: ${errorMsg}. Please ask the user to describe it instead.]` });
            }
        }

        const payload = {
            contents: [{ parts: parts }]
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

const generateSummary = async (conversationId) => {
    try {
        // Fetch last 50 messages
        const history = await Message.findAll({
            where: { conversationId },
            order: [['createdAt', 'DESC']],
            limit: 50,
            include: [{ association: 'User', attributes: ['name'] }]
        });

        if (history.length < 5) return "Not enough conversation history to summarize.";

        const chatLog = history.reverse()
            .map(m => `${m.User?.name || 'User'}: ${m.content}`)
            .join('\n');

        const prompt = `
        Read the following chat conversation and provide a concise summary.
        Use exactly 3 bullet points.
        Capture the key topics, decisions, or funny moments.
        
        Chat Log:
        ${chatLog}
        `;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        const data = await callGeminiAPI(payload);
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed to generate summary.";

    } catch (error) {
        console.error("❌ [GeminiService] Summary Error:", error);
        throw error;
    }
};

const rewriteMessage = async (text, tone) => {
    try {
        const prompt = `
        Rewrite the following text to have a "${tone}" tone.
        Text: "${text}"
        
        Output ONLY the rewritten text. Do not add quotes or explanations.
        `;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        const data = await callGeminiAPI(payload);
        return data.candidates?.[0]?.content?.parts?.[0]?.text || text;

    } catch (error) {
        console.error("❌ [GeminiService] Rewrite Error:", error);
        return text; // Fallback to original
    }
};

const translateText = async (text, targetLanguage = 'English') => {
    try {
        const prompt = `
        Translate the meaning of the following text to ${targetLanguage}.
        Do NOT transliterate (do not write the original sounds in English characters).
        If the target is English and the text is already in English, return it as is but correct any grammar.
        
        Text: "${text}"
        
        Output ONLY the translated text. No preamble.
        `;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        const data = await callGeminiAPI(payload);
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Translation failed.";

    } catch (error) {
        console.error("❌ [GeminiService] Translate Error:", error);
        throw error;
    }
};

const transcribeAudio = async (audioUrl) => {
    try {
        console.log(`🎙️ [GeminiService] Transcribing: ${audioUrl}`);

        // Fetch audio
        const audioResponse = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'LinkUp-AI-Agent/1.0' }
        });

        const mimeType = audioUrl.endsWith('.ogg') ? 'audio/ogg' :
            audioUrl.endsWith('.wav') ? 'audio/wav' :
                audioUrl.endsWith('.mp3') ? 'audio/mp3' : 'audio/mp3';

        const base64Data = Buffer.from(audioResponse.data).toString('base64');

        const prompt = "Transcribe this audio note accurately. Output only the transcription.";

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }]
        };

        const data = await callGeminiAPI(payload);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log(`✅ [GeminiService] Transcription: ${text?.substring(0, 50)}...`);
        return text || "Could not transcribe audio.";

    } catch (error) {
        console.error("❌ [GeminiService] Transcription Error:", error);
        throw new Error("Transcription failed.");
    }
};

module.exports = { generateSmartReplies, getAiResponse, generateSummary, rewriteMessage, translateText, transcribeAudio };
