const https = require('https');
const apiKey = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${apiKey}`;

const payload = JSON.stringify({ "contents": [{ "parts": [{ "text": "Hi" }] }] });

const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log(`[gemini-1.0-pro] Status: ${res.statusCode}`);
        if (res.statusCode !== 200) console.log(body.substring(0, 200));
    });
});
req.on('error', console.error);
req.write(payload);
req.end();
