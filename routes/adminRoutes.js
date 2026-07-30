/**
 * routes/adminRoutes.js
 * -----------------------------------------------------------------------
 * REST API routes for the admin panel. All routes require an
 * authenticated session AND role === 'admin'.
 * -----------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const collegeController = require('../controllers/collegeController');
const { protectApi, requireAdminApi } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { faqRules, collegeRules, mongoIdParamRule, handleValidation } = require('../utils/validators');

router.use(protectApi, requireAdminApi);

// Users
router.get('/users', asyncHandler(adminController.listUsers));
router.patch(
  '/users/:id/status',
  mongoIdParamRule('id'),
  handleValidation,
  asyncHandler(adminController.setUserActiveStatus)
);

// Usage statistics
router.get('/stats', asyncHandler(adminController.usageStats));

// Chat moderation
router.get('/chats', asyncHandler(adminController.listChats));
router.patch(
  '/chats/:id/flag',
  mongoIdParamRule('id'),
  handleValidation,
  asyncHandler(adminController.flagChat)
);
router.delete(
  '/chats/:id',
  mongoIdParamRule('id'),
  handleValidation,
  asyncHandler(adminController.deleteChat)
);

// FAQ management
router.get('/faqs', asyncHandler(adminController.listFaqs));
router.post('/faqs', faqRules, handleValidation, asyncHandler(adminController.createFaq));
router.put(
  '/faqs/:id',
  mongoIdParamRule('id'),
  handleValidation,
  asyncHandler(adminController.updateFaq)
);
router.delete(
  '/faqs/:id',
  mongoIdParamRule('id'),
  handleValidation,
  asyncHandler(adminController.deleteFaq)
);

// College directory management (multi-college feature)
router.get('/colleges', asyncHandler(collegeController.listColleges));
router.post('/colleges', collegeRules, handleValidation, asyncHandler(collegeController.createCollege));
router.get(
  '/colleges/:id',
  mongoIdParamRule('id'),
  handleValidation,
  asyncHandler(collegeController.getCollege)
);
router.put(
  '/colleges/:id',
  mongoIdParamRule('id'),
  collegeRules,
  handleValidation,
  asyncHandler(collegeController.updateCollege)
);
router.delete(
  '/colleges/:id',
  mongoIdParamRule('id'),
  handleValidation,
  asyncHandler(collegeController.deleteCollege)
);

module.exports = router;
