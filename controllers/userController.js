/**
 * controllers/userController.js
 * -----------------------------------------------------------------------
 * REST API for the logged-in user's own profile.
 * -----------------------------------------------------------------------
 */
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { success, failure } = require('../utils/apiResponse');

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.currentUser._id).lean();
    if (!user) return failure(res, 404, 'User not found');
    return success(res, 200, 'Profile retrieved', { user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, course } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (course !== undefined) update.course = course;

    const user = await User.findByIdAndUpdate(req.currentUser._id, update, {
      new: true,
      runValidators: true,
    }).lean();

    req.session.localUser = user;

    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'PROFILE_UPDATE',
      details: 'User updated profile information',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    return success(res, 200, 'Profile updated successfully', { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile };
