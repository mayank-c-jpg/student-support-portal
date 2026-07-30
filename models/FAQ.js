/**
 * models/FAQ.js
 * -----------------------------------------------------------------------
 * Admin-managed FAQ content. Can be used to seed/inform Watson
 * Assistant's "FAQ" intent responses, and is also displayed directly
 * in the dashboard's FAQ section.
 * -----------------------------------------------------------------------
 */
const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      maxlength: 300,
    },
    answer: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: [
        'Admissions',
        'Courses',
        'Fees',
        'Placements',
        'Internships',
        'Examinations',
        'Scholarships',
        'Library',
        'Campus',
        'General',
      ],
      default: 'General',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FAQ', faqSchema);
