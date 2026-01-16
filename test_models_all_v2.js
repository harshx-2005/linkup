const https = require('https');

const apiKey = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';

const tests = [
    { name: "Gemini 1.5 Flash (v1beta)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}` },
    { name: "Gemini 2.0 Flash Exp (v1beta)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}` },
    { name: "Gemini 2.5 Flash (v1beta)", url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}` }
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
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            console.log(`[${test.name}] Status: ${res.statusCode}`);
            if (res.statusCode !== 200) {
                // Print first 50 chars of error to see reason
                console.log(`   Error: ${body.substring(0, 100)}...`);
            }
        });
    });

    req.on('error', (e) => console.error(`[${test.name}] Network Error: ${e.message}`));
    req.write(payload);
    req.end();
}

console.log("--- Starting Model Diagnostics V2 ---");
tests.forEach(test => runTest(test));
