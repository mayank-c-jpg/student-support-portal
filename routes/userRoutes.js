/**
 * routes/userRoutes.js
 * -----------------------------------------------------------------------
 * REST API routes for the logged-in user's own profile.
 * -----------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const collegeController = require('../controllers/collegeController');
const { protectApi } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { profileUpdateRules, handleValidation } = require('../utils/validators');
const { body } = require('express-validator');

router.use(protectApi);

router.get('/me', asyncHandler(userController.getProfile));
router.put('/me', profileUpdateRules, handleValidation, asyncHandler(userController.updateProfile));

router.put(
  '/me/college',
  body('collegeId').optional({ nullable: true }).isMongoId().withMessage('collegeId must be a valid identifier'),
  handleValidation,
  asyncHandler(collegeController.selectCollege)
);

module.exports = router;
