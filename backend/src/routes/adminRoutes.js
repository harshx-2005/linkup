const express = require('express');
const { getAllUsers, deleteUser, getSystemStats } = require('../controllers/adminController');
const verifyToken = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/adminMiddleware');

const router = express.Router();

// All routes require login AND admin role
router.use(verifyToken, isAdmin);

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/stats', getSystemStats);

module.exports = router;
