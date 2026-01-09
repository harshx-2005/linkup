const https = require('https');

const apiKey = 'AIzaSyCtfIsUUcyjsvTgweNWSG1HRd_laIPDKXk';

const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
    "gemini-2.0-flash-exp",
    "gemini-2.5-flash"
];

const payload = JSON.stringify({
    "contents": [{ "parts": [{ "text": "Hi" }] }]
});

function runTest(model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            const statusIcon = res.statusCode === 200 ? "✅" : "❌";
            console.log(`[${model}] ${statusIcon} Status: ${res.statusCode}`);
        });
    });

    req.on('error', (e) => console.error(`[${model}] Network Error: ${e.message}`));
    req.write(payload);
    req.end();
}

console.log("--- Starting Extensive Model Diagnostics ---");
models.forEach(model => runTest(model));
