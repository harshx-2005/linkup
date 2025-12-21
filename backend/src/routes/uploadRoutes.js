const express = require('express');
const { uploadFile } = require('../controllers/uploadController');
const upload = require('../middlewares/uploadMiddleware');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', verifyToken, upload.single('file'), uploadFile);

module.exports = router;
