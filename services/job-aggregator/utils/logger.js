/**
 * Winston logger with structured output.
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, source, ...meta }) => {
      const src = source ? `[${source}]` : '';
      const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} ${level.toUpperCase().padEnd(5)} ${src} ${message}${extra}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, source, ...meta }) => {
          const src = source ? `[${source}]` : '';
          const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level} ${src} ${message}${extra}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 10,
    }),
  ],
});

/**
 * Create a child logger with a source tag.
 */
function createLogger(source) {
  return {
    info: (msg, meta = {}) => logger.info(msg, { source, ...meta }),
    warn: (msg, meta = {}) => logger.warn(msg, { source, ...meta }),
    error: (msg, meta = {}) => logger.error(msg, { source, ...meta }),
    debug: (msg, meta = {}) => logger.debug(msg, { source, ...meta }),
  };
}

module.exports = { logger, createLogger };
