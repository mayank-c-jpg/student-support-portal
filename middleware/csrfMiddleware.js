/**
 * middleware/csrfMiddleware.js
 * -----------------------------------------------------------------------
 * CSRF protection using the double-submit-cookie pattern via the
 * `csrf-csrf` package (actively maintained replacement for the
 * deprecated `csurf`). A token is issued as an HttpOnly=false cookie
 * plus made available to EJS views via res.locals.csrfToken so forms
 * and fetch() calls can send it back in the `x-csrf-token` header.
 * -----------------------------------------------------------------------
 */
const { doubleCsrf } = require('csrf-csrf');

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'insecure-dev-csrf-secret-change-me',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] || req.body?._csrf,
});

/** Issues/refreshes the CSRF token and exposes it to views/JSON responses. */
function attachCsrfToken(req, res, next) {
  try {
    const token = generateToken(req, res);
    res.locals.csrfToken = token;
  } catch (err) {
    return next(err);
  }
  return next();
}

module.exports = { attachCsrfToken, doubleCsrfProtection };
