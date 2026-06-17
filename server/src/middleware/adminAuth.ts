import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase';

// Use separate secret for admin tokens (falls back to JWT_SECRET if not set)
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET!;
const ADMIN_TOKEN_EXPIRY = '4h'; // Shorter expiry for admin tokens (4 hours vs 7 days for users)

export interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminName?: string;
}

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  name: string;
  type: 'admin';
}

// Generate admin JWT token
export function generateAdminToken(admin: { id: string; email: string; name: string }): string {
  return jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      type: 'admin'
    } as AdminTokenPayload,
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_TOKEN_EXPIRY }
  );
}

// Middleware to authenticate admin requests
export const authenticateAdmin = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Admin access token required' });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;

    // Verify it's an admin token
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Invalid admin token' });
    }

    // Verify admin still exists and is active
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, name, status')
      .eq('id', decoded.adminId)
      .single();

    if (error || !admin) {
      return res.status(403).json({ error: 'Admin account not found' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ error: 'Admin account is suspended' });
    }

    req.adminId = admin.id;
    req.adminEmail = admin.email;
    req.adminName = admin.name;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Admin token expired' });
    }
    return res.status(403).json({ error: 'Invalid admin token' });
  }
};

// Helper function to log admin actions
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string | null = null,
  targetId: string | null = null,
  details: Record<string, unknown> = {},
  req?: Request
): Promise<void> {
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: req?.ip || req?.headers['x-forwarded-for'] || null,
      user_agent: req?.headers['user-agent'] || null
    });
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}

// Check if system is in maintenance mode
export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single();

    return data?.value === 'true' || data?.value === true;
  } catch {
    return false;
  }
}

// Get maintenance message
export async function getMaintenanceMessage(): Promise<string> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_message')
      .single();

    if (typeof data?.value === 'string') {
      // Remove surrounding quotes if present
      return data.value.replace(/^"|"$/g, '');
    }
    return 'System is under maintenance. Please try again later.';
  } catch {
    return 'System is under maintenance. Please try again later.';
  }
}
