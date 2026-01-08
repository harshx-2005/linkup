const axios = require('axios');

async function check(url) {
    try {
        console.log(`Checking: ${url}`);
        const res = await axios.head(url);
        console.log(`Status: ${res.status}`);
        console.log(`Type: ${res.headers['content-type']}`);
        console.log(`Location: ${res.headers['location']}`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

async function run() {
    // Check if new path supports query params
    await check('https://pollinations.ai/p/test?seed=12345&nologo=true');
}

run();
