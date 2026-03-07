/**
 * Production-ready Winston Logger Configuration
 * Replaces console.log throughout S4Ai with structured logging
 * 
 * Log Levels (from highest to lowest priority):
 * - error: Error events that might still allow the application to continue
 * - warn: Warning events (deprecated APIs, poor use of API, undesirable things)
 * - info: Informational messages highlighting progress
 * - http: HTTP request logging
 * - debug: Detailed information for debugging (dev only)
 * 
 * Usage:
 *   import logger from './logger.js';
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('Database connection failed', { error: err.message });
 *   logger.debug('Processing request', { requestId, userId });
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Ensure logs directory exists
const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';
const isDevelopment = nodeEnv === 'development';

// Custom format for console output (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Remove internal winston properties
      const { timestamp: _, level: __, message: ___, ...cleanMeta } = meta;
      if (Object.keys(cleanMeta).length > 0) {
        msg += ` ${JSON.stringify(cleanMeta)}`;
      }
    }

    return msg;
  })
);

// JSON format for file output (machine-readable)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: logLevel,
    format: consoleFormat
  })
);

// Check if running on Railway - disable file transports to reduce I/O and log spam
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
const enableFileLogging = !isRailway && process.env.ENABLE_FILE_LOGGING !== 'false';

// File transports (disabled on Railway to prevent log spam and rate limiting)
if (enableFileLogging) {
  transports.push(
    // All logs (info and above)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );

  transports.push(
    // Error logs only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );

  // Debug logs (development only)
  if (isDevelopment) {
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'debug.log'),
        level: 'debug',
        format: fileFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 3,
        tailable: true
      })
    );
  }
} else {
  console.log('[Logger] File transports disabled (Railway environment detected)');
}

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: fileFormat,
  defaultMeta: {
    service: 's4ai',
    environment: nodeEnv,
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown'
  },
  transports,
  exitOnError: false
});

// Handle uncaught exceptions and unhandled rejections (console only on Railway)
if (enableFileLogging) {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );
} else {
  // On Railway, exceptions/rejections go to console only
  logger.exceptions.handle(
    new winston.transports.Console({ format: consoleFormat })
  );
  logger.rejections.handle(
    new winston.transports.Console({ format: consoleFormat })
  );
}

// Add request logger helper
logger.request = (req, message, meta = {}) => {
  logger.http(message, {
    ...meta,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent')
  });
};

// Add performance logger helper
logger.performance = (operation, durationMs, meta = {}) => {
  const level = durationMs > 1000 ? 'warn' : 'debug';
  logger.log(level, `Performance: ${operation}`, {
    ...meta,
    durationMs,
    operation
  });
};

// Add startup banner
if (isDevelopment) {
  logger.info('Logger initialized', {
    level: logLevel,
    environment: nodeEnv,
    transports: transports.length,
    logsDirectory: logsDir
  });
}

// Export logger instance
export default logger;

// Also export winston for custom use cases
export { winston };

// Named helper for modules that expect getLogger
export const getLogger = () => logger;
