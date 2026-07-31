/**
 * middleware/uploadMiddleware.js
 * -----------------------------------------------------------------------
 * Multer configuration for the Bulk College Import feature. Accepts a
 * single Excel (.xlsx) or CSV (.csv) file, kept entirely in memory
 * (no disk writes) since files are parsed immediately and never need
 * to persist -- this also avoids leaving orphaned temp files around.
 * -----------------------------------------------------------------------
 */
const multer = require('multer');

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB, per requirements

const ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // some browsers report .xlsx/.csv as this
  'text/csv',
  'application/csv',
  'text/plain', // some browsers report .csv as this
]);

const ALLOWED_EXTENSIONS = /\.(xlsx|csv)$/i;

function fileFilter(req, file, cb) {
  const extensionOk = ALLOWED_EXTENSIONS.test(file.originalname || '');
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);

  if (extensionOk || mimeOk) {
    return cb(null, true);
  }
  return cb(new Error('Only .xlsx or .csv files are allowed.'));
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter,
});

/** Express middleware: expects the file under form field name "file". */
const uploadCollegeFile = upload.single('file');

/**
 * Wraps multer's callback-style middleware so upload errors (wrong
 * file type, too large, etc.) come back as a clean JSON error instead
 * of an unhandled exception or a raw Multer error page.
 */
function handleUploadErrors(req, res, next) {
  uploadCollegeFile(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File is too large. Maximum upload size is 100 MB.',
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next();
  });
}

module.exports = { handleUploadErrors, MAX_UPLOAD_BYTES };
