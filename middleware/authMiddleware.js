/**
 * middleware/authMiddleware.js
 * -----------------------------------------------------------------------
 * Route guards built on top of `ibmcloud-appid`'s WebAppStrategy session
 * data. Also provides graceful handling of expired sessions and role
 * based (admin) access control.
 * -----------------------------------------------------------------------
 */
const { WebAppStrategy } = require('ibmcloud-appid');
const ActivityLog = require('../models/ActivityLog');
const { failure } = require('../utils/apiResponse');
const { findOrCreateLocalUser } = require('../services/appIdService');
const logger = require('../utils/logger');

/**
 * Ensures the incoming request belongs to an authenticated session.
 * Used for PAGE routes -> redirects to /login on failure.
 * Used for API routes -> returns 401 JSON on failure.
 */
function protectPage(req, res, next) {
  if (req.session && req.session[WebAppStrategy.AUTH_CONTEXT] && req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Session may have expired naturally
  req.flashMessage = 'Your session has expired. Please log in again.';
  return res.redirect('/login?expired=1');
}

function protectApi(req, res, next) {
  if (req.session && req.session[WebAppStrategy.AUTH_CONTEXT] && req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return failure(res, 401, 'Session expired or not authenticated. Please log in again.');
}

/**
 * Attaches req.currentUser (local Mongo profile) if available on session.
 *
 * Self-healing: IBM's App ID SDK controls its own post-login redirect
 * target internally and doesn't reliably hand off to a custom
 * "finalize" handler on the callback route. So instead of depending on
 * WHERE the browser lands right after login, we check on every single
 * page load: if a valid App ID session exists (AUTH_CONTEXT) but we
 * haven't provisioned/attached a local user profile yet, do it right
 * here. This means the header shows the logged-in user correctly no
 * matter which page App ID's SDK happens to redirect back to.
 */
async function attachCurrentUser(req, res, next) {
  try {
    const authContext = req.session[WebAppStrategy.AUTH_CONTEXT];
    if (!req.session.localUser && authContext) {
      // The actual shape of AUTH_CONTEXT (confirmed via /whoami-raw) is
      // { accessToken, accessTokenPayload, identityToken,
      //   identityTokenPayload, refreshToken } -- there is NO ".user"
      // property. req.user (set by passport.session() via our
      // pass-through deserializeUser) already holds the same claims
      // (sub, email, name, given_name, ...) as identityTokenPayload, so
      // prefer that with identityTokenPayload as a fallback.
      const appIdUser = req.user || authContext.identityTokenPayload;
      req.session.localUser = await findOrCreateLocalUser(appIdUser, req);
    }
  } catch (err) {
    logger.error(`Auto-provisioning local user failed: ${err.message}`);
  }
  res.locals.currentUser = req.session.localUser || null;
  req.currentUser = req.session.localUser || null;
  next();
}

function requireAdminPage(req, res, next) {
  if (req.currentUser && req.currentUser.role === 'admin') {
    return next();
  }
  return res.status(403).render('404', { title: 'Access Denied', currentUser: req.currentUser });
}

async function requireAdminApi(req, res, next) {
  if (req.currentUser && req.currentUser.role === 'admin') {
    return next();
  }
  if (req.currentUser) {
    await ActivityLog.create({
      user: req.currentUser._id,
      action: 'ADMIN_ACTION',
      details: 'Unauthorized attempt to access admin API',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
  }
  return failure(res, 403, 'Administrator privileges are required for this action.');
}

module.exports = {
  protectPage,
  protectApi,
  attachCurrentUser,
  requireAdminPage,
  requireAdminApi,
};
