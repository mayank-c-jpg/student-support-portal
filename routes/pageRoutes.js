/**
 * routes/pageRoutes.js
 * -----------------------------------------------------------------------
 * Server-rendered EJS page routes.
 * -----------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { protectPage, requireAdminPage } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');

router.get('/', pageController.landing);
router.get('/login', pageController.loginPage);
router.get('/register', pageController.registerPage);

router.get('/dashboard', protectPage, asyncHandler(pageController.dashboard));
router.get('/profile', protectPage, pageController.profilePage);
router.get('/colleges', protectPage, asyncHandler(pageController.collegesPage));

router.get(
  '/admin',
  protectPage,
  requireAdminPage,
  asyncHandler(pageController.adminDashboard)
);

module.exports = router;
