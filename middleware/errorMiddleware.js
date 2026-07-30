/**
 * middleware/errorMiddleware.js
 * -----------------------------------------------------------------------
 * Centralized 404 + error handling middleware. Ensures API clients get
 * clean JSON errors and browser clients get a rendered error page,
 * while never leaking stack traces in production.
 * -----------------------------------------------------------------------
 */
const logger = require('../utils/logger');

function notFoundHandler(req, res, next) {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }
  return res.status(404).render('404', { title: 'Page Not Found', currentUser: req.currentUser || null });
}

// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.debug(err.stack);
  }

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 500 ? 'Internal server error' : err.message,
      errors: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });
  }

  return res.status(statusCode).render('error', {
    title: 'Something went wrong',
    message: statusCode === 500 ? 'Internal server error' : err.message,
    currentUser: req.currentUser || null,
  });
}

/** Wraps async route handlers so rejected promises reach globalErrorHandler. */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { notFoundHandler, globalErrorHandler, asyncHandler };
