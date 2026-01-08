const axios = require('axios');

async function checkUrl(url, name) {
    try {
        console.log(`Checking ${name}: ${url}`);
        const res = await axios.head(url);
        console.log(`[${name}] Status: ${res.status}`);
        console.log(`[${name}] Content-Type: ${res.headers['content-type']}`);
        console.log(`[${name}] Location: ${res.headers['location'] || 'None'}`);
    } catch (e) {
        console.log(`[${name}] Error: ${e.message}`);
        if (e.response) console.log(`Stats: ${e.response.status}`);
    }
}

async function run() {
    await checkUrl('https://image.pollinations.ai/prompt/test?nologo=true', 'OLD_API');
    await checkUrl('https://pollinations.ai/p/test?nologo=true', 'NEW_API');
    await checkUrl('https://pollinations.ai/prompt/test?nologo=true', 'ALT_API');
}

run();
