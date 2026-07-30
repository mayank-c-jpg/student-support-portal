/**
 * utils/seedAdmin.js
 * -----------------------------------------------------------------------
 * One-off script: `npm run seed:admin -- user@example.com`
 * Promotes an existing (already-registered-via-App-ID) user to the
 * "admin" role by email address. Run this after the user has logged
 * in at least once so their User document exists.
 * -----------------------------------------------------------------------
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const logger = require('./logger');

async function run() {
  const email = process.argv[2];
  if (!email) {
    logger.error('Usage: npm run seed:admin -- <email>');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: 'admin' },
    { new: true }
  );

  if (!user) {
    logger.error(`No user found with email ${email}. Ask them to log in once first.`);
  } else {
    logger.info(`User ${user.email} promoted to admin.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run();
