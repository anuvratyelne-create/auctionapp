import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase';
import { superAdminAuth, SuperAdminRequest, generateSuperAdminToken } from '../middleware/superAdminAuth';

const router = express.Router();

// Helper to log super admin actions (hidden from regular admin logs)
async function logSuperAdminAction(
  superAdminId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  details: object | null,
  req: express.Request
) {
  try {
    await supabase.from('super_admin_logs').insert({
      super_admin_id: superAdminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      user_agent: req.headers['user-agent'] || 'unknown'
    });
  } catch (error) {
    console.error('Failed to log super admin action:', error);
  }
}

// =====================================================
// AUTHENTICATION
// =====================================================

// Super Admin Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get super admin
    const { data: superAdmin, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !superAdmin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (superAdmin.status !== 'active') {
      return res.status(401).json({ error: 'Account suspended' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, superAdmin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await supabase
      .from('super_admins')
      .update({
        last_login: new Date().toISOString(),
        login_count: (superAdmin.login_count || 0) + 1
      })
      .eq('id', superAdmin.id);

    // Generate token
    const token = generateSuperAdminToken({
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name
    });

    // Log the login
    await logSuperAdminAction(superAdmin.id, 'login', 'system', null, { success: true }, req);

    res.json({
      token,
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name
      }
    });
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify Token
router.get('/auth/verify', superAdminAuth, (req: SuperAdminRequest, res) => {
  res.json({ valid: true, superAdmin: req.superAdmin });
});

// =====================================================
// DASHBOARD STATS
// =====================================================

router.get('/dashboard/stats', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    // Get counts
    const [users, admins, tournaments, players] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('admin_users').select('id', { count: 'exact', head: true }),
      supabase.from('tournaments').select('id', { count: 'exact', head: true }),
      supabase.from('players').select('id', { count: 'exact', head: true })
    ]);

    // Get financial summary
    const { data: financialData } = await supabase
      .from('financial_records')
      .select('amount, payment_status');

    const totalRevenue = financialData
      ?.filter((f: { payment_status: string; amount: string }) => f.payment_status === 'completed')
      .reduce((sum: number, f: { amount: string }) => sum + parseFloat(f.amount || '0'), 0) || 0;

    // Get recent admin activity
    const { data: recentAdminLogins } = await supabase
      .from('admin_users')
      .select('id, email, name, last_login')
      .order('last_login', { ascending: false })
      .limit(5);

    // Get tournament stats
    const { data: tournamentStats } = await supabase
      .from('tournaments')
      .select('status')
      .then((res: { data: Array<{ status: string }> | null }) => {
        const stats = { setup: 0, live: 0, paused: 0, completed: 0 };
        res.data?.forEach((t: { status: string }) => {
          if (stats[t.status as keyof typeof stats] !== undefined) {
            stats[t.status as keyof typeof stats]++;
          }
        });
        return { data: stats };
      });

    await logSuperAdminAction(req.superAdmin!.id, 'view_dashboard', 'system', null, null, req);

    res.json({
      counts: {
        users: users.count || 0,
        admins: admins.count || 0,
        tournaments: tournaments.count || 0,
        players: players.count || 0
      },
      financial: {
        totalRevenue,
        currency: 'INR'
      },
      recentAdminLogins,
      tournamentStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// =====================================================
// ADMIN MANAGEMENT (Control over regular admins)
// =====================================================

// Get all admins
router.get('/admins', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { data: admins, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await logSuperAdminAction(req.superAdmin!.id, 'view_admins', 'admin', null, null, req);

    // Remove password hashes before sending
    const safeAdmins = admins?.map((a: Record<string, unknown>) => ({
      ...a,
      password_hash: undefined
    }));

    res.json(safeAdmins);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// Suspend admin
router.post('/admins/:id/suspend', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: admin, error } = await supabase
      .from('admin_users')
      .update({ status: 'suspended' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logSuperAdminAction(
      req.superAdmin!.id,
      'suspend_admin',
      'admin',
      id,
      { reason, admin_email: admin.email },
      req
    );

    res.json({ success: true, message: 'Admin suspended' });
  } catch (error) {
    console.error('Suspend admin error:', error);
    res.status(500).json({ error: 'Failed to suspend admin' });
  }
});

// Reactivate admin
router.post('/admins/:id/activate', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { id } = req.params;

    const { data: admin, error } = await supabase
      .from('admin_users')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logSuperAdminAction(
      req.superAdmin!.id,
      'activate_admin',
      'admin',
      id,
      { admin_email: admin.email },
      req
    );

    res.json({ success: true, message: 'Admin activated' });
  } catch (error) {
    console.error('Activate admin error:', error);
    res.status(500).json({ error: 'Failed to activate admin' });
  }
});

// Delete admin
router.delete('/admins/:id', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { id } = req.params;

    // Get admin info first for logging
    const { data: admin } = await supabase
      .from('admin_users')
      .select('email, name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logSuperAdminAction(
      req.superAdmin!.id,
      'delete_admin',
      'admin',
      id,
      { admin_email: admin?.email, admin_name: admin?.name },
      req
    );

    res.json({ success: true, message: 'Admin deleted' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// Reset admin password
router.post('/admins/:id/reset-password', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('admin_users')
      .update({ password_hash: passwordHash })
      .eq('id', id);

    if (error) throw error;

    await logSuperAdminAction(
      req.superAdmin!.id,
      'reset_admin_password',
      'admin',
      id,
      null,
      req
    );

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// =====================================================
// USER MANAGEMENT
// =====================================================

// Get all users
router.get('/users', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Remove sensitive data
    const safeUsers = users?.map((u: Record<string, unknown>) => ({
      ...u,
      password_hash: undefined
    }));

    res.json(safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// =====================================================
// TOURNAMENT DATA
// =====================================================

// Get all tournaments with full details
router.get('/tournaments', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        teams:teams(count),
        players:players(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    await logSuperAdminAction(req.superAdmin!.id, 'view_tournaments', 'tournament', null, null, req);

    res.json(tournaments);
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get tournament details
router.get('/tournaments/:id', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { id } = req.params;

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        teams:teams(*),
        players:players(*),
        categories:categories(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    await logSuperAdminAction(req.superAdmin!.id, 'view_tournament_detail', 'tournament', id, null, req);

    res.json(tournament);
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// =====================================================
// FINANCIAL REPORTS
// =====================================================

// Get all financial records
router.get('/financial/records', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { data: records, error } = await supabase
      .from('financial_records')
      .select(`
        *,
        tournament:tournaments(name),
        user:users(name, email),
        collector:admin_users(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    await logSuperAdminAction(req.superAdmin!.id, 'view_financial_records', 'financial', null, null, req);

    res.json(records || []);
  } catch (error) {
    console.error('Get financial records error:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Get financial summary
router.get('/financial/summary', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { data: records } = await supabase
      .from('financial_records')
      .select('amount, payment_status, payment_type, created_at');

    interface FinancialRecord {
      amount: string;
      payment_status: string;
      payment_type: string;
      created_at: string;
    }

    const completed = records?.filter((r: FinancialRecord) => r.payment_status === 'completed') || [];

    const summary = {
      totalRevenue: completed.reduce((sum: number, r: FinancialRecord) => sum + parseFloat(r.amount || '0'), 0),
      totalTransactions: completed.length,
      byType: {} as Record<string, number>,
      byMonth: {} as Record<string, number>
    };

    completed.forEach((r: FinancialRecord) => {
      // By type
      const type = r.payment_type || 'other';
      summary.byType[type] = (summary.byType[type] || 0) + parseFloat(r.amount || '0');

      // By month
      const month = new Date(r.created_at).toISOString().slice(0, 7);
      summary.byMonth[month] = (summary.byMonth[month] || 0) + parseFloat(r.amount || '0');
    });

    res.json(summary);
  } catch (error) {
    console.error('Get financial summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Add financial record
router.post('/financial/records', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const record = req.body;

    const { data, error } = await supabase
      .from('financial_records')
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    await logSuperAdminAction(
      req.superAdmin!.id,
      'add_financial_record',
      'financial',
      data.id,
      { amount: record.amount },
      req
    );

    res.json(data);
  } catch (error) {
    console.error('Add financial record error:', error);
    res.status(500).json({ error: 'Failed to add record' });
  }
});

// =====================================================
// AUDIT LOGS (Full access - including admin actions)
// =====================================================

// Get all admin audit logs
router.get('/audit/admin-logs', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const { data: logs, error } = await supabase
      .from('admin_audit_logs')
      .select(`
        *,
        admin:admin_users(name, email)
      `)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json(logs);
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get super admin logs (only visible to super admin)
router.get('/audit/super-logs', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const { data: logs, error } = await supabase
      .from('super_admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json(logs);
  } catch (error) {
    console.error('Get super logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get auth logs
router.get('/audit/auth-logs', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const { data: logs, error } = await supabase
      .from('auth_logs')
      .select(`
        *,
        user:users(name, email)
      `)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    res.json(logs || []);
  } catch (error) {
    console.error('Get auth logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// =====================================================
// DATA EXPORT
// =====================================================

// Export all data
router.get('/export/all', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const [users, admins, tournaments, teams, players, financial] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('admin_users').select('id, email, name, status, last_login, created_at'),
      supabase.from('tournaments').select('*'),
      supabase.from('teams').select('*'),
      supabase.from('players').select('*'),
      supabase.from('financial_records').select('*')
    ]);

    await logSuperAdminAction(req.superAdmin!.id, 'export_all_data', 'system', null, null, req);

    res.json({
      exportedAt: new Date().toISOString(),
      data: {
        users: users.data?.map((u: Record<string, unknown>) => ({ ...u, password_hash: undefined })),
        admins: admins.data,
        tournaments: tournaments.data,
        teams: teams.data,
        players: players.data,
        financial: financial.data
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// =====================================================
// SUPER ADMIN SETTINGS
// =====================================================

// Change super admin password
router.post('/settings/change-password', superAdminAuth, async (req: SuperAdminRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get current super admin
    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('password_hash')
      .eq('id', req.superAdmin!.id)
      .single();

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, superAdmin?.password_hash || '');
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await supabase
      .from('super_admins')
      .update({ password_hash: passwordHash })
      .eq('id', req.superAdmin!.id);

    await logSuperAdminAction(req.superAdmin!.id, 'change_password', 'system', null, null, req);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
