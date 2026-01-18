const express = require('express');
const { getMessages, sendMessage, markMessagesAsSeen, markMessagesAsDelivered, deleteMessage, editMessage, getSmartReplies, summarizeConversation, rewriteMessage, translateMessage, transcribeAudioMessage } = require('../controllers/messageController');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/:conversationId', verifyToken, getMessages);
// Protected user routes
router.post('/send', verifyToken, sendMessage);

// Internal/Bot routes (Unprotected or API Key protected in future)
router.post('/bot', sendMessage);
router.post('/seen', verifyToken, markMessagesAsSeen);
router.post('/delivered', verifyToken, markMessagesAsDelivered);
router.delete('/:id', verifyToken, deleteMessage);
router.put('/:id', verifyToken, editMessage);
router.post('/smart-replies', verifyToken, getSmartReplies);
router.post('/summarize', verifyToken, summarizeConversation);
router.post('/rewrite', verifyToken, rewriteMessage);
router.post('/translate', verifyToken, translateMessage);
router.post('/transcribe', verifyToken, transcribeAudioMessage);

module.exports = router;
