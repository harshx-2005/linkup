const https = require('https');
const apiKey = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

const payload = JSON.stringify({ "contents": [{ "parts": [{ "text": "Hi" }] }] });

const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
    console.log(`Status: ${res.statusCode}`);
});
req.on('error', console.error);
req.write(payload);
req.end();
