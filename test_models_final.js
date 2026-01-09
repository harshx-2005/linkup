const https = require('https');

const apiKey = 'AIzaSyCtfIsUUcyjsvTgweNWSG1HRd_laIPDKXk';

const tests = [
    { name: "Gemini 1.5 Flash (v1)", url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}` },
    { name: "Gemini 1.5 Flash (v1beta)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}` },
    { name: "Gemini 2.0 Flash Exp (v1beta)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}` }
];

const payload = JSON.stringify({
    "contents": [{ "parts": [{ "text": "Hi" }] }]
});

function runTest(test) {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(test.url, options, (res) => {
        console.log(`[${test.name}] Status: ${res.statusCode} ${res.statusCode === 200 ? "✅ WORKED" : "❌ FAILED"}`);
    });

    req.on('error', (e) => console.error(`[${test.name}] Error: ${e.message}`));
    req.write(payload);
    req.end();
}

console.log("--- Starting Model Diagnostics ---");
tests.forEach(test => runTest(test));
