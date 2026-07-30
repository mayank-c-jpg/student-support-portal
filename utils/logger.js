/**
 * utils/logger.js
 * -----------------------------------------------------------------------
 * Minimal structured logger. Swap out for winston/pino in a larger
 * production deployment if needed -- kept dependency-free here.
 * -----------------------------------------------------------------------
 */
const levelColors = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  debug: '\x1b[35m',
};
const reset = '\x1b[0m';

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = levelColors[level] || '';
  // eslint-disable-next-line no-console
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`);
}

module.exports = {
  info: (msg) => log('info', msg),
  warn: (msg) => log('warn', msg),
  error: (msg) => log('error', msg),
  debug: (msg) => (process.env.NODE_ENV !== 'production' ? log('debug', msg) : null),
};
