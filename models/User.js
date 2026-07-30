/**
 * models/User.js
 * -----------------------------------------------------------------------
 * Stores the local profile record linked to an IBM App ID identity.
 * The App ID `sub` (subject) claim is the permanent unique identifier
 * for the user; email/password credentials themselves are never
 * stored here since App ID's Cloud Directory manages them securely.
 * -----------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    appIdSubject: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    course: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    /** The college a student has selected -- drives college-scoped
     *  chatbot answers (see Phase 3 of the multi-college feature). */
    selectedCollege: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
