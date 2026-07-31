/**
 * controllers/collegeImportController.js
 * -----------------------------------------------------------------------
 * Bulk College Import: admins upload an .xlsx/.csv file containing
 * hundreds or thousands of colleges; every row is validated and
 * normalized (see utils/collegeImportParser.js), duplicates (against
 * both the existing database AND other rows in the same file) are
 * skipped, and everything else is inserted in one bulk operation.
 * -----------------------------------------------------------------------
 */
const XLSX = require('xlsx');
const College = require('../models/College');
const ActivityLog = require('../models/ActivityLog');
const { parseWorkbookBuffer, validateAndNormalizeRow } = require('../utils/collegeImportParser');
const { success, failure } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const dupKey = (name, state, city) => `${name}|${state}|${city}`.toLowerCase();

/**
 * POST /api/admin/import-colleges
 * multipart/form-data, field name "file" (.xlsx or .csv, up to 100MB).
 */
const importColleges = async (req, res, next) => {
  try {
    if (!req.file) {
      return failure(res, 400, 'No file uploaded. Please choose a .xlsx or .csv file.');
    }

    let rawRows;
    try {
      rawRows = parseWorkbookBuffer(req.file.buffer);
    } catch (parseErr) {
      logger.error(`College import: failed to parse uploaded file: ${parseErr.message}`);
      return failure(res, 400, 'Could not read the uploaded file. Please make sure it is a valid .xlsx or .csv file.');
    }

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return failure(res, 400, 'The uploaded file has no data rows.');
    }

    // Existing colleges, for duplicate detection against the database.
    const existing = await College.find({}, 'name state city').lean();
    const existingKeys = new Set(
      existing.map((c) => dupKey(c.name || '', c.state || '', c.city || ''))
    );

    const seenInFile = new Set();
    const toInsert = [];
    const failedRows = [];
    let skipped = 0;
    let emptySkipped = 0;

    rawRows.forEach((row, index) => {
      const result = validateAndNormalizeRow(row);

      if (result.empty) {
        emptySkipped += 1;
        return;
      }

      if (!result.valid) {
        failedRows.push({ row: index + 2, reason: result.reason }); // +2: header row + 1-indexed
        return;
      }

      const key = dupKey(result.data.name, result.data.state, result.data.city);
      if (existingKeys.has(key) || seenInFile.has(key)) {
        skipped += 1;
        return;
      }

      seenInFile.add(key);
      toInsert.push({ ...result.data, createdBy: req.currentUser._id });
    });

    let insertedCount = 0;
    if (toInsert.length > 0) {
      const insertResult = await College.insertMany(toInsert, { ordered: false });
      insertedCount = insertResult.length;
    }

    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'ADMIN_ACTION',
      details: `Bulk imported colleges from "${req.file.originalname}": ${insertedCount} imported, ${skipped} duplicates skipped, ${failedRows.length} failed`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    return success(res, 200, 'Import complete', {
      imported: insertedCount,
      skipped,
      failed: failedRows.length,
      emptyRowsSkipped: emptySkipped,
      totalRowsProcessed: rawRows.length,
      // Cap the detail list so a huge file with many bad rows doesn't
      // bloat the response -- the counts above are always accurate.
      failedDetails: failedRows.slice(0, 50),
    });
  } catch (err) {
    logger.error(`College bulk import failed: ${err.message}`);
    return failure(res, 500, 'Import failed due to a server error. Please try again.');
  }
};

/**
 * GET /api/admin/sample-college-file
 * Generates and streams a small .xlsx template with the correct
 * headers and a couple of example rows, so admins know the expected
 * format before preparing a large import file.
 */
const downloadSampleFile = async (req, res, next) => {
  try {
    const headers = [
      'collegeName', 'location', 'state', 'city', 'district', 'pincode',
      'contactEmail', 'contactPhone', 'website', 'description',
      'admissionProcess', 'placementInfo', 'internshipInfo', 'examinationInfo',
      'scholarshipInfo', 'libraryInfo', 'campusFacilities', 'hostelFacilities',
      'transportFacilities', 'sportsFacilities', 'medicalFacilities',
      'ranking', 'accreditation', 'affiliation', 'establishedYear', 'ownership',
      'campusArea', 'studentStrength', 'facultyStrength', 'averagePackage',
      'highestPackage', 'topRecruiters', 'courses',
    ];

    const sampleRows = [
      {
        collegeName: 'Indian Institute of Technology Delhi',
        location: 'New Delhi, Delhi',
        state: 'Delhi',
        city: 'New Delhi',
        district: 'South Delhi',
        pincode: '110016',
        contactEmail: 'info@admin.iitd.ac.in',
        contactPhone: '011-26591999',
        website: 'https://home.iitd.ac.in',
        description: 'One of India\'s premier engineering and technology institutes.',
        admissionProcess: 'Admission through JEE Advanced for B.Tech; GATE for M.Tech.',
        placementInfo: 'Over 90% placement rate with top national and international recruiters.',
        internshipInfo: 'Summer internships available from 3rd year via the Training & Placement Cell.',
        examinationInfo: 'Semester exams held in November-December and April-May.',
        scholarshipInfo: 'Merit-cum-means scholarships and government schemes available.',
        libraryInfo: 'Central Library open 24/7 during semesters with digital journal access.',
        campusFacilities: 'Wi-Fi campus, auditoriums, research labs, and innovation centers.',
        hostelFacilities: '19 hostels for undergraduate and postgraduate students.',
        transportFacilities: 'Campus shuttle service and nearby metro connectivity.',
        sportsFacilities: 'Olympic-size swimming pool, gymnasium, and multiple sports grounds.',
        medicalFacilities: 'On-campus hospital with 24/7 emergency services.',
        ranking: 'NIRF Rank 2 (Engineering, 2024)',
        accreditation: 'NAAC A++',
        affiliation: 'Institute of National Importance',
        establishedYear: 1961,
        ownership: 'Government',
        campusArea: '320 acres',
        studentStrength: 8500,
        facultyStrength: 600,
        averagePackage: '21 LPA',
        highestPackage: '2.5 Crore PA',
        topRecruiters: 'Google, Microsoft, Goldman Sachs, McKinsey, ISRO',
        courses: 'B.Tech CSE:4 Years:JEE Advanced:250000|M.Tech CSE:2 Years:GATE:150000|MBA:2 Years:CAT:400000',
      },
      {
        collegeName: 'Vellore Institute of Technology',
        location: 'Vellore, Tamil Nadu',
        state: 'Tamil Nadu',
        city: 'Vellore',
        district: 'Vellore',
        pincode: '632014',
        contactEmail: 'admissions@vit.ac.in',
        contactPhone: '0416-2202020',
        website: 'https://vit.ac.in',
        description: 'A leading private deemed university known for engineering and technology.',
        admissionProcess: 'Admission through VITEEE entrance examination.',
        placementInfo: 'Strong placement record with 400+ recruiting companies annually.',
        internshipInfo: 'Mandatory internship program with industry partners.',
        examinationInfo: 'Continuous assessment with FAT (Final Assessment Test) each semester.',
        scholarshipInfo: 'Merit scholarships for top VITEEE rank holders.',
        libraryInfo: 'Central library with over 200,000 volumes and digital resources.',
        campusFacilities: 'Smart classrooms, research parks, and innovation labs.',
        hostelFacilities: 'Separate hostels for men and women with mess facilities.',
        transportFacilities: 'University bus service across the city.',
        sportsFacilities: 'Cricket ground, basketball courts, and indoor stadium.',
        medicalFacilities: '24/7 on-campus medical center.',
        ranking: 'NIRF Rank 11 (Engineering, 2024)',
        accreditation: 'NAAC A++',
        affiliation: 'Deemed University (UGC)',
        establishedYear: 1984,
        ownership: 'Private',
        campusArea: '360 acres',
        studentStrength: 30000,
        facultyStrength: 1800,
        averagePackage: '7.5 LPA',
        highestPackage: '41 LPA',
        topRecruiters: 'TCS, Infosys, Amazon, Cognizant, Wipro',
        courses: 'B.Tech CSE:4 Years:VITEEE:198000|BCA:3 Years:12th pass:120000',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Colleges');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="college-import-sample.xlsx"');
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

module.exports = { importColleges, downloadSampleFile };
