const express = require('express');
const router = express.Router();

const { optimizeSchedule } = require('../controllers/aiController');

// @route   POST /api/ai/optimize-schedule
// @desc    Optimize daily schedule using Gemini
router.post('/optimize-schedule', optimizeSchedule);

module.exports = router;
