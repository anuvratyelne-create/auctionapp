import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase';
import { z } from 'zod';
import {
  AdminRequest,
  authenticateAdmin,
  generateAdminToken,
  logAdminAction
} from '../middleware/adminAuth';
import { clearTournamentState, updateAuctionState, getAuctionState } from '../socket/handlers';

const router = Router();

// =====================================================
// AUTH ENDPOINTS
// =====================================================

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Admin login
router.post('/auth/login', async (req, res) => {
  try {
    const data = adminLoginSchema.parse(req.body);

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', data.email.toLowerCase())
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    const validPassword = await bcrypt.compare(data.password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Log the login
    await logAdminAction(admin.id, 'login', null, null, {}, req);

    const token = generateAdminToken({
      id: admin.id,
      email: admin.email,
      name: admin.name
    });

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify admin token
router.get('/auth/verify', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  res.json({
    valid: true,
    admin: {
      id: req.adminId,
      email: req.adminEmail,
      name: req.adminName
    }
  });
});

// Admin logout (just logs the action - token invalidation is client-side)
router.post('/auth/logout', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  await logAdminAction(req.adminId!, 'logout', null, null, {}, req);
  res.json({ success: true });
});

// =====================================================
// USER MANAGEMENT ENDPOINTS
// =====================================================

// List all users (paginated, searchable)
router.get('/users', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const state = req.query.state as string;
    const city = req.query.city as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, name, email, mobile, state, city, created_at, last_login, suspended_at, suspension_reason', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,mobile.ilike.%${search}%,name.ilike.%${search}%`);
    }
    if (status === 'active') {
      query = query.is('suspended_at', null);
    } else if (status === 'suspended') {
      query = query.not('suspended_at', 'is', null);
    }
    if (state) {
      query = query.eq('state', state);
    }
    if (city) {
      query = query.eq('city', city);
    }

    // Apply pagination
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in get users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user details
router.get('/users/:id', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password hash from response
    const { password_hash, ...safeUser } = user;

    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get user's tournaments
router.get('/users/:id/tournaments', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('owner_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch tournaments' });
    }

    res.json(tournaments || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Suspend/activate user
router.put('/users/:id/status', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { status, reason } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates: Record<string, unknown> = {};
    if (status === 'suspended') {
      updates.suspended_at = new Date().toISOString();
      updates.suspended_by = req.adminId;
      updates.suspension_reason = reason || 'Suspended by admin';
    } else {
      updates.suspended_at = null;
      updates.suspended_by = null;
      updates.suspension_reason = null;
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to update user status' });
    }

    await logAdminAction(
      req.adminId!,
      status === 'suspended' ? 'user_suspended' : 'user_activated',
      'user',
      req.params.id,
      { reason },
      req
    );

    res.json({ success: true, message: `User ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Admin reset user password
router.post('/users/:id/reset-password', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    await logAdminAction(req.adminId!, 'user_password_reset', 'user', req.params.id, {}, req);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete user (cascade tournaments)
router.delete('/users/:id', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const userId = req.params.id;

    // Get user's tournaments first
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('id')
      .eq('owner_id', userId);

    // Delete all related tournament data
    if (tournaments && tournaments.length > 0) {
      const tournamentIds = tournaments.map(t => t.id);

      for (const tournamentId of tournamentIds) {
        await supabase.from('bids').delete().eq('tournament_id', tournamentId);
        await supabase.from('players').delete().eq('tournament_id', tournamentId);
        await supabase.from('teams').delete().eq('tournament_id', tournamentId);
        await supabase.from('categories').delete().eq('tournament_id', tournamentId);
        await supabase.from('sponsors').delete().eq('tournament_id', tournamentId);
        await supabase.from('tournaments').delete().eq('id', tournamentId);
        clearTournamentState(tournamentId);
      }
    }

    // Delete the user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    await logAdminAction(req.adminId!, 'user_deleted', 'user', userId, {
      tournaments_deleted: tournaments?.length || 0
    }, req);

    res.json({
      success: true,
      message: 'User and all related data deleted',
      tournamentsDeleted: tournaments?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// =====================================================
// TOURNAMENT MANAGEMENT ENDPOINTS
// =====================================================

// List ALL tournaments (admin view)
router.get('/tournaments', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const approvalStatus = req.query.approval_status as string;
    const offset = (page - 1) * limit;

    // First, get tournaments without the join (to avoid timeout)
    let query = supabase
      .from('tournaments')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,share_code.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (approvalStatus) {
      query = query.eq('approval_status', approvalStatus);
    }

    // Apply pagination
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: tournaments, error, count } = await query;

    if (error) {
      console.error('Error fetching tournaments:', error);
      return res.status(500).json({ error: 'Failed to fetch tournaments' });
    }

    // Get owner info and counts for each tournament (in parallel batches)
    const enrichedTournaments = await Promise.all(
      (tournaments || []).map(async (tournament) => {
        // Fetch owner info separately
        let owner = null;
        if (tournament.owner_id) {
          const { data: ownerData } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', tournament.owner_id)
            .single();
          owner = ownerData;
        }

        // Get team count
        const { count: teamCount } = await supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournament.id);

        // Get player count
        const { count: playerCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournament.id);

        return {
          ...tournament,
          owner,
          team_count: teamCount || 0,
          player_count: playerCount || 0
        };
      })
    );

    res.json({
      tournaments: enrichedTournaments,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in get tournaments:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get single tournament details
router.get('/tournaments/:id', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        owner:users!tournaments_owner_id_fkey(id, name, email, mobile)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get team and player counts
    const { count: teamCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournament.id);

    const { count: playerCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournament.id);

    const { data: soldPlayers } = await supabase
      .from('players')
      .select('sold_price')
      .eq('tournament_id', tournament.id)
      .eq('status', 'sold');

    const totalSoldValue = soldPlayers?.reduce((sum, p) => sum + (p.sold_price || 0), 0) || 0;

    res.json({
      ...tournament,
      team_count: teamCount || 0,
      player_count: playerCount || 0,
      sold_players: soldPlayers?.length || 0,
      total_sold_value: totalSoldValue
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// Approve/reject tournament
router.put('/tournaments/:id/approve', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { approval_status, admin_notes } = req.body;

    if (!['approved', 'rejected'].includes(approval_status)) {
      return res.status(400).json({ error: 'Invalid approval status' });
    }

    const updates: Record<string, unknown> = {
      approval_status,
      approved_by: req.adminId,
      approved_at: new Date().toISOString()
    };

    if (admin_notes !== undefined) {
      updates.admin_notes = admin_notes;
    }

    const { error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to update approval status' });
    }

    await logAdminAction(
      req.adminId!,
      `tournament_${approval_status}`,
      'tournament',
      req.params.id,
      { admin_notes },
      req
    );

    res.json({ success: true, message: `Tournament ${approval_status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

// Change tournament status (setup/live/paused/completed)
router.put('/tournaments/:id/status', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { status } = req.body;
    const tournamentId = req.params.id;

    if (!['setup', 'live', 'paused', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { error } = await supabase
      .from('tournaments')
      .update({ status })
      .eq('id', tournamentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to update tournament status' });
    }

    // Broadcast status change to all connected clients
    const io = req.app.get('io');
    if (io) {
      // Update in-memory auction state if completing
      if (status === 'completed') {
        updateAuctionState(tournamentId, {
          status: 'idle',
          timer: { timeLeft: 0, isRunning: false, duration: 30 }
        });
      }

      // Broadcast to all relevant rooms
      const statusEvent = status === 'completed' ? 'tournament:completed' : 'tournament:status-changed';
      io.to(`tournament:${tournamentId}`).emit(statusEvent, { status, by: 'admin' });
      io.to(`live:${tournamentId}`).emit(statusEvent, { status, by: 'admin' });
      io.to(`overlay:${tournamentId}`).emit(statusEvent, { status, by: 'admin' });
    }

    await logAdminAction(
      req.adminId!,
      'tournament_status_changed',
      'tournament',
      tournamentId,
      { new_status: status },
      req
    );

    res.json({ success: true, message: `Tournament status changed to ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tournament status' });
  }
});

// Force pause live auction
router.post('/tournaments/:id/force-pause', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const tournamentId = req.params.id;

    // Update tournament status to paused
    const { error } = await supabase
      .from('tournaments')
      .update({ status: 'paused' })
      .eq('id', tournamentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to pause tournament' });
    }

    // Update in-memory auction state
    updateAuctionState(tournamentId, {
      status: 'idle',
      timer: { timeLeft: 30, isRunning: false, duration: 30 }
    });

    // Broadcast to all clients
    const io = req.app.get('io');
    if (io) {
      io.to(`tournament:${tournamentId}`).emit('tournament:paused', { by: 'admin' });
      io.to(`live:${tournamentId}`).emit('tournament:paused', { by: 'admin' });
      io.to(`overlay:${tournamentId}`).emit('tournament:paused', { by: 'admin' });
    }

    await logAdminAction(req.adminId!, 'tournament_force_paused', 'tournament', tournamentId, {}, req);

    res.json({ success: true, message: 'Tournament paused' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pause tournament' });
  }
});

// Delete tournament
router.delete('/tournaments/:id', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const tournamentId = req.params.id;

    // Delete all related data
    await supabase.from('bids').delete().eq('tournament_id', tournamentId);
    await supabase.from('players').delete().eq('tournament_id', tournamentId);
    await supabase.from('teams').delete().eq('tournament_id', tournamentId);
    await supabase.from('categories').delete().eq('tournament_id', tournamentId);
    await supabase.from('sponsors').delete().eq('tournament_id', tournamentId);

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete tournament' });
    }

    clearTournamentState(tournamentId);

    await logAdminAction(req.adminId!, 'tournament_deleted', 'tournament', tournamentId, {}, req);

    res.json({ success: true, message: 'Tournament deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// =====================================================
// LIVE AUCTION CONTROL ENDPOINTS
// =====================================================

// List all active auctions
router.get('/auctions/active', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { data: activeTournaments, error } = await supabase
      .from('tournaments')
      .select(`
        id, name, share_code, status,
        owner:users!tournaments_owner_id_fkey(id, name, email)
      `)
      .eq('status', 'live');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch active auctions' });
    }

    // Get auction state for each
    const activeAuctions = await Promise.all(
      (activeTournaments || []).map(async (tournament) => {
        const state = getAuctionState(tournament.id);

        // Get current bidding player if any
        const { data: biddingPlayer } = await supabase
          .from('players')
          .select('id, name, base_price')
          .eq('tournament_id', tournament.id)
          .eq('status', 'bidding')
          .single();

        return {
          tournament,
          auctionState: {
            status: state.status,
            currentPlayer: biddingPlayer || state.currentPlayer,
            currentBid: state.currentBid,
            currentTeam: state.currentTeam,
            timerRunning: state.timer?.isRunning || false
          }
        };
      })
    );

    res.json(activeAuctions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active auctions' });
  }
});

// Get auction state for specific tournament
router.get('/auctions/:tournamentId/state', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const state = getAuctionState(req.params.tournamentId);
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch auction state' });
  }
});

// Force stop auction
router.post('/auctions/:tournamentId/force-stop', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    // Reset any bidding player to available
    await supabase
      .from('players')
      .update({ status: 'available' })
      .eq('tournament_id', tournamentId)
      .eq('status', 'bidding');

    // Reset auction state
    updateAuctionState(tournamentId, {
      currentPlayer: null,
      currentBid: 0,
      currentTeam: null,
      bidHistory: [],
      status: 'idle',
      timer: { timeLeft: 30, isRunning: false, duration: 30 }
    });

    // Broadcast to all clients
    const io = req.app.get('io');
    if (io) {
      const newState = getAuctionState(tournamentId);
      io.to(`tournament:${tournamentId}`).emit('auction:state', newState);
      io.to(`live:${tournamentId}`).emit('auction:state', newState);
      io.to(`overlay:${tournamentId}`).emit('auction:state', newState);
      io.to(`tournament:${tournamentId}`).emit('auction:force-stopped', { by: 'admin' });
    }

    await logAdminAction(req.adminId!, 'auction_force_stopped', 'auction', tournamentId, {}, req);

    res.json({ success: true, message: 'Auction stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop auction' });
  }
});

// Undo last sale
router.post('/auctions/:tournamentId/undo-sale', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    // Find the last sold player
    const { data: lastSold, error: findError } = await supabase
      .from('players')
      .select('id, name, team_id, sold_price')
      .eq('tournament_id', tournamentId)
      .eq('status', 'sold')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !lastSold) {
      return res.status(404).json({ error: 'No sold players to undo' });
    }

    // Reset the player
    await supabase
      .from('players')
      .update({
        status: 'available',
        team_id: null,
        sold_price: null
      })
      .eq('id', lastSold.id);

    // Delete the bid records for this player
    await supabase
      .from('bids')
      .delete()
      .eq('player_id', lastSold.id);

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.to(`tournament:${tournamentId}`).emit('teams:updated');
      io.to(`tournament:${tournamentId}`).emit('players:updated');
      io.to(`summary:${tournamentId}`).emit('teams:updated');
    }

    await logAdminAction(req.adminId!, 'auction_undo_sale', 'auction', tournamentId, {
      player_id: lastSold.id,
      player_name: lastSold.name,
      sold_price: lastSold.sold_price,
      team_id: lastSold.team_id
    }, req);

    res.json({
      success: true,
      message: `Undid sale of ${lastSold.name}`,
      player: lastSold
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to undo sale' });
  }
});

// Reset specific player
router.post('/auctions/:tournamentId/reset-player/:playerId', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { tournamentId, playerId } = req.params;

    // Get player info first
    const { data: player, error: findError } = await supabase
      .from('players')
      .select('id, name, status, team_id, sold_price')
      .eq('id', playerId)
      .eq('tournament_id', tournamentId)
      .single();

    if (findError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Reset the player
    await supabase
      .from('players')
      .update({
        status: 'available',
        team_id: null,
        sold_price: null
      })
      .eq('id', playerId);

    // Delete bid records
    await supabase
      .from('bids')
      .delete()
      .eq('player_id', playerId);

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.to(`tournament:${tournamentId}`).emit('teams:updated');
      io.to(`tournament:${tournamentId}`).emit('players:updated');
      io.to(`summary:${tournamentId}`).emit('teams:updated');
    }

    await logAdminAction(req.adminId!, 'player_reset', 'auction', tournamentId, {
      player_id: playerId,
      player_name: player.name,
      previous_status: player.status,
      previous_team_id: player.team_id
    }, req);

    res.json({
      success: true,
      message: `Reset player ${player.name}`,
      player
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset player' });
  }
});

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

// System overview stats
router.get('/analytics/overview', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // New users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: newUsersToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // New users this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: newUsersWeek } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    // New users this month
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const { count: newUsersMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());

    // Total tournaments
    const { count: totalTournaments } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true });

    // Pending approval tournaments
    const { count: pendingTournaments } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending');

    // Active auctions
    const { count: activeAuctions } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'live');

    // Total players sold
    const { data: soldPlayersData } = await supabase
      .from('players')
      .select('sold_price')
      .eq('status', 'sold');

    const totalPlayersSold = soldPlayersData?.length || 0;
    const totalBidValue = soldPlayersData?.reduce((sum, p) => sum + (p.sold_price || 0), 0) || 0;

    res.json({
      users: {
        total: totalUsers || 0,
        today: newUsersToday || 0,
        week: newUsersWeek || 0,
        month: newUsersMonth || 0
      },
      tournaments: {
        total: totalTournaments || 0,
        pending: pendingTournaments || 0,
        active: activeAuctions || 0
      },
      auctions: {
        playersSold: totalPlayersSold,
        totalBidValue
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// User registration trends
router.get('/analytics/users', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: users, error } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    // Group by date
    const dailyCounts: Record<string, number> = {};
    users?.forEach(user => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // Fill in missing dates
    const result = [];
    const currentDate = new Date(startDate);
    while (currentDate <= new Date()) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dailyCounts[dateStr] || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user trends' });
  }
});

// Tournament statistics
router.get('/analytics/tournaments', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('status, approval_status, created_at, sports_type');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch tournament data' });
    }

    // Count by status
    const statusCounts: Record<string, number> = {};
    const approvalCounts: Record<string, number> = {};
    const sportsTypeCounts: Record<string, number> = {};

    tournaments?.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      approvalCounts[t.approval_status || 'pending'] = (approvalCounts[t.approval_status || 'pending'] || 0) + 1;
      sportsTypeCounts[t.sports_type || 'cricket'] = (sportsTypeCounts[t.sports_type || 'cricket'] || 0) + 1;
    });

    res.json({
      byStatus: statusCounts,
      byApproval: approvalCounts,
      bySportsType: sportsTypeCounts,
      total: tournaments?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament stats' });
  }
});

// Geographic breakdown
router.get('/analytics/locations', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('state, city');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch location data' });
    }

    const stateCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};

    users?.forEach(u => {
      if (u.state) {
        stateCounts[u.state] = (stateCounts[u.state] || 0) + 1;
      }
      if (u.city) {
        cityCounts[u.city] = (cityCounts[u.city] || 0) + 1;
      }
    });

    // Sort by count and take top 10
    const topStates = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    res.json({
      states: topStates,
      cities: topCities
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location data' });
  }
});

// =====================================================
// AUDIT LOGS ENDPOINTS
// =====================================================

// Get auth logs (user logins)
router.get('/logs/auth', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const action = req.query.action as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('auth_logs')
      .select(`
        *,
        user:users(id, name, email)
      `, { count: 'exact' });

    if (search) {
      // Search requires a join, so we'll filter after
    }
    if (action) {
      query = query.eq('action', action);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch auth logs' });
    }

    res.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch auth logs' });
  }
});

// Get admin audit logs
router.get('/logs/admin', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const action = req.query.action as string;
    const targetType = req.query.target_type as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('admin_audit_logs')
      .select(`
        *,
        admin:admin_users(id, name, email)
      `, { count: 'exact' });

    if (action) {
      query = query.eq('action', action);
    }
    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch admin logs' });
    }

    res.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin logs' });
  }
});

// Export logs as CSV
router.get('/logs/export', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const type = req.query.type as string || 'admin';
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let data: any[] = [];
    let headers: string[] = [];

    if (type === 'admin') {
      const { data: logs } = await supabase
        .from('admin_audit_logs')
        .select(`*, admin:admin_users(name, email)`)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      headers = ['Timestamp', 'Admin', 'Email', 'Action', 'Target Type', 'Target ID', 'IP Address'];
      data = (logs || []).map(log => [
        new Date(log.created_at).toISOString(),
        log.admin?.name || 'Unknown',
        log.admin?.email || '',
        log.action,
        log.target_type || '',
        log.target_id || '',
        log.ip_address || ''
      ]);
    } else {
      const { data: logs } = await supabase
        .from('auth_logs')
        .select(`*, user:users(name, email)`)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      headers = ['Timestamp', 'User', 'Email', 'Action', 'Success', 'IP Address'];
      data = (logs || []).map(log => [
        new Date(log.created_at).toISOString(),
        log.user?.name || 'Unknown',
        log.user?.email || '',
        log.action,
        log.success ? 'Yes' : 'No',
        log.ip_address || ''
      ]);
    }

    // Build CSV
    const csv = [
      headers.join(','),
      ...data.map(row => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    await logAdminAction(req.adminId!, 'logs_exported', 'system', null, { type, days }, req);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_logs_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

// =====================================================
// SYSTEM SETTINGS ENDPOINTS
// =====================================================

// Get all settings
router.get('/settings', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // Group by category
    const grouped: Record<string, any[]> = {};
    settings?.forEach(setting => {
      const cat = setting.category || 'general';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push({
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updated_at: setting.updated_at
      });
    });

    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update a setting
router.put('/settings/:key', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { value } = req.body;

    const { error } = await supabase
      .from('system_settings')
      .update({
        value,
        updated_by: req.adminId,
        updated_at: new Date().toISOString()
      })
      .eq('key', req.params.key);

    if (error) {
      return res.status(500).json({ error: 'Failed to update setting' });
    }

    await logAdminAction(req.adminId!, 'setting_updated', 'system', null, {
      key: req.params.key,
      new_value: value
    }, req);

    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Toggle maintenance mode
router.post('/settings/maintenance', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { enabled, message } = req.body;

    // Update maintenance mode
    await supabase
      .from('system_settings')
      .update({
        value: enabled ? 'true' : 'false',
        updated_by: req.adminId,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'maintenance_mode');

    // Update message if provided
    if (message !== undefined) {
      await supabase
        .from('system_settings')
        .update({
          value: JSON.stringify(message),
          updated_by: req.adminId,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'maintenance_message');
    }

    // Broadcast to all connected clients
    const io = req.app.get('io');
    if (io && enabled) {
      io.emit('system:maintenance', { enabled, message });
    }

    await logAdminAction(req.adminId!, enabled ? 'maintenance_enabled' : 'maintenance_disabled', 'system', null, { message }, req);

    res.json({ success: true, message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle maintenance mode' });
  }
});

export default router;
