/**
 * config/appId.js
 * -----------------------------------------------------------------------
 * Configures IBM Cloud App ID authentication using the official
 * `ibmcloud-appid` SDK together with Passport.js.
 *
 * App ID's "Cloud Directory" identity provider supplies native
 * email/password registration & login through App ID's own hosted,
 * secure sign-in/sign-up widget. Our app never sees or stores raw
 * passwords -- App ID performs authentication and returns signed
 * OIDC tokens (id_token / access_token) to our redirect callback.
 * This is the recommended, most secure integration pattern for App ID.
 * -----------------------------------------------------------------------
 */
const passport = require('passport');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;
const logger = require('../utils/logger');

const APPID_CONFIG = {
  tenantId: process.env.APPID_TENANT_ID,
  clientId: process.env.APPID_CLIENT_ID,
  secret: process.env.APPID_SECRET,
  oauthServerUrl: process.env.APPID_OAUTH_SERVER_URL,
  redirectUri: process.env.APPID_REDIRECT_URI,
};

function configureAppId() {
  if (!APPID_CONFIG.tenantId || !APPID_CONFIG.clientId || !APPID_CONFIG.secret) {
    logger.warn(
      'IBM App ID credentials are not fully configured. ' +
        'Authentication routes will not work until APPID_* env vars are set.'
    );
  }

  passport.use(
    new WebAppStrategy({
      tenantId: APPID_CONFIG.tenantId,
      clientId: APPID_CONFIG.clientId,
      secret: APPID_CONFIG.secret,
      oauthServerUrl: APPID_CONFIG.oauthServerUrl,
      redirectUri: APPID_CONFIG.redirectUri,
    })
  );

  // Serialize only the minimal identity data into the session
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((obj, cb) => cb(null, obj));

  return passport;
}

module.exports = { configureAppId, WebAppStrategy, APPID_CONFIG };
