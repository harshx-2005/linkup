const cloudinary = require('./src/config/cloudinary');
const fs = require('fs');
const path = require('path');

async function testDirectUpload() {
    console.log('Testing Cloudinary Connection directly...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD ? 'Set' : 'Missing');
    console.log('Key:', process.env.CLOUDINARY_KEY ? 'Set' : 'Missing');
    console.log('Secret:', process.env.CLOUDINARY_SECRET ? 'Set' : 'Missing');

    try {
        const filePath = path.join(__dirname, 'test.png');
        if (!fs.existsSync(filePath)) {
            const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            fs.writeFileSync(filePath, pngBuffer);
        }

        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'linkup_test_direct'
        });

        console.log('✅ Direct Upload Success!');
        console.log('URL:', result.secure_url);
    } catch (error) {
        console.error('❌ Direct Upload Failed:', error);
    }
}

testDirectUpload();
