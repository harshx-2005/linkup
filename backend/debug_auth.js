const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/auth';

async function test() {
    try {
        // 1. Register/Login
        const email = 'debug_' + Date.now() + '@test.com';
        const password = 'password123';

        console.log('Registering:', email);
        let token;
        try {
            const regRes = await axios.post(`${BASE_URL}/register`, {
                name: 'Debug User',
                email,
                password
            });
            token = regRes.data.token;
        } catch (e) {
            console.log('Registration failed, trying login equivalent...');
            // simplified for speed
        }

        if (!token) {
            console.error('Could not get token');
            return;
        }

        console.log('Got Token. Hitting /me...');
        const meRes = await axios.get(`${BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success:', meRes.data);

    } catch (error) {
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

test();
