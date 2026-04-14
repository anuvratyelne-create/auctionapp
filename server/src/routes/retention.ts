import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get retention settings for tournament
router.get('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('retention_enabled, max_retentions_per_team, retention_price')
      .eq('id', req.tournamentId)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch retention settings' });
    }

    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch retention settings' });
  }
});

// Update retention settings for tournament
router.put('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { retention_enabled, max_retentions_per_team, retention_price } = req.body;

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update({
        retention_enabled,
        max_retentions_per_team,
        retention_price
      })
      .eq('id', req.tournamentId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update retention settings' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('tournament:updated');

    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update retention settings' });
  }
});

// Get all retained players for tournament
router.get('/players', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select(`
        *,
        categories(id, name, base_price),
        teams(id, name, short_name, logo_url)
      `)
      .eq('tournament_id', req.tournamentId)
      .eq('is_retained', true)
      .order('retained_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch retained players' });
    }

    res.json(players || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch retained players' });
  }
});

// Get retained players for a specific team
router.get('/team/:teamId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select(`
        *,
        categories(id, name, base_price)
      `)
      .eq('tournament_id', req.tournamentId)
      .eq('team_id', req.params.teamId)
      .eq('is_retained', true)
      .order('retained_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch retained players' });
    }

    res.json(players || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch retained players' });
  }
});

// Retain a player for a team
router.post('/retain', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { team_id, player_id, retention_price } = req.body;

    // Get tournament settings
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('retention_enabled, max_retentions_per_team, retention_price, status')
      .eq('id', req.tournamentId)
      .single();

    if (!tournament?.retention_enabled) {
      return res.status(400).json({ error: 'Retention is not enabled for this tournament' });
    }

    if (tournament.status === 'live') {
      return res.status(400).json({ error: 'Cannot retain players after auction has started' });
    }

    // Get team's current retention count
    const { data: retainedPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('tournament_id', req.tournamentId)
      .eq('team_id', team_id)
      .eq('is_retained', true);

    const currentRetentions = retainedPlayers?.length || 0;

    if (currentRetentions >= tournament.max_retentions_per_team) {
      return res.status(400).json({
        error: `Maximum retentions (${tournament.max_retentions_per_team}) reached for this team`
      });
    }

    // Get team budget info
    const { data: team } = await supabase
      .from('teams')
      .select('total_budget, retention_spent')
      .eq('id', team_id)
      .single();

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check if player exists and is available
    const { data: player } = await supabase
      .from('players')
      .select('id, name, status, is_retained, base_price')
      .eq('id', player_id)
      .eq('tournament_id', req.tournamentId)
      .single();

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.is_retained) {
      return res.status(400).json({ error: 'Player is already retained' });
    }

    if (player.status !== 'available') {
      return res.status(400).json({ error: 'Player is not available for retention' });
    }

    // Retention price must be at least the player's base price
    // Use provided retention price if valid, otherwise use player's base price
    const minPrice = player.base_price || 0;
    let finalRetentionPrice = retention_price || minPrice;

    // Enforce minimum price (player's base price)
    if (finalRetentionPrice < minPrice) {
      finalRetentionPrice = minPrice;
    }

    // Check budget
    const newRetentionSpent = (team.retention_spent || 0) + finalRetentionPrice;
    if (newRetentionSpent > team.total_budget) {
      return res.status(400).json({ error: 'Insufficient budget for retention' });
    }

    // Update player as retained
    const { error: playerError } = await supabase
      .from('players')
      .update({
        is_retained: true,
        retention_price: finalRetentionPrice,
        retained_at: new Date().toISOString(),
        team_id: team_id,
        status: 'retained'
      })
      .eq('id', player_id)
      .eq('is_retained', false); // Only update if not already retained (prevents race condition)

    if (playerError) {
      return res.status(500).json({ error: 'Failed to retain player' });
    }

    // Verify the retention count again after update (race condition protection)
    const { data: verifyRetentions } = await supabase
      .from('players')
      .select('id')
      .eq('tournament_id', req.tournamentId)
      .eq('team_id', team_id)
      .eq('is_retained', true);

    if ((verifyRetentions?.length || 0) > tournament.max_retentions_per_team) {
      // Race condition occurred - rollback
      await supabase
        .from('players')
        .update({
          is_retained: false,
          retention_price: null,
          retained_at: null,
          team_id: null,
          status: 'available'
        })
        .eq('id', player_id);

      return res.status(400).json({
        error: `Maximum retentions (${tournament.max_retentions_per_team}) reached for this team`
      });
    }

    // Update team's retention spent
    const { error: teamError } = await supabase
      .from('teams')
      .update({
        retention_spent: newRetentionSpent
      })
      .eq('id', team_id);

    if (teamError) {
      // Rollback player update
      await supabase
        .from('players')
        .update({
          is_retained: false,
          retention_price: null,
          retained_at: null,
          team_id: null,
          status: 'available'
        })
        .eq('id', player_id);

      return res.status(500).json({ error: 'Failed to update team budget' });
    }

    // Emit socket events
    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');
    io.to(`tournament:${req.tournamentId}`).emit('retention:updated');

    res.json({
      success: true,
      message: `${player.name} retained successfully`,
      retention_price: finalRetentionPrice
    });
  } catch (error) {
    console.error('Retention error:', error);
    res.status(500).json({ error: 'Failed to retain player' });
  }
});

// Remove a retention
router.delete('/retain/:playerId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Get tournament status
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('status')
      .eq('id', req.tournamentId)
      .single();

    if (tournament?.status === 'live') {
      return res.status(400).json({ error: 'Cannot remove retention after auction has started' });
    }

    // Get player info
    const { data: player } = await supabase
      .from('players')
      .select('id, name, team_id, retention_price, is_retained')
      .eq('id', req.params.playerId)
      .eq('tournament_id', req.tournamentId)
      .single();

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (!player.is_retained) {
      return res.status(400).json({ error: 'Player is not retained' });
    }

    // Get team info
    const { data: team } = await supabase
      .from('teams')
      .select('id, retention_spent')
      .eq('id', player.team_id)
      .single();

    // Update player - remove retention
    const { error: playerError } = await supabase
      .from('players')
      .update({
        is_retained: false,
        retention_price: null,
        retained_at: null,
        team_id: null,
        status: 'available'
      })
      .eq('id', req.params.playerId);

    if (playerError) {
      return res.status(500).json({ error: 'Failed to remove retention' });
    }

    // Update team's retention spent
    if (team) {
      const newRetentionSpent = Math.max(0, (team.retention_spent || 0) - (player.retention_price || 0));
      await supabase
        .from('teams')
        .update({
          retention_spent: newRetentionSpent
        })
        .eq('id', team.id);
    }

    // Emit socket events
    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');
    io.to(`tournament:${req.tournamentId}`).emit('retention:updated');

    res.json({
      success: true,
      message: `${player.name} retention removed`
    });
  } catch (error) {
    console.error('Remove retention error:', error);
    res.status(500).json({ error: 'Failed to remove retention' });
  }
});

// Get retention summary for all teams
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('retention_enabled, max_retentions_per_team, retention_price')
      .eq('id', req.tournamentId)
      .single();

    const { data: teams } = await supabase
      .from('teams')
      .select(`
        id, name, short_name, logo_url, total_budget, retention_spent,
        players:players(id, name, photo_url, jersey_number, retention_price, is_retained, categories(name))
      `)
      .eq('tournament_id', req.tournamentId);

    const summary = teams?.map(team => {
      const retainedPlayers = team.players?.filter((p: any) => p.is_retained) || [];
      return {
        id: team.id,
        name: team.name,
        short_name: team.short_name,
        logo_url: team.logo_url,
        total_budget: team.total_budget,
        retention_spent: team.retention_spent || 0,
        retained_count: retainedPlayers.length,
        max_retentions: tournament?.max_retentions_per_team || 2,
        remaining_slots: (tournament?.max_retentions_per_team || 2) - retainedPlayers.length,
        retained_players: retainedPlayers.map((p: any) => ({
          id: p.id,
          name: p.name,
          photo_url: p.photo_url,
          jersey_number: p.jersey_number,
          retention_price: p.retention_price,
          category: p.categories?.name
        }))
      };
    }) || [];

    res.json({
      settings: tournament,
      teams: summary
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch retention summary' });
  }
});

export default router;
