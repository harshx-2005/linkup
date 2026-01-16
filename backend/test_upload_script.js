const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000/api/upload';
// Use a dummy email/password that works in your DB, or mock the token if possible.
// For now, assuming we need a token. If verification is on, this will fail without it.
// Let's assume we can temporarily skip auth or use a valid token if we have one.
// Actually, let's login first.

const LOGIN_URL = 'http://localhost:5000/api/auth/login';
const TEST_USER = { email: 'demo@example.com', password: 'password123' }; // Replace with valid user

async function testUpload() {
    try {
        // 1. Create a dummy file
        const filePath = path.join(__dirname, 'test_image.png');
        // We'll just create a text file mimicking an image for simplicity, 
        // BUT cloudinary might reject a text file named .png if it checks magic numbers.
        // Better to use the real test.png in the directory.
        if (!fs.existsSync(filePath)) {
            // Create a tiny valid png (1x1 transparent pixel)
            const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            fs.writeFileSync(filePath, pngBuffer);
        }

        console.log('Logging in...');
        let token;
        try {
            const loginRes = await axios.post(LOGIN_URL, TEST_USER);
            token = loginRes.data.token;
            console.log('Login successful. Token acquired.');
        } catch (err) {
            console.error('Login failed (using hardcoded login?). skipping auth check might fail.');
            // Try continuing?
        }

        // 2. Upload
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        console.log('Uploading file...');
        const headers = {
            ...formData.getHeaders(),
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const uploadRes = await axios.post(BASE_URL, formData, { headers });

        console.log('Upload Success!', uploadRes.data);

    } catch (error) {
        console.error('Upload Failed:', error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 500) {
            console.log('!!! 500 ERROR CONFIRMED !!!');
        }
    }
}

testUpload();
