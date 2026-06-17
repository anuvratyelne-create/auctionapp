import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Human-readable format for console in development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Log directory
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// Create transports based on environment
const transports: winston.transport[] = [];

// Console transport - always enabled
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? structuredFormat : consoleFormat,
  })
);

// File transports - only in production or if explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGS === 'true') {
  // Error log - only errors
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: structuredFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log - all levels
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // HTTP access log
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Don't exit on uncaught exceptions - let the process handle it
  exitOnError: false,
});

// Helper methods for common logging patterns
export const logRequest = (req: {
  method: string;
  url: string;
  ip?: string;
  userId?: string;
  tournamentId?: string;
}, responseTime?: number) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.userId,
    tournamentId: req.tournamentId,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
  });
};

export const logError = (error: Error | unknown, context?: Record<string, unknown>) => {
  if (error instanceof Error) {
    logger.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context,
    });
  } else {
    logger.error('Unknown error', {
      error: String(error),
      ...context,
    });
  }
};

export const logAuditEvent = (
  event: string,
  userId: string,
  details: Record<string, unknown>
) => {
  logger.info(`Audit: ${event}`, {
    type: 'audit',
    event,
    userId,
    ...details,
  });
};

export const logSocketEvent = (
  event: string,
  socketId: string,
  details?: Record<string, unknown>
) => {
  logger.debug(`Socket: ${event}`, {
    type: 'socket',
    event,
    socketId,
    ...details,
  });
};

export const logDbQuery = (
  table: string,
  operation: string,
  duration?: number,
  error?: Error
) => {
  const level = error ? 'error' : 'debug';
  logger[level](`DB ${operation} on ${table}`, {
    type: 'database',
    table,
    operation,
    duration: duration ? `${duration}ms` : undefined,
    error: error?.message,
  });
};

export default logger;
