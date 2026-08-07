import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Separate JWT secret for super admin (extra security layer)
const SUPER_ADMIN_JWT_SECRET = process.env.JWT_SECRET + '_SA_LAYER';

export interface SuperAdminRequest extends Request {
  superAdmin?: {
    id: string;
    email: string;
    name: string;
  };
}

export function generateSuperAdminToken(superAdmin: { id: string; email: string; name: string }): string {
  return jwt.sign(
    {
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      type: 'super_admin'
    },
    SUPER_ADMIN_JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function superAdminAuth(req: SuperAdminRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, SUPER_ADMIN_JWT_SECRET) as {
        id: string;
        email: string;
        name: string;
        type: string;
      };

      // Verify it's a super admin token
      if (decoded.type !== 'super_admin') {
        return res.status(401).json({ error: 'Access denied' });
      }

      req.superAdmin = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      };

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
