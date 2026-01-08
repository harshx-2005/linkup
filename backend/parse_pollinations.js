const axios = require('axios');

async function run() {
    try {
        const res = await axios.get('https://pollinations.ai/p/test_image_123');
        const html = res.data;

        // Regex to find og:image
        const match = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (match) {
            console.log("Found Image URL:", match[1]);
        } else {
            console.log("No og:image found. Dumping head:");
            console.log(html.substring(0, 1000));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
