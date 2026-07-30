/**
 * controllers/collegeController.js
 * -----------------------------------------------------------------------
 * Admin CRUD for the multi-college directory. Phase 1 of the
 * multi-college feature: admins add/edit/delete colleges and their
 * per-course fee structures here. A public browse/search endpoint for
 * students comes in a later phase.
 * -----------------------------------------------------------------------
 */
const College = require('../models/College');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { success, failure } = require('../utils/apiResponse');

/**
 * GET /api/colleges -- PUBLIC-FACING (any logged-in student).
 * Lists published colleges only, with optional text search across
 * name/location. Used by the "Browse Colleges" page.
 */
const browseColleges = async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    const filter = { isPublished: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const colleges = await College.find(filter).sort({ name: 1 }).lean();
    return success(res, 200, 'Colleges retrieved', { colleges });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/me/college -- sets (or clears) the current student's
 * selected college. { collegeId: "<id>" } or { collegeId: null }.
 */
const selectCollege = async (req, res, next) => {
  try {
    const { collegeId } = req.body;

    let college = null;
    if (collegeId) {
      college = await College.findOne({ _id: collegeId, isPublished: true }).lean();
      if (!college) return failure(res, 404, 'College not found or not published');
    }

    const user = await User.findByIdAndUpdate(
      req.currentUser._id,
      { selectedCollege: collegeId || null },
      { new: true }
    ).lean();

    req.session.localUser = user;

    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'PROFILE_UPDATE',
      details: college ? `Selected college "${college.name}"` : 'Cleared selected college',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    return success(res, 200, 'College selection updated', { user, college });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/colleges -- list all colleges (published + unpublished) */
const listColleges = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const [colleges, total] = await Promise.all([
      College.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      College.countDocuments(),
    ]);

    return success(res, 200, 'Colleges retrieved', {
      colleges,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/colleges/:id */
const getCollege = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id).lean();
    if (!college) return failure(res, 404, 'College not found');
    return success(res, 200, 'College retrieved', { college });
  } catch (err) {
    next(err);
  }
};

/** POST /api/admin/colleges */
const createCollege = async (req, res, next) => {
  try {
    const {
      name,
      location,
      logoUrl,
      description,
      contactEmail,
      contactPhone,
      admissionProcess,
      placementInfo,
      internshipInfo,
      examInfo,
      scholarshipInfo,
      libraryInfo,
      campusFacilities,
      courses,
      isPublished,
    } = req.body;

    const college = await College.create({
      name,
      location,
      logoUrl,
      description,
      contactEmail,
      contactPhone,
      admissionProcess,
      placementInfo,
      internshipInfo,
      examInfo,
      scholarshipInfo,
      libraryInfo,
      campusFacilities,
      courses: Array.isArray(courses) ? courses : [],
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      createdBy: req.currentUser._id,
    });

    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'ADMIN_ACTION',
      details: `Created college "${college.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    return success(res, 201, 'College created', { college });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/colleges/:id */
const updateCollege = async (req, res, next) => {
  try {
    const allowedFields = [
      'name',
      'location',
      'logoUrl',
      'description',
      'contactEmail',
      'contactPhone',
      'admissionProcess',
      'placementInfo',
      'internshipInfo',
      'examInfo',
      'scholarshipInfo',
      'libraryInfo',
      'campusFacilities',
      'courses',
      'isPublished',
    ];

    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = field === 'isPublished' ? Boolean(req.body[field]) : req.body[field];
      }
    }

    const college = await College.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!college) return failure(res, 404, 'College not found');

    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'ADMIN_ACTION',
      details: `Updated college "${college.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    return success(res, 200, 'College updated', { college });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/colleges/:id */
const deleteCollege = async (req, res, next) => {
  try {
    const college = await College.findByIdAndDelete(req.params.id).lean();
    if (!college) return failure(res, 404, 'College not found');

    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'ADMIN_ACTION',
      details: `Deleted college "${college.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    return success(res, 200, 'College deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  browseColleges,
  selectCollege,
  listColleges,
  getCollege,
  createCollege,
  updateCollege,
  deleteCollege,
};
