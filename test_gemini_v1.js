const https = require('https');

const apiKey = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

const data = JSON.stringify({
    "contents": [{
        "role": "user",
        "parts": [{
            "text": "You are a helpful assistant. Generate 3 short, natural, concise responses for the user based on the chat history provided. \n\nContext:\nUser: Hello\n\nOutput ONLY a valid JSON array of strings, like this: [\"Yes, sure\", \"I will check\", \"Not right now\"]\n\nDo not include ```json blocks."
        }]
    }]
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(url, options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => responseBody += chunk);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', responseBody);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
