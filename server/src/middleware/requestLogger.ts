import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface LoggedRequest extends Request {
  startTime?: number;
  userId?: string;
  tournamentId?: string;
}

/**
 * HTTP request logging middleware using Winston
 * Logs request details and response time
 */
export function requestLogger(req: LoggedRequest, res: Response, next: NextFunction) {
  // Skip health check endpoint to reduce noise
  if (req.path === '/api/health') {
    return next();
  }

  // Record start time
  req.startTime = Date.now();

  // Log request when response finishes
  res.on('finish', () => {
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    const statusCode = res.statusCode;

    // Determine log level based on status code
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';

    logger.log(level, `${req.method} ${req.path}`, {
      type: 'http',
      method: req.method,
      path: req.path,
      statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent')?.substring(0, 100), // Truncate UA
      userId: req.userId,
      tournamentId: req.tournamentId,
      // Don't log sensitive query params
      query: sanitizeQuery(req.query),
    });
  });

  next();
}

/**
 * Remove sensitive data from query parameters
 */
function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Error logging middleware - place after routes
 */
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled error', {
    type: 'error',
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
  });

  next(err);
}

export default requestLogger;
