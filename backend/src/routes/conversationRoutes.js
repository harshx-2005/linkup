const express = require('express');
const {
    getConversations,
    createPrivateConversation,
    createGroupConversation,
    addGroupMember,
    removeGroupMember,
    leaveGroup,
    acceptConversation,
    rejectConversation,
    clearConversation,
    updateGroupInfo,
    promoteAdmin,
    dismissAdmin,
    createOrGetAiConversation
} = require('../controllers/conversationController');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/ai', verifyToken, createOrGetAiConversation); // [NEW] Meta AI Route

router.get('/', verifyToken, getConversations);
router.post('/private', verifyToken, createPrivateConversation);
router.post('/group', verifyToken, createGroupConversation);
router.post('/:conversationId/members', verifyToken, addGroupMember);
router.delete('/:conversationId/members/:userId', verifyToken, removeGroupMember);
router.post('/:conversationId/leave', verifyToken, leaveGroup);
router.post('/:conversationId/accept', verifyToken, acceptConversation);
router.post('/:conversationId/reject', verifyToken, rejectConversation);
router.post('/:conversationId/clear', verifyToken, clearConversation);
router.put('/:conversationId', verifyToken, updateGroupInfo);
router.put('/:conversationId/members/:userId/promote', verifyToken, promoteAdmin);
router.put('/:conversationId/members/:userId/dismiss', verifyToken, dismissAdmin);

// [NEW] Summarize Route (via MessageController)
const { summarizeConversation } = require('../controllers/messageController');
router.post('/:conversationId/summarize', verifyToken, summarizeConversation);

module.exports = router;
