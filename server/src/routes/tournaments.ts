import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const updateTournamentSchema = z.object({
  name: z.string().optional(),
  logo_url: z.string().url().optional().nullable(),
  total_points: z.number().min(1000).optional(),
  min_players: z.number().min(1).optional(),
  max_players: z.number().min(1).optional(),
  bid_increment: z.number().min(100).optional(),
  status: z.enum(['setup', 'live', 'paused', 'completed']).optional(),
  player_display_mode: z.enum(['random', 'sequential']).optional()
});

// Get tournament by share code (public)
router.get('/share/:shareCode', async (req, res) => {
  try {
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('id, name, logo_url, status, share_code')
      .eq('share_code', req.params.shareCode.toUpperCase())
      .single();

    if (error || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// Get current tournament
router.get('/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', req.tournamentId)
      .single();

    if (error || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// Update tournament
router.put('/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const updates = updateTournamentSchema.parse(req.body);

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', req.tournamentId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update tournament' });
    }

    res.json(tournament);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

// Get tournament stats
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', req.tournamentId);

    const { data: players } = await supabase
      .from('players')
      .select('id, status, is_retained')
      .eq('tournament_id', req.tournamentId);

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('total_points')
      .eq('id', req.tournamentId)
      .single();

    const soldPlayers = players?.filter(p => p.status === 'sold') || [];
    const retainedPlayers = players?.filter(p => p.status === 'retained' || p.is_retained) || [];
    const acquiredPlayers = [...soldPlayers, ...retainedPlayers.filter(rp => !soldPlayers.find(sp => sp.id === rp.id))];

    const stats = {
      totalTeams: teams?.length || 0,
      totalPlayers: players?.length || 0,
      soldPlayers: acquiredPlayers.length, // Includes retained
      auctionSold: soldPlayers.length,
      retainedPlayers: retainedPlayers.length,
      unsoldPlayers: players?.filter(p => p.status === 'unsold').length || 0,
      availablePlayers: players?.filter(p => p.status === 'available').length || 0,
      totalBudget: tournament?.total_points || 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Add sponsor
router.post('/sponsors', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { logo_url, display_order } = req.body;

    const { data: sponsor, error } = await supabase
      .from('sponsors')
      .insert({
        tournament_id: req.tournamentId,
        logo_url,
        display_order: display_order || 1
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to add sponsor' });
    }

    res.status(201).json(sponsor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add sponsor' });
  }
});

// Get sponsors
router.get('/sponsors', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: sponsors, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('tournament_id', req.tournamentId)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch sponsors' });
    }

    res.json(sponsors || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sponsors' });
  }
});

// Delete sponsor
router.delete('/sponsors/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await supabase
      .from('sponsors')
      .delete()
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete sponsor' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sponsor' });
  }
});

export default router;
