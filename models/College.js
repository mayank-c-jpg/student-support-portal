/**
 * models/College.js
 * -----------------------------------------------------------------------
 * Represents a single college/institution in the multi-college
 * directory. Each college has its own courses (with individual fee
 * structures) plus free-text sections for admissions, placements,
 * internships, exams, scholarships, library, and campus facilities --
 * mirroring the same topics the chatbot answers about for a single
 * institution, but now scoped per college.
 * -----------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    tuitionFeePerYear: { type: Number, required: true, min: 0 },
    hostelFeePerYear: { type: Number, default: 0, min: 0 },
    examFeePerSemester: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const collegeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 500, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    contactPhone: { type: String, trim: true, maxlength: 30, default: '' },

    admissionProcess: { type: String, trim: true, maxlength: 3000, default: '' },
    placementInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    internshipInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    examInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    scholarshipInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    libraryInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    campusFacilities: { type: String, trim: true, maxlength: 3000, default: '' },

    courses: [courseSchema],

    isPublished: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

collegeSchema.index({ name: 'text', location: 'text' });

module.exports = mongoose.model('College', collegeSchema);
