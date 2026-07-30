/**
 * routes/authRoutes.js
 * -----------------------------------------------------------------------
 * IBM App ID OAuth flow routes.
 *
 * Confirmed behavior (from live testing): after a successful token
 * exchange at /auth/callback, WebAppStrategy ALWAYS redirects the
 * browser back to wherever login was originally triggered from
 * (session[WebAppStrategy.ORIGINAL_URL] -- i.e. /auth/login or
 * /auth/register) -- it never hands off to a second chained handler
 * on the /callback route itself, no matter how that route is written.
 *
 * So /login and /register do double duty, matching IBM's documented
 * "protected resource" pattern:
 *   1st hit (not yet authenticated): passport.authenticate() redirects
 *      to App ID's hosted widget.
 *   2nd hit (App ID bounces back here, now authenticated -- this
 *      requires { keepSessionInfo: true }, without which passport's
 *      session regeneration wipes App ID's auth data and this 2nd hit
 *      would look unauthenticated again): passport.authenticate() sees
 *      a valid session and calls next(), reaching finalizeLogin, which
 *      provisions the local user profile and redirects to /dashboard
 *      (or wherever the user originally wanted to go).
 * -----------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { WebAppStrategy } = require('ibmcloud-appid');
const authController = require('../controllers/authController');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

router.get(
  '/login',
  authLimiter,
  authController.rememberReturnTo,
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, { keepSessionInfo: true }),
  asyncHandler(authController.finalizeLogin)
);

router.get(
  '/register',
  authLimiter,
  authController.rememberReturnTo,
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, { keepSessionInfo: true }),
  asyncHandler(authController.finalizeLogin)
);

router.get(
  '/callback',
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
    keepSessionInfo: true,
    failureRedirect: '/login',
  })
);

router.get('/logout', asyncHandler(authController.logout));

module.exports = router;
