/**
 * models/College.js
 * -----------------------------------------------------------------------
 * Represents a single college/institution in the multi-college
 * directory. Each college has its own courses (with individual fee
 * structures) plus free-text sections for admissions, placements,
 * internships, exams, scholarships, library, and campus facilities --
 * mirroring the same topics the chatbot answers about for a single
 * institution, but now scoped per college.
 *
 * EXTENDED for Bulk College Import: adds richer institutional detail
 * fields (location breakdown, rankings, accreditation, facilities,
 * placement stats, etc.) on top of the original fields used
 * throughout the app (name, examInfo, courses[].tuitionFeePerYear,
 * etc.), so existing features (chatbot answers, admin CRUD, the
 * public Browse Colleges page) keep working unchanged.
 * -----------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    duration: { type: String, trim: true, maxlength: 60, default: '' },
    eligibility: { type: String, trim: true, maxlength: 300, default: '' },
    tuitionFeePerYear: { type: Number, required: true, min: 0 },
    hostelFeePerYear: { type: Number, default: 0, min: 0 },
    examFeePerSemester: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const collegeSchema = new mongoose.Schema(
  {
    // ---------- Core identity ----------
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    state: { type: String, trim: true, maxlength: 100, default: '' },
    city: { type: String, trim: true, maxlength: 100, default: '' },
    district: { type: String, trim: true, maxlength: 100, default: '' },
    pincode: { type: String, trim: true, maxlength: 12, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 500, default: '' },
    website: { type: String, trim: true, maxlength: 300, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    contactPhone: { type: String, trim: true, maxlength: 30, default: '' },

    // ---------- Free-text topic sections (chatbot-facing) ----------
    admissionProcess: { type: String, trim: true, maxlength: 3000, default: '' },
    placementInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    internshipInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    examInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    scholarshipInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    libraryInfo: { type: String, trim: true, maxlength: 3000, default: '' },
    campusFacilities: { type: String, trim: true, maxlength: 3000, default: '' },
    hostelFacilities: { type: String, trim: true, maxlength: 3000, default: '' },
    transportFacilities: { type: String, trim: true, maxlength: 3000, default: '' },
    sportsFacilities: { type: String, trim: true, maxlength: 3000, default: '' },
    medicalFacilities: { type: String, trim: true, maxlength: 3000, default: '' },

    // ---------- Institutional profile ----------
    ranking: { type: String, trim: true, maxlength: 200, default: '' },
    accreditation: { type: String, trim: true, maxlength: 200, default: '' },
    affiliation: { type: String, trim: true, maxlength: 200, default: '' },
    establishedYear: { type: Number, default: null },
    ownership: { type: String, trim: true, maxlength: 100, default: '' }, // e.g. Government / Private / Deemed
    campusArea: { type: String, trim: true, maxlength: 100, default: '' }, // e.g. "50 acres"
    studentStrength: { type: Number, default: null },
    facultyStrength: { type: Number, default: null },

    // ---------- Placement stats ----------
    averagePackage: { type: String, trim: true, maxlength: 100, default: '' },
    highestPackage: { type: String, trim: true, maxlength: 100, default: '' },
    topRecruiters: { type: String, trim: true, maxlength: 1000, default: '' },

    courses: [courseSchema],

    isPublished: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

collegeSchema.index({ name: 'text', location: 'text' });

module.exports = mongoose.model('College', collegeSchema);
