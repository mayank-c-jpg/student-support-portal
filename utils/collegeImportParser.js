/**
 * utils/collegeImportParser.js
 * -----------------------------------------------------------------------
 * Parses an uploaded .xlsx or .csv file (as a Buffer, from multer's
 * in-memory storage) into raw spreadsheet rows, then validates and
 * normalizes each row into a College-shaped object ready for MongoDB
 * insertion.
 *
 * SPREADSHEET COLUMN FORMAT (header row, exact names, case-insensitive):
 *   collegeName, location, state, city, district, pincode,
 *   contactEmail, contactPhone, website, description,
 *   admissionProcess, placementInfo, internshipInfo, examinationInfo,
 *   scholarshipInfo, libraryInfo, campusFacilities, hostelFacilities,
 *   transportFacilities, sportsFacilities, medicalFacilities,
 *   ranking, accreditation, affiliation, establishedYear, ownership,
 *   campusArea, studentStrength, facultyStrength, averagePackage,
 *   highestPackage, topRecruiters, courses
 *
 * The "courses" column packs multiple courses into one cell using:
 *   CourseName:Duration:Eligibility:TuitionFee | CourseName2:...
 * e.g. "B.Tech CSE:4 Years:10+2 with PCM:85000|MCA:2 Years:Any Graduate:70000"
 * -----------------------------------------------------------------------
 */
const XLSX = require('xlsx');
const validator = require('validator');
const { sanitizeText } = require('./validators');

/** Reads an .xlsx/.csv Buffer into an array of header-keyed row objects. */
function parseWorkbookBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  // defval: '' ensures missing cells become empty strings rather than
  // being omitted from the row object entirely (simplifies validation).
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

/** Case-insensitive lookup of a column value regardless of header casing/spacing. */
function getField(row, ...names) {
  const keys = Object.keys(row);
  for (const name of names) {
    const key = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());
    if (key !== undefined && row[key] !== undefined && row[key] !== null) {
      return String(row[key]).trim();
    }
  }
  return '';
}

function toNumberOrNull(value) {
  if (value === '' || value === undefined || value === null) return null;
  const n = Number(String(value).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parses the packed "courses" cell into an array of course sub-docs.
 * Malformed individual course entries are silently skipped (lenient)
 * rather than failing the whole row -- a college with zero valid
 * courses parsed is still imported with an empty courses array.
 */
function parseCoursesCell(raw) {
  if (!raw) return [];
  return raw
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(':').map((p) => p.trim());
      const [name, duration = '', eligibility = '', feeStr = ''] = parts;
      const tuitionFeePerYear = toNumberOrNull(feeStr);
      if (!name || tuitionFeePerYear === null) return null;
      return {
        name: sanitizeText(name).slice(0, 120),
        duration: sanitizeText(duration).slice(0, 60),
        eligibility: sanitizeText(eligibility).slice(0, 300),
        tuitionFeePerYear,
        hostelFeePerYear: 0,
        examFeePerSemester: 0,
      };
    })
    .filter(Boolean);
}

const TEXT_FIELD_MAX = {
  description: 2000,
  admissionProcess: 3000,
  placementInfo: 3000,
  internshipInfo: 3000,
  examInfo: 3000,
  scholarshipInfo: 3000,
  libraryInfo: 3000,
  campusFacilities: 3000,
  hostelFacilities: 3000,
  transportFacilities: 3000,
  sportsFacilities: 3000,
  medicalFacilities: 3000,
};

/**
 * Validates and normalizes one raw spreadsheet row.
 * Returns { valid: true, data } or { valid: false, reason }.
 * Never throws -- a malformed row always resolves to a clean result
 * so one bad row can never crash the whole import.
 */
function validateAndNormalizeRow(row) {
  try {
    // Skip fully empty rows silently (not counted as failures).
    const allValues = Object.values(row).map((v) => String(v ?? '').trim());
    if (allValues.every((v) => v === '')) {
      return { valid: false, empty: true };
    }

    const name = getField(row, 'collegeName', 'college name', 'name');
    const state = getField(row, 'state');
    const city = getField(row, 'city');

    if (!name) return { valid: false, reason: 'Missing required field: collegeName' };
    if (!state) return { valid: false, reason: 'Missing required field: state' };
    if (!city) return { valid: false, reason: 'Missing required field: city' };

    const contactEmail = getField(row, 'contactEmail', 'email');
    if (contactEmail && !validator.isEmail(contactEmail)) {
      return { valid: false, reason: `Invalid email: ${contactEmail}` };
    }

    const website = getField(row, 'website');
    if (website && !validator.isURL(website, { require_protocol: false })) {
      return { valid: false, reason: `Invalid website URL: ${website}` };
    }

    const location = getField(row, 'location') || [city, state].filter(Boolean).join(', ');

    const data = {
      name: sanitizeText(name).slice(0, 200),
      location: sanitizeText(location).slice(0, 200),
      state: sanitizeText(state).slice(0, 100),
      city: sanitizeText(city).slice(0, 100),
      district: sanitizeText(getField(row, 'district')).slice(0, 100),
      pincode: sanitizeText(getField(row, 'pincode')).slice(0, 12),
      contactEmail: contactEmail.toLowerCase(),
      contactPhone: sanitizeText(getField(row, 'contactPhone', 'phone')).slice(0, 30),
      website,
      ranking: sanitizeText(getField(row, 'ranking')).slice(0, 200),
      accreditation: sanitizeText(getField(row, 'accreditation')).slice(0, 200),
      affiliation: sanitizeText(getField(row, 'affiliation')).slice(0, 200),
      establishedYear: toNumberOrNull(getField(row, 'establishedYear', 'established year')),
      ownership: sanitizeText(getField(row, 'ownership')).slice(0, 100),
      campusArea: sanitizeText(getField(row, 'campusArea', 'campus area')).slice(0, 100),
      studentStrength: toNumberOrNull(getField(row, 'studentStrength', 'student strength')),
      facultyStrength: toNumberOrNull(getField(row, 'facultyStrength', 'faculty strength')),
      averagePackage: sanitizeText(getField(row, 'averagePackage', 'average package')).slice(0, 100),
      highestPackage: sanitizeText(getField(row, 'highestPackage', 'highest package')).slice(0, 100),
      topRecruiters: sanitizeText(getField(row, 'topRecruiters', 'top recruiters')).slice(0, 1000),
      isPublished: true,
    };

    // examinationInfo (spreadsheet name) maps to examInfo (DB field name)
    // used by the chatbot answer service and rest of the app.
    data.examInfo = sanitizeText(getField(row, 'examinationInfo', 'examInfo', 'examination info')).slice(
      0,
      TEXT_FIELD_MAX.examInfo
    );

    for (const field of Object.keys(TEXT_FIELD_MAX)) {
      if (field === 'examInfo') continue; // already handled above
      data[field] = sanitizeText(getField(row, field)).slice(0, TEXT_FIELD_MAX[field]);
    }

    data.courses = parseCoursesCell(getField(row, 'courses'));

    return { valid: true, data };
  } catch (err) {
    return { valid: false, reason: `Unexpected error parsing row: ${err.message}` };
  }
}

module.exports = { parseWorkbookBuffer, validateAndNormalizeRow, parseCoursesCell };
