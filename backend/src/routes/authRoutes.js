const express = require('express');
const { register, login, adminLogin, getMe } = require('../controllers/authController');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.get('/me', verifyToken, getMe);
router.put('/update-profile', verifyToken, require('../controllers/authController').updateProfile);

module.exports = router;
