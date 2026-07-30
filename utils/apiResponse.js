/**
 * utils/apiResponse.js
 * -----------------------------------------------------------------------
 * Provides consistent JSON response envelopes for all REST API endpoints.
 * -----------------------------------------------------------------------
 */

function success(res, statusCode, message, data = null) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function failure(res, statusCode, message, errors = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

module.exports = { success, failure };
