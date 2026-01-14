const axios = require('axios');
require('dotenv').config({ path: 'e:/chatapp/backend/.env' });
const fs = require('fs');

const GEMINI_API_KEY = "AIzaSyB9PCw86qmhskrZLkeE-uyDMohiengeXKU";

const checkModels = async () => {
    if (!GEMINI_API_KEY) {
        console.error("Missing GEMINI_API_KEY");
        return;
    }

    console.log(`Checking models for Key: ${GEMINI_API_KEY.substring(0, 10)}...`);

    try {
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        );

        const models = response.data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name);

        fs.writeFileSync('e:/chatapp/backend/models_list.json', JSON.stringify(models, null, 2));
        console.log("Written to models_list.json");

    } catch (error) {
        console.error("❌ Failed to list models:", error.response?.data || error.message);
    }
};

checkModels();
