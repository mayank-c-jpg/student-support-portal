/**
 * controllers/authController.js
 * -----------------------------------------------------------------------
 * Handles the IBM App ID OAuth 2.0 / OIDC login flow.
 *
 * IMPORTANT (per IBM's own ibmcloud-appid documentation): after a
 * successful callback exchange, WebAppStrategy redirects the browser
 * back to session[WebAppStrategy.ORIGINAL_URL] -- the URL that
 * originally triggered authentication -- BEFORE it ever considers a
 * `successRedirect` option. Since our login/register buttons trigger
 * auth from GET /auth/login, that means the browser always lands back
 * on /auth/login after a successful login, now WITH a valid session.
 *
 * So /auth/login does double duty, matching IBM's documented
 * "protected resource" pattern:
 *   1st hit (unauthenticated): passport.authenticate() redirects to
 *      App ID's hosted widget and remembers this URL as ORIGINAL_URL.
 *   2nd hit (after App ID redirects back here, now authenticated):
 *      passport.authenticate() sees a valid session and simply calls
 *      next(), reaching `finalizeLogin` below, which provisions the
 *      local user profile and redirects to the real destination
 *      (/dashboard, or wherever the user originally wanted to go).
 * -----------------------------------------------------------------------
 */
const { WebAppStrategy } = require('ibmcloud-appid');
const { findOrCreateLocalUser } = require('../services/appIdService');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/** Stashes the desired post-login destination before kicking off auth. */
const rememberReturnTo = (req, res, next) => {
    req.session.returnTo = req.query.returnTo || '/dashboard';
    next();
};

/**
 * Runs only once the browser has come back from App ID with a valid
 * authenticated session (see module doc comment above). Provisions/
 * updates the local MongoDB user profile, then redirects to the
 * user's intended destination.
 */
const finalizeLogin = async(req, res, next) => {
    try {
        logger.info("===== FINALIZE LOGIN CALLED =====");
        logger.info("req.user:");
        logger.info(JSON.stringify(req.user, null, 2));

        const authContext = req.session[WebAppStrategy.AUTH_CONTEXT];

        logger.info("AUTH_CONTEXT:");
        logger.info(JSON.stringify(authContext, null, 2));

        const appIdUser =
            req.user ||
            (authContext && authContext.identityTokenPayload);

        if (!appIdUser) {
            logger.error("No App ID user found");
            return res.redirect("/login");
        }

        const localUser = await findOrCreateLocalUser(appIdUser, req);

        req.session.localUser = localUser;

        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        return res.redirect("/dashboard");
    } catch (err) {
        logger.error(err);
        next(err);
    }
};

/**
 * Logs the user out by destroying the local Express session, which
 * removes both WebAppStrategy.AUTH_CONTEXT and our own localUser data.
 *
 * NOTE: We deliberately do NOT call WebAppStrategy.logout(req) here.
 * That helper internally calls the older, callback-less req.logout()
 * signature, which newer passport versions (0.6+) reject with
 * "req#logout requires a callback function" -- a real incompatibility
 * between the installed ibmcloud-appid and passport versions. Simply
 * destroying the session achieves the same practical result (the user
 * is fully logged out of this app) without touching that broken path.
 */
const logout = async(req, res, next) => {
    try {
        if (req.currentUser) {
            await ActivityLog.create({
                user: req.currentUser._id,
                action: 'LOGOUT',
                details: 'User logged out',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] || '',
            });
        }

        req.session.destroy((err) => {
            if (err) {
                logger.error(`Error destroying session on logout: ${err.message}`);
            }
            res.clearCookie('connect.sid');
            return res.redirect('/');
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = { rememberReturnTo, finalizeLogin, logout };