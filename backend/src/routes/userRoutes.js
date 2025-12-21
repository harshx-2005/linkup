const express = require('express');
const { updateProfile, getUsers } = require('../controllers/userController');
const verifyToken = require('../middlewares/authMiddleware');

const router = express.Router();

router.put('/profile', verifyToken, updateProfile);
router.get('/', verifyToken, getUsers);

module.exports = router;
