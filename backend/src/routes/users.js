const express = require('express');
const router = express.Router();
const {
  getOrCreateUser,
  getUserByEmail,
} = require('../controllers/userController');

// @route   POST /api/users/get-or-create
// @desc    Get or create user
router.post('/get-or-create', getOrCreateUser);

// @route   GET /api/users/:email
// @desc    Get user by email
router.get('/:email', getUserByEmail);

module.exports = router;

