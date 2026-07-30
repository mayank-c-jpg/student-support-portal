/**
 * routes/collegeRoutes.js
 * -----------------------------------------------------------------------
 * Student-facing (any logged-in user) routes for browsing published
 * colleges. Admin CRUD for colleges lives separately under
 * /api/admin/colleges (see routes/adminRoutes.js).
 * -----------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const collegeController = require('../controllers/collegeController');
const { protectApi } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');

router.use(protectApi);

router.get('/', asyncHandler(collegeController.browseColleges));

module.exports = router;
