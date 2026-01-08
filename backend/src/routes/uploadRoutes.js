const express = require('express');
const { uploadFile } = require('../controllers/uploadController');
const upload = require('../middlewares/uploadMiddleware');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, upload.single('file'), uploadFile);

const { uploadBotFile } = require('../controllers/botUploadController');
const multer = require('multer');
const memoryUpload = multer({ storage: multer.memoryStorage() });

// [NEW] Bot Upload Route (Buffer -> Cloudinary)
router.post('/bot', memoryUpload.single('file'), uploadBotFile);

module.exports = router;
