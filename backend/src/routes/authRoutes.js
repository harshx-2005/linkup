const express = require('express');
const { register, login, adminLogin, getMe, verifyOtp, resendOtp, forgotPassword, resetPassword } = require('../controllers/authController');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', verifyToken, getMe);
router.put('/update-profile', verifyToken, require('../controllers/authController').updateProfile);

module.exports = router;
