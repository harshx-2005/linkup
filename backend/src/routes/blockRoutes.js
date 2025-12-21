const express = require('express');
const { blockUser, unblockUser, getBlockedUsers } = require('../controllers/blockController');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/block', verifyToken, blockUser);
router.post('/unblock', verifyToken, unblockUser);
router.get('/', verifyToken, getBlockedUsers);

module.exports = router;
