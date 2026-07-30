/**
 * routes/chatRoutes.js
 * -----------------------------------------------------------------------
 * REST API routes for the Watson Assistant chatbot panel.
 * -----------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protectApi } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { chatMessageRules, handleValidation } = require('../utils/validators');
const { chatLimiter } = require('../middleware/rateLimitMiddleware');

router.use(protectApi);

router.post('/session', asyncHandler(chatController.startSession));
router.post(
  '/message',
  chatLimiter,
  chatMessageRules,
  handleValidation,
  asyncHandler(chatController.sendMessage)
);
router.get('/history', asyncHandler(chatController.getHistory));

module.exports = router;
