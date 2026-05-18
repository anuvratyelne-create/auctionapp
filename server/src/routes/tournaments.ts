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
  category_prices: z.object({
    platinum: z.number().min(1),
    gold: z.number().min(1),
    silver: z.number().min(1),
    bronze: z.number().min(1),
  }).optional(),
});

// Helper to transform empty strings to null for optional URL fields
const optionalUrl = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.string().url().nullable().optional()
);

const optionalString = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.string().nullable().optional()
);

const updateTournamentSchema = z.object({
  name: z.string().optional(),
  logo_url: optionalUrl,
  broadcaster_logo_url: optionalUrl,
  broadcaster_name: optionalString,
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

    // Check if user exists in users table, create if not
    let ownerIdToUse: string | null = null;
    if (isValidUUID) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', req.userId)
        .single();

      if (existingUser) {
        ownerIdToUse = req.userId!;
      } else {
        // User doesn't exist in users table - create them with minimal info
        console.log('User not found in users table, creating user record');
        // Generate a short random placeholder for mobile (max 20 chars)
        const shortId = req.userId!.substring(0, 8);
        const { data: newUser, error: createUserError } = await supabase
          .from('users')
          .insert({
            id: req.userId,
            mobile: `user_${shortId}`,
            email: `user_${shortId}@migrated.local`,
            password_hash: 'migrated_user',
            name: 'User',
          })
          .select()
          .single();

        if (createUserError) {
          console.error('Failed to create user record:', createUserError);
          // Continue without owner_id rather than failing
        } else {
          ownerIdToUse = newUser.id;
          console.log('Created user record successfully:', newUser.id);
        }
      }
    }

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
        owner_id: ownerIdToUse
      })
      .select()
      .single();

    if (tournamentError) {
      console.error('Tournament creation error:', tournamentError);
      return res.status(500).json({ error: 'Failed to create tournament' });
    }

    // Update user's tournament_id to the new tournament ONLY if they don't have one
    // This preserves access to existing tournaments while setting a default
    if (isValidUUID) {
      // Check if user already has a tournament_id
      const { data: currentUser } = await supabase
        .from('users')
        .select('tournament_id')
        .eq('id', req.userId)
        .single();

      // Only set tournament_id if user doesn't have one (first tournament)
      // Otherwise, owner_id on the tournament is enough to track ownership
      if (!currentUser?.tournament_id) {
        const { error: userError } = await supabase
          .from('users')
          .update({ tournament_id: tournament.id })
          .eq('id', req.userId);

        if (userError) {
          console.error('User update error:', userError);
        }
      }
      // The tournament is still owned by the user via owner_id field
      console.log('Tournament created with owner_id:', ownerIdToUse, '- user tournament_id preserved');
    }

    // Create categories for the new tournament (use custom prices if provided)
    console.log('Creating tournament with category_prices:', data.category_prices);
    const categoryPrices = data.category_prices || {
      platinum: 50000,
      gold: 30000,
      silver: 20000,
      bronze: 10000
    };
    console.log('Using categoryPrices:', categoryPrices);

    const categories = [
      { name: 'Platinum', base_price: categoryPrices.platinum, display_order: 1 },
      { name: 'Gold', base_price: categoryPrices.gold, display_order: 2 },
      { name: 'Silver', base_price: categoryPrices.silver, display_order: 3 },
      { name: 'Bronze', base_price: categoryPrices.bronze, display_order: 4 }
    ];

    await supabase.from('categories').insert(
      categories.map(cat => ({
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

// Get all tournaments owned by user
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // For demo user or invalid UUID, return empty array
    const isValidUUID = req.userId && req.userId !== 'demo' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.userId);

    if (!isValidUUID) {
      return res.json([]);
    }

    // Get tournaments owned by user
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('owner_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tournaments:', error);
      return res.status(500).json({ error: 'Failed to fetch tournaments' });
    }

    let result = tournaments || [];

    // Also include the tournament from JWT token if not already in list
    // This handles cases where owner_id wasn't set properly
    if (req.tournamentId) {
      const alreadyIncluded = result.some((t: any) => t.id === req.tournamentId);
      if (!alreadyIncluded) {
        const { data: jwtTournament } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', req.tournamentId)
          .single();

        if (jwtTournament) {
          // Update owner_id if it's null (fix orphaned tournaments)
          if (!jwtTournament.owner_id) {
            await supabase
              .from('tournaments')
              .update({ owner_id: req.userId })
              .eq('id', req.tournamentId);
            jwtTournament.owner_id = req.userId;
          }
          result = [jwtTournament, ...result];
        }
      }
    }

    // Add team_count and player_count for each tournament
    const enrichedResult = await Promise.all(
      result.map(async (tournament: any) => {
        const { count: teamCount } = await supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournament.id);

        const { count: playerCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournament.id);

        return {
          ...tournament,
          team_count: teamCount || 0,
          player_count: playerCount || 0
        };
      })
    );

    res.json(enrichedResult);
  } catch (error) {
    console.error('Error in /my:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get demo tournament with teams and players (for trial/preview)
// Also provides a demo token so the auction panel can load data
router.get('/demo', async (req, res) => {
  try {
    // Get demo tournament by share code
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('share_code', 'DEMO01')
      .single();

    if (tournamentError || !tournament) {
      return res.status(404).json({ error: 'Demo tournament not found' });
    }

    // Get teams for demo tournament
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('created_at', { ascending: true });

    // Get players for demo tournament
    const { data: players } = await supabase
      .from('players')
      .select('*, category:categories(name)')
      .eq('tournament_id', tournament.id);

    // Get categories for demo tournament
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('display_order', { ascending: true });

    // Generate a demo token so the auction panel can call APIs
    const demoToken = jwt.sign(
      { userId: 'demo', tournamentId: tournament.id },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    res.json({
      tournament,
      teams: teams || [],
      players: players || [],
      categories: categories || [],
      token: demoToken,
      isDemo: true
    });
  } catch (error) {
    console.error('Error fetching demo tournament:', error);
    res.status(500).json({ error: 'Failed to fetch demo tournament' });
  }
});

// Switch to a different tournament (get new token)
router.post('/:id/select', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.params.id;

    // First try to find tournament by owner_id
    let { data: tournament, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .eq('owner_id', req.userId)
      .single();

    // If not found by owner_id, check if tournament exists and has no owner (orphaned)
    // or if it matches the JWT tournament (user created it but owner_id wasn't set)
    if (!tournament) {
      const { data: orphanedTournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (orphanedTournament) {
        // If tournament has no owner or matches JWT, claim it
        if (!orphanedTournament.owner_id || req.tournamentId === tournamentId) {
          // Update owner_id to current user
          await supabase
            .from('tournaments')
            .update({ owner_id: req.userId })
            .eq('id', tournamentId);

          orphanedTournament.owner_id = req.userId;
          tournament = orphanedTournament;
          console.log('Claimed orphaned tournament:', tournamentId);
        }
      }
    }

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found or access denied' });
    }

    // Generate new token with this tournament
    const token = jwt.sign(
      { userId: req.userId, tournamentId: tournament.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Update user's current tournament_id
    await supabase
      .from('users')
      .update({ tournament_id: tournament.id })
      .eq('id', req.userId);

    res.json({ tournament, token, message: 'Switched to tournament successfully' });
  } catch (error) {
    console.error('Select tournament error:', error);
    res.status(500).json({ error: 'Failed to switch tournament' });
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

// Delete tournament and all related data (DEPRECATED - use /:id instead)
router.delete('/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  console.log('DELETE /tournaments/current called - tournamentId:', req.tournamentId);
  try {
    const tournamentId = req.tournamentId;

    // Delete in order: bids -> players -> teams -> categories -> sponsors -> tournament
    // This respects foreign key constraints

    // 1. Delete all bids (must come before players due to foreign key)
    await supabase
      .from('bids')
      .delete()
      .eq('tournament_id', tournamentId);

    // 2. Delete all players
    await supabase
      .from('players')
      .delete()
      .eq('tournament_id', tournamentId);

    // 4. Delete all teams
    await supabase
      .from('teams')
      .delete()
      .eq('tournament_id', tournamentId);

    // 5. Delete all categories
    await supabase
      .from('categories')
      .delete()
      .eq('tournament_id', tournamentId);

    // 6. Delete all sponsors
    await supabase
      .from('sponsors')
      .delete()
      .eq('tournament_id', tournamentId);

    // 7. Delete the tournament itself
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (error) {
      console.error('Tournament deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete tournament' });
    }

    // Clear user's tournament_id reference
    if (req.userId && req.userId !== 'demo') {
      await supabase
        .from('users')
        .update({ tournament_id: null })
        .eq('id', req.userId);
    }

    res.json({ success: true, message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// Delete tournament by ID (explicit - preferred method)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const tournamentId = req.params.id;
  console.log('DELETE /tournaments/:id called - tournamentId:', tournamentId, 'userId:', req.userId);

  try {
    // Verify the user owns this tournament
    const { data: tournament, error: fetchError } = await supabase
      .from('tournaments')
      .select('id, owner_id, name')
      .eq('id', tournamentId)
      .single();

    if (fetchError || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check ownership - allow if:
    // 1. User is demo user, OR
    // 2. User owns the tournament, OR
    // 3. Tournament has no owner (owner_id is null), OR
    // 4. User's current tournament matches (they're logged into this tournament)
    const isDemo = req.userId === 'demo';
    const isOwner = tournament.owner_id === req.userId;
    const hasNoOwner = !tournament.owner_id;
    const isCurrentTournament = req.tournamentId === tournamentId;

    console.log('Delete permission check:', { isDemo, isOwner, hasNoOwner, isCurrentTournament, userId: req.userId, ownerId: tournament.owner_id, reqTournamentId: req.tournamentId });

    if (!isDemo && !isOwner && !hasNoOwner && !isCurrentTournament) {
      return res.status(403).json({ error: 'You do not have permission to delete this tournament' });
    }

    // Delete in order: bids -> players -> teams -> categories -> sponsors -> tournament
    // This respects foreign key constraints

    // 1. Delete all bids (must come before players due to foreign key)
    await supabase
      .from('bids')
      .delete()
      .eq('tournament_id', tournamentId);

    // 2. Delete all players
    await supabase
      .from('players')
      .delete()
      .eq('tournament_id', tournamentId);

    // 4. Delete all teams
    await supabase
      .from('teams')
      .delete()
      .eq('tournament_id', tournamentId);

    // 5. Delete all categories
    await supabase
      .from('categories')
      .delete()
      .eq('tournament_id', tournamentId);

    // 6. Delete all sponsors
    await supabase
      .from('sponsors')
      .delete()
      .eq('tournament_id', tournamentId);

    // 7. Delete the tournament itself
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (error) {
      console.error('Tournament deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete tournament' });
    }

    // If this was the user's current tournament, clear the reference
    if (req.userId && req.userId !== 'demo') {
      const { data: user } = await supabase
        .from('users')
        .select('tournament_id')
        .eq('id', req.userId)
        .single();

      if (user?.tournament_id === tournamentId) {
        await supabase
          .from('users')
          .update({ tournament_id: null })
          .eq('id', req.userId);
      }
    }

    console.log('Tournament deleted successfully:', tournamentId);
    res.json({ success: true, message: 'Tournament deleted successfully', deletedId: tournamentId });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

export default router;
