const fs = require('fs');

try {
    const content = fs.readFileSync('e:\\chatapp\\n8n_smart_reply_gemini.json', 'utf8');
    JSON.parse(content);
    console.log("JSON is VALID ✅");
} catch (e) {
    console.error("JSON is INVALID ❌");
    console.error(e.message);
}
