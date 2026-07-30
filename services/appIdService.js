/**
 * services/appIdService.js
 * -----------------------------------------------------------------------
 * Business logic that bridges IBM App ID identity tokens with our local
 * MongoDB `User` collection ("just-in-time provisioning"): the first
 * time a user successfully authenticates via App ID, we create a
 * matching profile document; on subsequent logins we simply update it.
 * -----------------------------------------------------------------------
 */
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/**
 * Extracts a normalized identity object from the App ID identity token
 * payload that `ibmcloud-appid` places on req.session (via WebAppStrategy).
 */
function extractIdentity(appIdUser) {
  if (!appIdUser) return null;
  return {
    subject: appIdUser.sub,
    email: (appIdUser.email || (appIdUser.identities && appIdUser.identities[0]?.id) || '')
      .toString()
      .toLowerCase(),
    name: appIdUser.name || appIdUser.given_name || (appIdUser.email || '').split('@')[0],
  };
}

/**
 * Find-or-create the local profile for an authenticated App ID user,
 * then record a LOGIN activity entry and bump lastLoginAt.
 */
async function findOrCreateLocalUser(appIdUser, req) {
  const identity = extractIdentity(appIdUser);
  if (!identity || !identity.subject) {
    throw new Error('Invalid App ID identity payload');
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  let user = await User.findOne({ appIdSubject: identity.subject });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await User.create({
      appIdSubject: identity.subject,
      email: identity.email,
      name: identity.name,
      role: adminEmails.includes(identity.email) ? 'admin' : 'student',
      lastLoginAt: new Date(),
    });
    logger.info(`Provisioned new local user profile for ${identity.email}`);
  } else {
    user.lastLoginAt = new Date();
    if (adminEmails.includes(identity.email) && user.role !== 'admin') {
      user.role = 'admin';
    }
    await user.save();
  }

  await ActivityLog.create({
    user: user._id,
    action: isNewUser ? 'REGISTER' : 'LOGIN',
    details: isNewUser ? 'First-time App ID login (profile provisioned)' : 'User logged in',
    ipAddress: req?.ip || '',
    userAgent: req?.headers?.['user-agent'] || '',
  });

  return user;
}

module.exports = { extractIdentity, findOrCreateLocalUser };
