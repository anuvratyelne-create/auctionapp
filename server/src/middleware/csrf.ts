import { doubleCsrf } from 'csrf-csrf';
import { Request, Response, NextFunction } from 'express';

// CSRF secret - should be set via environment variable in production
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'csrf-secret-change-in-production';

// Configure double-submit cookie CSRF protection
const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req: Request) => {
    // Use IP + User-Agent as session identifier for stateless operation
    // In production with sessions, use req.session.id instead
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    return `${ip}-${ua.substring(0, 50)}`;
  },
  cookieName: 'csrf-token', // Simplified name for compatibility
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
  },
  size: 64, // Token size in bytes
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'], // Safe methods don't need CSRF
  getCsrfTokenFromRequest: (req: Request) => {
    // Check header first (preferred for APIs), then body
    return req.headers['x-csrf-token'] as string || req.body?._csrf;
  },
});

/**
 * Middleware to generate and set CSRF token
 * Call this on GET endpoints that serve forms or initialize sessions
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction) {
  try {
    const token = generateCsrfToken(req, res);
    // Make token available to response
    res.locals.csrfToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint to get a fresh CSRF token
 * Clients should call this before making state-changing requests
 */
export function csrfTokenEndpoint(req: Request, res: Response) {
  try {
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
}

/**
 * CSRF protection middleware
 * Apply to routes that modify state (POST, PUT, DELETE)
 *
 * Note: This app uses JWT tokens in Authorization header, which provides
 * some CSRF protection since browsers don't automatically send custom headers.
 * However, for extra security on sensitive operations, CSRF tokens are recommended.
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Error handler for CSRF validation failures
 */
export function csrfErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err.message === 'invalid csrf token' || err.message.toLowerCase().includes('csrf')) {
    return res.status(403).json({
      error: 'Invalid or missing CSRF token',
      code: 'CSRF_ERROR',
      hint: 'Get a fresh token from /api/auth/csrf-token'
    });
  }
  next(err);
}

export { generateCsrfToken };
