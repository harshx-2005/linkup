const https = require('https');

const apiKey = 'AIzaSyCtfIsUUcyjsvTgweNWSG1HRd_laIPDKXk';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const models = JSON.parse(data);
            console.log("Available Models:");
            if (models.models) {
                models.models.forEach(m => console.log(m.name));
            } else {
                console.log(data); // Print error if structure is unexpected
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
            console.log("Raw Data:", data);
        }
    });
}).on('error', (e) => {
    console.error("Got error: " + e.message);
});
