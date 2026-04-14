import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createTournamentSchema = z.object({
  name: z.string().min(1, 'Auction name is required'),
  logo_url: z.string().url().optional().nullable(),
  sports_type: z.enum(['cricket', 'football', 'kabaddi', 'basketball', 'other']).default('cricket'),
  auction_date: z.string().optional().nullable(),
  auction_time: z.string().optional().nullable(),
  total_points: z.number().min(1000).default(1000000),
  default_base_bid: z.number().min(100).default(10000),
  bid_increment: z.number().min(100).default(5000),
  min_players: z.number().min(1).default(15),
  max_players: z.number().min(1).default(18),
});

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

// Create new tournament
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createTournamentSchema.parse(req.body);

    // Generate unique share code
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Check if userId is a valid UUID (demo user has "demo" as userId)
    const isValidUUID = req.userId && req.userId !== 'demo' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.userId);

    // Create the tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: data.name,
        logo_url: data.logo_url || null,
        sports_type: data.sports_type,
        auction_date: data.auction_date || null,
        auction_time: data.auction_time || null,
        total_points: data.total_points,
        default_base_bid: data.default_base_bid,
        bid_increment: data.bid_increment,
        min_players: data.min_players,
        max_players: data.max_players,
        share_code: shareCode,
        status: 'setup',
        owner_id: isValidUUID ? req.userId : null
      })
      .select()
      .single();

    if (tournamentError) {
      console.error('Tournament creation error:', tournamentError);
      return res.status(500).json({ error: 'Failed to create tournament' });
    }

    // Update user's tournament_id to the new tournament (skip for demo user)
    if (isValidUUID) {
      const { error: userError } = await supabase
        .from('users')
        .update({ tournament_id: tournament.id })
        .eq('id', req.userId);

      if (userError) {
        console.error('User update error:', userError);
        // Don't rollback tournament - it's still valid, just not associated
      }
    }

    // Create default categories for the new tournament
    const defaultCategories = [
      { name: 'Platinum', base_price: 50000, display_order: 1 },
      { name: 'Gold', base_price: 30000, display_order: 2 },
      { name: 'Silver', base_price: 20000, display_order: 3 },
      { name: 'Bronze', base_price: 10000, display_order: 4 }
    ];

    await supabase.from('categories').insert(
      defaultCategories.map(cat => ({
        ...cat,
        tournament_id: tournament.id
      }))
    );

    // Generate new JWT token with the new tournament ID
    const token = jwt.sign(
      { userId: req.userId, tournamentId: tournament.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      tournament,
      token,
      message: 'Tournament created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
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
    const { name, logo_url, display_order } = req.body;

    const { data: sponsor, error } = await supabase
      .from('sponsors')
      .insert({
        tournament_id: req.tournamentId,
        name: name || null,
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
