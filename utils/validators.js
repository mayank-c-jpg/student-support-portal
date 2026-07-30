/**
 * utils/validators.js
 * -----------------------------------------------------------------------
 * Reusable express-validator chains and a basic XSS-sanitizing helper
 * for free-text fields (chat messages, FAQ content, profile fields).
 * -----------------------------------------------------------------------
 */
const { body, param, validationResult } = require('express-validator');
const xss = require('xss');
const { failure } = require('./apiResponse');

/** Strips dangerous HTML/script content from arbitrary user text. */
function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return xss(value.trim(), {
    whiteList: {}, // no tags allowed at all
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });
}

/** Middleware that terminates the request with 422 if validation failed. */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return failure(res, 422, 'Validation failed', errors.array());
  }
  return next();
}

const chatMessageRules = [
  body('message')
    .exists({ checkFalsy: true })
    .withMessage('Message is required')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
    .customSanitizer(sanitizeText),
  body('sessionId').optional().isString().trim().isLength({ max: 200 }),
];

const faqRules = [
  body('question')
    .exists({ checkFalsy: true })
    .isString()
    .isLength({ min: 3, max: 300 })
    .customSanitizer(sanitizeText),
  body('answer')
    .exists({ checkFalsy: true })
    .isString()
    .isLength({ min: 3, max: 2000 })
    .customSanitizer(sanitizeText),
  body('category').optional().isString().isLength({ max: 100 }).customSanitizer(sanitizeText),
];

const mongoIdParamRule = (paramName = 'id') =>
  param(paramName).isMongoId().withMessage(`${paramName} must be a valid identifier`);

const profileUpdateRules = [
  body('name').optional().isString().isLength({ min: 1, max: 120 }).customSanitizer(sanitizeText),
  body('phone').optional().isString().isLength({ max: 20 }).customSanitizer(sanitizeText),
  body('course').optional().isString().isLength({ max: 120 }).customSanitizer(sanitizeText),
];

/** Free-text long-form fields shared across a College document. */
const collegeTextField = (field, max = 3000) =>
  body(field).optional({ nullable: true }).isString().isLength({ max }).customSanitizer(sanitizeText);

const collegeRules = [
  body('name')
    .exists({ checkFalsy: true })
    .withMessage('College name is required')
    .isString()
    .isLength({ min: 2, max: 200 })
    .customSanitizer(sanitizeText),
  body('location').optional().isString().isLength({ max: 200 }).customSanitizer(sanitizeText),
  body('logoUrl').optional({ nullable: true, checkFalsy: true }).isURL().withMessage('Logo URL must be a valid URL'),
  collegeTextField('description', 2000),
  body('contactEmail').optional({ checkFalsy: true }).isEmail().withMessage('Contact email must be valid').normalizeEmail(),
  body('contactPhone').optional().isString().isLength({ max: 30 }).customSanitizer(sanitizeText),
  collegeTextField('admissionProcess'),
  collegeTextField('placementInfo'),
  collegeTextField('internshipInfo'),
  collegeTextField('examInfo'),
  collegeTextField('scholarshipInfo'),
  collegeTextField('libraryInfo'),
  collegeTextField('campusFacilities'),
  body('isPublished').optional().isBoolean().withMessage('isPublished must be true or false'),
  body('courses').optional().isArray().withMessage('Courses must be an array'),
  body('courses.*.name')
    .if(body('courses').exists())
    .exists({ checkFalsy: true })
    .withMessage('Each course must have a name')
    .isString()
    .isLength({ max: 120 })
    .customSanitizer(sanitizeText),
  body('courses.*.tuitionFeePerYear')
    .if(body('courses').exists())
    .exists()
    .withMessage('Each course must have a tuition fee')
    .isFloat({ min: 0 })
    .withMessage('Tuition fee must be a non-negative number'),
  body('courses.*.hostelFeePerYear').optional().isFloat({ min: 0 }).withMessage('Hostel fee must be a non-negative number'),
  body('courses.*.examFeePerSemester').optional().isFloat({ min: 0 }).withMessage('Exam fee must be a non-negative number'),
];

module.exports = {
  sanitizeText,
  handleValidation,
  chatMessageRules,
  faqRules,
  mongoIdParamRule,
  profileUpdateRules,
  collegeRules,
};
