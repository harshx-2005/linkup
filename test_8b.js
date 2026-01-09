const https = require('https');
const apiKey = 'AIzaSyCtfIsUUcyjsvTgweNWSG1HRd_laIPDKXk';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`;

const payload = JSON.stringify({ "contents": [{ "parts": [{ "text": "Hi" }] }] });

const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
    console.log(`[gemini-1.5-flash-8b] Status: ${res.statusCode}`);
});
req.on('error', console.error);
req.write(payload);
req.end();
