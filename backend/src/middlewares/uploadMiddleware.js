const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'linkup_uploads',
        resource_type: 'auto', // Auto-detect image/video/raw
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'mp4', 'webm', 'ogg', 'mp3', 'wav', 'pdf', 'doc', 'docx', 'txt'],
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

module.exports = upload;
