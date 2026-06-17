import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().min(1),
  short_name: z.string().min(1).max(5),
  logo_url: z.string().url().optional().nullable(),
  keyboard_key: z.string().length(1).optional(),
  owner_name: z.string().optional(),
  owner_photo: z.string().url().optional().nullable(),
  total_budget: z.number().optional()
});

const updateTeamSchema = createTeamSchema.partial().extend({
  // Optimistic locking - client passes current version to prevent concurrent edit conflicts
  version: z.number().int().positive().optional()
});

// Compare multiple teams
router.get('/compare', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) {
      return res.status(400).json({ error: 'Team IDs required' });
    }

    const teamIds = idsParam.split(',').slice(0, 4); // Max 4 teams

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('total_points, min_players, max_players')
      .eq('id', req.tournamentId)
      .single();

    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        players:players(
          id, name, photo_url, player_uid, jersey_number, sold_price, retention_price, status, base_price, is_retained,
          categories(id, name)
        )
      `)
      .eq('tournament_id', req.tournamentId)
      .in('id', teamIds);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Get all categories for breakdown
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('tournament_id', req.tournamentId)
      .order('display_order');

    const teamsComparison = teams?.map(team => {
      const soldPlayers = team.players?.filter((p: any) => p.status === 'sold') || [];
      const retainedPlayers = team.players?.filter((p: any) => p.status === 'retained') || [];
      const allPlayers = [...soldPlayers, ...retainedPlayers];

      const soldSpentPoints = soldPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0);
      const retentionSpent = team.retention_spent || 0;
      const totalSpentPoints = soldSpentPoints + retentionSpent;
      const totalBudget = team.total_budget || tournament?.total_points || 100000;

      // Category breakdown (include both sold and retained)
      const categoryBreakdown = categories?.map(cat => {
        const catSoldPlayers = soldPlayers.filter((p: any) => p.categories?.id === cat.id);
        const catRetainedPlayers = retainedPlayers.filter((p: any) => p.categories?.id === cat.id);
        const catSpent = catSoldPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0)
          + catRetainedPlayers.reduce((sum: number, p: any) => sum + (p.retention_price || 0), 0);
        return {
          id: cat.id,
          name: cat.name,
          count: catSoldPlayers.length + catRetainedPlayers.length,
          total_spent: catSpent
        };
      }) || [];

      // Top purchase (consider both sold and retained)
      const allWithPrice = [
        ...soldPlayers.map((p: any) => ({ ...p, effectivePrice: p.sold_price || 0 })),
        ...retainedPlayers.map((p: any) => ({ ...p, effectivePrice: p.retention_price || 0 }))
      ];
      const topPurchase = allWithPrice.sort((a: any, b: any) => b.effectivePrice - a.effectivePrice)[0];

      return {
        id: team.id,
        name: team.name,
        short_name: team.short_name,
        logo_url: team.logo_url,
        owner_name: team.owner_name,
        total_budget: totalBudget,
        spent_points: totalSpentPoints,
        remaining_budget: totalBudget - totalSpentPoints,
        player_count: allPlayers.length,
        retained_count: retainedPlayers.length,
        avg_per_player: allPlayers.length > 0 ? Math.round(totalSpentPoints / allPlayers.length) : 0,
        category_breakdown: categoryBreakdown,
        top_purchase: topPurchase ? {
          name: topPurchase.name,
          photo_url: topPurchase.photo_url,
          sold_price: topPurchase.effectivePrice,
          category: topPurchase.categories?.name,
          is_retained: topPurchase.status === 'retained'
        } : null,
        players: allPlayers.map((p: any) => ({
          id: p.id,
          name: p.name,
          photo_url: p.photo_url,
          jersey_number: p.jersey_number,
          sold_price: p.status === 'retained' ? p.retention_price : p.sold_price,
          category: p.categories?.name,
          is_retained: p.status === 'retained'
        }))
      };
    }) || [];

    res.json(teamsComparison);
  } catch (error) {
    console.error('Error comparing teams:', error);
    res.status(500).json({ error: 'Failed to compare teams' });
  }
});

// Get all teams (with optional pagination)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = req.query;

    // Pagination support (optional - if not provided, returns all)
    const pageNum = page ? parseInt(page as string, 10) : null;
    const limitNum = limit ? Math.min(parseInt(limit as string, 10), 50) : null; // Max 50 per page
    const usePagination = pageNum !== null && limitNum !== null && pageNum > 0 && limitNum > 0;

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('total_points, min_players')
      .eq('id', req.tournamentId)
      .single();

    let query = supabase
      .from('teams')
      .select(`
        *,
        players:players(id, sold_price, retention_price, status, is_retained)
      `, usePagination ? { count: 'exact' } : undefined)
      .eq('tournament_id', req.tournamentId)
      .order('created_at', { ascending: true });

    // Apply pagination if requested
    if (usePagination) {
      const offset = (pageNum - 1) * limitNum;
      query = query.range(offset, offset + limitNum - 1);
    }

    const { data: teams, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch teams' });
    }

    // Calculate stats for each team
    const teamsWithStats = teams?.map(team => {
      // Count both sold AND retained players
      const soldPlayers = team.players?.filter((p: any) => p.status === 'sold') || [];
      const retainedPlayers = team.players?.filter((p: any) => p.status === 'retained') || [];

      // Spent points from sold players only (retention_spent is tracked separately)
      const soldSpentPoints = soldPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0);

      // Total players = sold + retained
      const playerCount = soldPlayers.length + retainedPlayers.length;

      // Total spent = sold + retention_spent
      const retentionSpent = team.retention_spent || 0;
      const totalSpentPoints = soldSpentPoints + retentionSpent;

      const remainingSlots = Math.max(0, (tournament?.min_players || 7) - playerCount);
      const minBasePrice = 1000; // Default
      const reservePoints = remainingSlots * minBasePrice;
      const totalBudget = team.total_budget || tournament?.total_points || 100000;
      const remainingBudget = totalBudget - totalSpentPoints;
      const maxBid = Math.max(0, remainingBudget - reservePoints);

      return {
        ...team,
        spent_points: totalSpentPoints,
        remaining_budget: remainingBudget,
        player_count: playerCount,
        retained_count: retainedPlayers.length,
        reserve_points: reservePoints,
        max_bid: maxBid,
        players: undefined // Remove players array from response
      };
    }) || [];

    // Return paginated response with metadata if pagination was requested
    if (usePagination && count !== null) {
      const totalPages = Math.ceil(count / limitNum);
      res.json({
        data: teamsWithStats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasMore: pageNum < totalPages
        }
      });
    } else {
      // Backward compatible - return array directly
      res.json(teamsWithStats);
    }
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get teams for public view
router.get('/public/:tournamentId', async (req, res) => {
  try {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('total_points, min_players')
      .eq('id', req.params.tournamentId)
      .single();

    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id, name, short_name, logo_url, retention_spent,
        players:players(id, sold_price, retention_price, status)
      `)
      .eq('tournament_id', req.params.tournamentId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch teams' });
    }

    const teamsWithStats = teams?.map(team => {
      const soldPlayers = team.players?.filter((p: any) => p.status === 'sold') || [];
      const retainedPlayers = team.players?.filter((p: any) => p.status === 'retained') || [];
      const soldSpentPoints = soldPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0);
      const retentionSpent = team.retention_spent || 0;
      const totalSpentPoints = soldSpentPoints + retentionSpent;
      const totalBudget = tournament?.total_points || 100000;

      return {
        id: team.id,
        name: team.name,
        short_name: team.short_name,
        logo_url: team.logo_url,
        spent_points: totalSpentPoints,
        remaining_budget: totalBudget - totalSpentPoints,
        player_count: soldPlayers.length + retainedPlayers.length
      };
    }) || [];

    res.json(teamsWithStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get single team with squad
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('total_points, min_players')
      .eq('id', req.tournamentId)
      .single();

    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        players:players(
          id, name, photo_url, player_uid, jersey_number, sold_price, retention_price, status, is_retained, base_price,
          categories(name)
        )
      `)
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .single();

    if (error || !team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Filter to sold and retained players
    const soldPlayers = team.players?.filter((p: any) => p.status === 'sold') || [];
    const retainedPlayers = team.players?.filter((p: any) => p.status === 'retained') || [];

    // Calculate spent points
    const soldSpentPoints = soldPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0);
    const retentionSpent = team.retention_spent || 0;
    const totalSpentPoints = soldSpentPoints + retentionSpent;

    // Calculate budget values
    const playerCount = soldPlayers.length + retainedPlayers.length;
    const remainingSlots = Math.max(0, (tournament?.min_players || 7) - playerCount);
    const minBasePrice = 1000;
    const reservePoints = remainingSlots * minBasePrice;
    const totalBudget = team.total_budget || tournament?.total_points || 100000;
    const remainingBudget = totalBudget - totalSpentPoints;
    const maxBid = Math.max(0, remainingBudget - reservePoints);

    // Include both sold AND retained players in squad
    const squadPlayers = [...soldPlayers, ...retainedPlayers].map((p: any) => ({
      ...p,
      // For retained players, use retention_price as sold_price for display
      sold_price: p.status === 'retained' ? p.retention_price : p.sold_price
    }));

    res.json({
      ...team,
      players: squadPlayers,
      spent_points: totalSpentPoints,
      remaining_budget: remainingBudget,
      player_count: playerCount,
      retained_count: retainedPlayers.length,
      reserve_points: reservePoints,
      max_bid: maxBid,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Create team
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createTeamSchema.parse(req.body);

    // Get tournament budget
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('total_points')
      .eq('id', req.tournamentId)
      .single();

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        ...data,
        tournament_id: req.tournamentId,
        total_budget: data.total_budget || tournament?.total_points || 100000,
        spent_points: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Team creation error:', error);
      return res.status(500).json({ error: 'Failed to create team' });
    }

    // Emit socket event
    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');

    res.status(201).json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update team
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = updateTeamSchema.parse(req.body);

    // Extract version for optimistic locking (don't include in updates)
    const clientVersion = parsed.version;

    // Build updates object without version field
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined && key !== 'version') {
        updates[key] = value;
      }
    }

    // Don't update if no valid fields provided
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Build update query with optimistic locking if version provided
    let updateQuery = supabase
      .from('teams')
      .update(updates)
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId);

    // If client provided a version, use optimistic locking
    if (clientVersion !== undefined) {
      updateQuery = updateQuery.eq('version', clientVersion);
    }

    const { data: updatedRows, error } = await updateQuery.select();

    if (error) {
      return res.status(500).json({ error: 'Failed to update team' });
    }

    // If version was provided and no rows updated, it's a conflict
    if (clientVersion !== undefined && (!updatedRows || updatedRows.length === 0)) {
      // Fetch current version to return to client
      const { data: currentTeam } = await supabase
        .from('teams')
        .select('version')
        .eq('id', req.params.id)
        .single();

      return res.status(409).json({
        error: 'Conflict: Team was modified by another user',
        code: 'VERSION_CONFLICT',
        currentVersion: currentTeam?.version,
        yourVersion: clientVersion,
        hint: 'Refresh the data and try again'
      });
    }

    const team = updatedRows?.[0];

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');

    res.json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete team
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // First reset any players assigned to this team
    await supabase
      .from('players')
      .update({ team_id: null, status: 'available', sold_price: null })
      .eq('team_id', req.params.id);

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete team' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Remove player from team
router.delete('/:teamId/players/:playerId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: player, error } = await supabase
      .from('players')
      .update({
        team_id: null,
        status: 'available',
        sold_price: null
      })
      .eq('id', req.params.playerId)
      .eq('team_id', req.params.teamId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to remove player' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');
    io.to(`summary:${req.tournamentId}`).emit('teams:updated');

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove player' });
  }
});

export default router;
