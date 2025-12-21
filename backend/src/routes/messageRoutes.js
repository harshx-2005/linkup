const express = require('express');
const { getMessages, sendMessage, markMessagesAsSeen, markMessagesAsDelivered, deleteMessage, editMessage } = require('../controllers/messageController');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/:conversationId', verifyToken, getMessages);
router.post('/send', verifyToken, sendMessage);
router.post('/seen', verifyToken, markMessagesAsSeen);
router.post('/delivered', verifyToken, markMessagesAsDelivered);
router.delete('/:id', verifyToken, deleteMessage);
router.put('/:id', verifyToken, editMessage);

module.exports = router;
