/**
 * models/ActivityLog.js
 * -----------------------------------------------------------------------
 * Tracks user activity for security auditing and admin analytics
 * (logins, logouts, chat usage, profile updates, etc).
 * -----------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'REGISTER',
        'PROFILE_UPDATE',
        'CHAT_MESSAGE',
        'SESSION_EXPIRED',
        'ADMIN_ACTION',
      ],
    },
    details: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
