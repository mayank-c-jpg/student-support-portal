/**
 * config/db.js
 * -----------------------------------------------------------------------
 * Establishes and exports the MongoDB connection using Mongoose.
 * -----------------------------------------------------------------------
 */
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(uri, {
      // Modern mongoose (>=6) no longer needs useNewUrlParser/useUnifiedTopology
      serverSelectionTimeoutMS: 10000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB initial connection failed: ${error.message}`);
    // Fail fast in production, but allow the process to exit cleanly
    process.exit(1);
  }
};

module.exports = connectDB;
