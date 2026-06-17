import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { clearTournamentState } from '../socket/handlers';
import { z } from 'zod';
import { auditLog } from '../utils/auditLog';

// Generate cryptographically secure share code
function generateSecureShareCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

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
// IMPORTANT: Keep undefined as undefined so Zod's .optional() excludes it from output
const optionalUrl = z.preprocess(
  (val) => (val === '' ? null : val),
  z.string().url().nullable().optional()
);

const optionalString = z.preprocess(
  (val) => (val === '' ? null : val),
  z.string().nullable().optional()
);

// Overlay settings schema for OBS/streaming overlays
const overlaySettingsSchema = z.object({
  theme: z.enum(['auto', 'classic', 'fire', 'city', 'premium']).default('auto'),
  mode: z.enum(['minimal', 'standard', 'full']).default('standard'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#22c55e'),
  showParticles: z.boolean().default(true),
  showTimer: z.boolean().default(true),
  showTeamLogo: z.boolean().default(true),
}).optional();

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
  player_display_mode: z.enum(['random', 'sequential']).optional(),
  overlay_settings: overlaySettingsSchema,
  // Optimistic locking - client passes current version to prevent concurrent edit conflicts
  version: z.number().int().positive().optional()
});

// Create new tournament
// Uses manual transaction pattern with full rollback on any failure
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Track created resources for rollback
  let createdTournamentId: string | null = null;
  let createdMigratedUserId: string | null = null;

  try {
    const data = createTournamentSchema.parse(req.body);

    // Generate cryptographically secure share code
    const shareCode = generateSecureShareCode();

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
          createdMigratedUserId = newUser.id; // Track for rollback
        }
      }
    }

    // Step 1: Create the tournament
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

    if (tournamentError || !tournament) {
      console.error('Tournament creation error:', tournamentError);
      throw new Error(`Tournament creation failed: ${tournamentError?.message || 'Unknown error'}`);
    }
    createdTournamentId = tournament.id;

    // Step 2: Update user's tournament_id if they don't have one
    if (isValidUUID) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('tournament_id')
        .eq('id', req.userId)
        .single();

      if (!currentUser?.tournament_id) {
        const { error: userError } = await supabase
          .from('users')
          .update({ tournament_id: tournament.id })
          .eq('id', req.userId);

        if (userError) {
          console.error('User update error (non-fatal):', userError);
          // This is non-fatal - owner_id is the source of truth
        }
      }
    }

    // Step 3: Create categories for the new tournament
    const categoryPrices = data.category_prices || {
      platinum: 50000,
      gold: 30000,
      silver: 20000,
      bronze: 10000
    };

    const categories = [
      { name: 'Platinum', base_price: categoryPrices.platinum, display_order: 1 },
      { name: 'Gold', base_price: categoryPrices.gold, display_order: 2 },
      { name: 'Silver', base_price: categoryPrices.silver, display_order: 3 },
      { name: 'Bronze', base_price: categoryPrices.bronze, display_order: 4 }
    ];

    const { error: categoriesError } = await supabase.from('categories').insert(
      categories.map(cat => ({
        ...cat,
        tournament_id: tournament.id
      }))
    );

    if (categoriesError) {
      throw new Error(`Failed to create categories: ${categoriesError.message}`);
    }

    // All steps successful - generate JWT
    const token = jwt.sign(
      { userId: req.userId, tournamentId: tournament.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Audit log - tournament created
    auditLog.tournamentCreated(req.userId!, tournament.id, {
      name: tournament.name,
      sportsType: tournament.sports_type
    });

    res.status(201).json({
      tournament,
      token,
      message: 'Tournament created successfully'
    });
  } catch (error) {
    // Rollback in reverse order
    if (createdTournamentId) {
      await supabase.from('categories').delete().eq('tournament_id', createdTournamentId);
      await supabase.from('tournaments').delete().eq('id', createdTournamentId);
    }

    if (createdMigratedUserId) {
      // Only delete if we created this user during this request
      await supabase.from('users').delete().eq('id', createdMigratedUserId);
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
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

// Get tournament by share code (public) - includes overlay settings for OBS
router.get('/share/:shareCode', async (req, res) => {
  try {
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('id, name, logo_url, broadcaster_logo_url, broadcaster_name, status, share_code, overlay_settings')
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
    const parsed = updateTournamentSchema.parse(req.body);

    // Extract version for optimistic locking (don't include in updates)
    const clientVersion = parsed.version;

    // Filter out undefined values - only update fields that were explicitly provided
    // This prevents accidentally clearing fields that weren't in the request
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(parsed)) {
      // Don't include version in updates - it's auto-incremented by trigger
      if (value !== undefined && key !== 'version') {
        updates[key] = value;
      }
    }

    // Don't update if no valid fields provided
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Check if trying to go live - require admin approval first (skip in development if column doesn't exist)
    if (updates.status === 'live') {
      const { data: currentTournament } = await supabase
        .from('tournaments')
        .select('approval_status')
        .eq('id', req.tournamentId)
        .single();

      // In development mode, allow going live if approval_status column doesn't exist yet
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const approvalStatus = currentTournament?.approval_status;

      // Only block if: approval column exists AND status is not 'approved'
      // In dev mode, also allow if column doesn't exist (undefined/null)
      if (approvalStatus !== 'approved' && !(isDevelopment && approvalStatus === undefined)) {
        return res.status(403).json({
          error: 'Tournament must be approved by admin before going live',
          approval_status: approvalStatus || 'pending'
        });
      }
    }

    // Build update query with optimistic locking if version provided
    let updateQuery = supabase
      .from('tournaments')
      .update(updates)
      .eq('id', req.tournamentId);

    // If client provided a version, use optimistic locking
    if (clientVersion !== undefined) {
      updateQuery = updateQuery.eq('version', clientVersion);
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select();

    if (updateError) {
      console.error('Tournament update error:', updateError);
      return res.status(500).json({ error: 'Failed to update tournament' });
    }

    // If version was provided and no rows updated, it's a conflict
    if (clientVersion !== undefined && (!updatedRows || updatedRows.length === 0)) {
      // Fetch current version to return to client
      const { data: currentTournament } = await supabase
        .from('tournaments')
        .select('version')
        .eq('id', req.tournamentId)
        .single();

      return res.status(409).json({
        error: 'Conflict: Tournament was modified by another user',
        code: 'VERSION_CONFLICT',
        currentVersion: currentTournament?.version,
        yourVersion: clientVersion,
        hint: 'Refresh the data and try again'
      });
    }

    // Fetch the FULL tournament record to ensure all fields are returned
    const { data: tournament, error: fetchError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', req.tournamentId)
      .single();

    if (fetchError || !tournament) {
      console.error('Tournament fetch error:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch updated tournament' });
    }

    // Audit log - tournament updated
    auditLog.tournamentUpdated(req.userId!, req.tournamentId!, {
      updatedFields: Object.keys(updates)
    });

    res.json(tournament);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Tournament update error:', error);
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

    // Clear in-memory state for this tournament
    clearTournamentState(tournamentId!);

    res.json({ success: true, message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// Delete tournament by ID (explicit - preferred method)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const tournamentId = req.params.id;

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
    // 3. User's current tournament matches (they're logged into this tournament)
    // NOTE: We no longer allow deletion of ownerless tournaments by anyone (security fix)
    const isDemo = req.userId === 'demo';
    const isOwner = tournament.owner_id === req.userId;
    const isCurrentTournament = req.tournamentId === tournamentId;

    if (!isDemo && !isOwner && !isCurrentTournament) {
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

    // If this was the user's current tournament, find another one to set as current
    let fallbackTournament = null;
    if (req.userId && req.userId !== 'demo') {
      const { data: user } = await supabase
        .from('users')
        .select('tournament_id')
        .eq('id', req.userId)
        .single();

      if (user?.tournament_id === tournamentId) {
        // Find another tournament owned by this user
        const { data: otherTournaments } = await supabase
          .from('tournaments')
          .select('*')
          .eq('owner_id', req.userId)
          .neq('id', tournamentId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (otherTournaments && otherTournaments.length > 0) {
          // Set the most recent other tournament as current
          fallbackTournament = otherTournaments[0];
          await supabase
            .from('users')
            .update({ tournament_id: fallbackTournament.id })
            .eq('id', req.userId);
        } else {
          // No other tournaments, clear the reference
          await supabase
            .from('users')
            .update({ tournament_id: null })
            .eq('id', req.userId);
        }
      }
    }

    // Clear in-memory state for this tournament
    clearTournamentState(tournamentId);

    res.json({
      success: true,
      message: 'Tournament deleted successfully',
      deletedId: tournamentId,
      fallbackTournament // Include fallback tournament info for client
    });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

export default router;
