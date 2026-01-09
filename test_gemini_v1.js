const https = require('https');

const apiKey = 'AIzaSyCtfIsUUcyjsvTgweNWSG1HRd_laIPDKXk';
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

const data = JSON.stringify({
    "contents": [{
        "role": "user",
        "parts": [{
            "text": "Hello"
        }]
    }],
    "generationConfig": {
        "responseMimeType": "application/json"
    }
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
