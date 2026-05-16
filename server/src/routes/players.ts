import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { getRolesByFilterCategory } from '../config/roleMapping';

const router = Router();

const createPlayerSchema = z.object({
  name: z.string().min(1),
  photo_url: z.string().url().optional().nullable(),
  jersey_number: z.string().optional(),
  category_id: z.string().uuid(),
  base_price: z.number().optional(),
  stats: z.record(z.any()).optional(),
  sequence_num: z.number().optional()
});

// Helper function to generate next player UID per tournament (P001, P002, etc.)
async function generatePlayerUID(tournamentId: string): Promise<string> {
  // Get count of players in THIS tournament only
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  // Simple sequential number per tournament
  const nextNum = (count || 0) + 1;

  // Format as P followed by 3-digit number (P001, P002, ... P999)
  return `P${nextNum.toString().padStart(3, '0')}`;
}

// Get all players
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status, category_id, role_category } = req.query;

    // Fetch players without joins first (faster query)
    let query = supabase
      .from('players')
      .select('id, name, photo_url, player_uid, jersey_number, base_price, sold_price, status, stats, sequence_num, is_retained, retention_price, category_id, team_id')
      .eq('tournament_id', req.tournamentId)
      .order('sequence_num', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
      if (status === 'available') {
        query = query
          .not('category_id', 'is', null)
          .not('base_price', 'is', null)
          .or('stats->>pending.is.null,stats->>pending.neq.true');
      }
    }

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data: players, error } = await query;

    if (error) {
      console.error('Players fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    // Fetch categories and teams separately (parallel, faster)
    const [categoriesRes, teamsRes] = await Promise.all([
      supabase.from('categories').select('id, name, base_price').eq('tournament_id', req.tournamentId),
      supabase.from('teams').select('id, name, short_name, logo_url').eq('tournament_id', req.tournamentId)
    ]);

    const categoriesMap = new Map((categoriesRes.data || []).map(c => [c.id, c]));
    const teamsMap = new Map((teamsRes.data || []).map(t => [t.id, t]));

    // Merge data
    let enrichedPlayers = (players || []).map(p => ({
      ...p,
      categories: p.category_id ? categoriesMap.get(p.category_id) : null,
      teams: p.team_id ? teamsMap.get(p.team_id) : null
    }));

    // Filter by role category if specified
    if (role_category && typeof role_category === 'string') {
      const validRoles = getRolesByFilterCategory(role_category);
      if (validRoles.length > 0) {
        enrichedPlayers = enrichedPlayers.filter((player: any) => {
          const playerRole = player.stats?.role?.toLowerCase();
          return playerRole && validRoles.some(r => r.toLowerCase() === playerRole);
        });
      }
    }

    res.json(enrichedPlayers);
  } catch (error) {
    console.error('Players route error:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get players for public view
router.get('/public/:tournamentId', async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('players')
      .select(`
        id, name, photo_url, player_uid, jersey_number, base_price, sold_price, status,
        categories(id, name),
        teams(id, name, short_name, logo_url)
      `)
      .eq('tournament_id', req.params.tournamentId)
      .order('sequence_num', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status as string);
    }

    const { data: players, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    res.json(players || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get pending player registrations (admin only)
// IMPORTANT: This must be before /:id route to avoid matching 'pending' as an id
router.get('/pending', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('tournament_id', req.tournamentId)
      .eq('stats->>pending', 'true')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Pending players fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch pending players' });
    }

    res.json(players || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending players' });
  }
});

// Search player by Player UID - MUST be before /:id route
router.get('/search/uid/:uid', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: player, error } = await supabase
      .from('players')
      .select(`
        *,
        categories(id, name, base_price),
        teams(id, name, short_name, logo_url)
      `)
      .eq('tournament_id', req.tournamentId)
      .ilike('player_uid', req.params.uid)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search player' });
  }
});

// Search player by jersey number (legacy) - MUST be before /:id route
router.get('/search/number/:number', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: player, error } = await supabase
      .from('players')
      .select(`
        *,
        categories(id, name, base_price),
        teams(id, name, short_name, logo_url)
      `)
      .eq('tournament_id', req.tournamentId)
      .eq('jersey_number', req.params.number)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search player' });
  }
});

// Get single player
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: player, error } = await supabase
      .from('players')
      .select(`
        *,
        categories(id, name, base_price),
        teams(id, name, short_name, logo_url)
      `)
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Create player
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const data = createPlayerSchema.parse(req.body);

    // Get category base price if not provided
    let basePrice = data.base_price;
    if (!basePrice) {
      const { data: category } = await supabase
        .from('categories')
        .select('base_price')
        .eq('id', data.category_id)
        .single();
      basePrice = category?.base_price || 1000;
    }

    // Get next sequence number
    const { data: lastPlayer } = await supabase
      .from('players')
      .select('sequence_num')
      .eq('tournament_id', req.tournamentId)
      .order('sequence_num', { ascending: false })
      .limit(1)
      .single();

    const sequenceNum = data.sequence_num || ((lastPlayer?.sequence_num || 0) + 1);

    // Generate unique player UID
    const playerUID = await generatePlayerUID(req.tournamentId!);

    const { data: player, error } = await supabase
      .from('players')
      .insert({
        ...data,
        tournament_id: req.tournamentId,
        base_price: basePrice,
        sequence_num: sequenceNum,
        player_uid: playerUID,
        status: 'available'
      })
      .select(`
        *,
        categories(id, name, base_price)
      `)
      .single();

    if (error) {
      console.error('Player creation error:', error);
      return res.status(500).json({ error: 'Failed to create player' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.status(201).json(player);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// Bulk create players
router.post('/bulk', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { players } = req.body;

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ error: 'Players array required' });
    }

    // Get last sequence number
    const { data: lastPlayer } = await supabase
      .from('players')
      .select('sequence_num')
      .eq('tournament_id', req.tournamentId)
      .order('sequence_num', { ascending: false })
      .limit(1)
      .single();

    let nextSeq = (lastPlayer?.sequence_num || 0) + 1;

    // Get categories for base prices
    const { data: categories } = await supabase
      .from('categories')
      .select('id, base_price')
      .eq('tournament_id', req.tournamentId);

    const categoryPrices = new Map(categories?.map(c => [c.id, c.base_price]) || []);

    // Get count of all players for unique UID generation
    const { count: totalCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true });

    const baseUID = (totalCount || 0) + 1;
    const baseTimestamp = Date.now() % 10000;

    const playersToInsert = players.map((p: any, idx: number) => {
      const uniqueNum = (baseUID + idx) * 10000 + baseTimestamp + idx;
      return {
        name: p.name,
        photo_url: p.photo_url || null,
        jersey_number: p.jersey_number || null,
        category_id: p.category_id,
        base_price: p.base_price || categoryPrices.get(p.category_id) || 1000,
        stats: p.stats || {},
        sequence_num: nextSeq + idx,
        player_uid: `P${uniqueNum.toString().padStart(8, '0')}`,
        tournament_id: req.tournamentId,
        status: 'available'
      };
    });

    const { data: createdPlayers, error } = await supabase
      .from('players')
      .insert(playersToInsert)
      .select();

    if (error) {
      console.error('Bulk create error:', error);
      return res.status(500).json({ error: 'Failed to create players' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.status(201).json(createdPlayers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create players' });
  }
});

// Bulk upsert players (create new or update existing)
// Matches by name (case-insensitive) OR jersey_number
router.post('/bulk-upsert', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { players } = req.body;

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ error: 'Players array required' });
    }

    // Fetch all existing players for this tournament
    const { data: existingPlayers, error: fetchError } = await supabase
      .from('players')
      .select('id, name, jersey_number, player_uid, status, team_id, sequence_num, stats')
      .eq('tournament_id', req.tournamentId);

    if (fetchError) {
      console.error('Fetch existing players error:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch existing players' });
    }

    // Create lookup maps for existing players
    const existingByName = new Map<string, any>();
    const existingByJersey = new Map<string, any>();

    for (const player of existingPlayers || []) {
      existingByName.set(player.name.toLowerCase().trim(), player);
      if (player.jersey_number) {
        existingByJersey.set(player.jersey_number.trim(), player);
      }
    }

    // Get categories for base prices
    const { data: categories } = await supabase
      .from('categories')
      .select('id, base_price')
      .eq('tournament_id', req.tournamentId);

    const categoryPrices = new Map(categories?.map(c => [c.id, c.base_price]) || []);

    // Get last sequence number for this tournament
    const { data: lastPlayer } = await supabase
      .from('players')
      .select('sequence_num')
      .eq('tournament_id', req.tournamentId)
      .order('sequence_num', { ascending: false })
      .limit(1)
      .single();

    let nextSeq = (lastPlayer?.sequence_num || 0) + 1;

    // Get count of players in THIS tournament for per-tournament UID
    const { count: tournamentPlayerCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', req.tournamentId);

    // Next UID number for this tournament (P001, P002, etc.)
    let nextUIDNum = (tournamentPlayerCount || 0) + 1;

    const results = {
      created: [] as any[],
      updated: [] as any[],
      errors: [] as { row: number; name: string; error: string }[],
    };

    // Process each player
    for (let i = 0; i < players.length; i++) {
      const p = players[i];

      try {
        // Try to match existing player
        let matchedPlayer: any = null;

        // First try name match (case-insensitive)
        if (p.name) {
          matchedPlayer = existingByName.get(p.name.toLowerCase().trim());
        }

        // If no name match, try jersey number match
        if (!matchedPlayer && p.jersey_number) {
          matchedPlayer = existingByJersey.get(p.jersey_number.trim());
        }

        if (matchedPlayer) {
          // UPDATE existing player - preserve id, player_uid, status, team_id
          const updatedStats = {
            ...matchedPlayer.stats,
            ...(p.stats || {}),
          };

          const updateData: any = {
            name: p.name || matchedPlayer.name,
            // Convert empty string to null for photo_url
            photo_url: p.photo_url !== undefined
              ? (p.photo_url || null)
              : matchedPlayer.photo_url,
            jersey_number: p.jersey_number !== undefined
              ? (p.jersey_number || null)
              : matchedPlayer.jersey_number,
            category_id: p.category_id || matchedPlayer.category_id,
            base_price: p.base_price || categoryPrices.get(p.category_id) || matchedPlayer.base_price,
            stats: updatedStats,
          };

          const { data: updatedPlayer, error: updateError } = await supabase
            .from('players')
            .update(updateData)
            .eq('id', matchedPlayer.id)
            .eq('tournament_id', req.tournamentId)
            .select()
            .single();

          if (updateError) {
            results.errors.push({
              row: p.rowNumber || i + 1,
              name: p.name || 'Unknown',
              error: updateError.message,
            });
          } else {
            results.updated.push(updatedPlayer);
          }
        } else {
          // INSERT new player - generate simple per-tournament UID (P001, P002, etc.)
          const playerUID = `P${(nextUIDNum++).toString().padStart(3, '0')}`;

          const newPlayerData = {
            name: p.name,
            photo_url: p.photo_url || null,
            jersey_number: p.jersey_number || null,
            category_id: p.category_id,
            base_price: p.base_price || categoryPrices.get(p.category_id) || 1000,
            stats: p.stats || {},
            sequence_num: nextSeq++,
            player_uid: playerUID,
            tournament_id: req.tournamentId,
            status: 'available',
          };

          const { data: createdPlayer, error: createError } = await supabase
            .from('players')
            .insert(newPlayerData)
            .select()
            .single();

          if (createError) {
            results.errors.push({
              row: p.rowNumber || i + 1,
              name: p.name || 'Unknown',
              error: createError.message,
            });
          } else {
            results.created.push(createdPlayer);
            // Add to lookup maps for subsequent rows in same batch
            if (createdPlayer) {
              existingByName.set(createdPlayer.name.toLowerCase().trim(), createdPlayer);
              if (createdPlayer.jersey_number) {
                existingByJersey.set(createdPlayer.jersey_number.trim(), createdPlayer);
              }
            }
          }
        }
      } catch (err: any) {
        results.errors.push({
          row: p.rowNumber || i + 1,
          name: p.name || 'Unknown',
          error: err.message || 'Unknown error',
        });
      }
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.status(200).json(results);
  } catch (error: any) {
    console.error('Bulk upsert error:', error);
    res.status(500).json({ error: error.message || 'Failed to upsert players' });
  }
});

// Update player
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const updates = createPlayerSchema.partial().parse(req.body);

    const { data: player, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .select(`
        *,
        categories(id, name, base_price),
        teams(id, name, short_name, logo_url)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update player' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.json(player);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Delete player
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete player' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

// Reset player to available (remove from team, clear sold status)
router.post('/:id/reset', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: player, error } = await supabase
      .from('players')
      .update({
        status: 'available',
        team_id: null,
        sold_price: null,
        is_retained: false,
        retention_price: null,
        retained_at: null
      })
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .select(`
        *,
        categories(id, name, base_price)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to reset player' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset player' });
  }
});

// Toggle player availability
router.post('/:id/toggle-availability', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // First get current status
    const { data: currentPlayer, error: fetchError } = await supabase
      .from('players')
      .select('status')
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .single();

    if (fetchError || !currentPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Toggle between available and unsold
    // Only allow toggle if player is 'available' or 'unsold'
    if (currentPlayer.status !== 'available' && currentPlayer.status !== 'unsold') {
      return res.status(400).json({
        error: 'Can only toggle availability for available or unsold players',
        currentStatus: currentPlayer.status
      });
    }

    const newStatus = currentPlayer.status === 'available' ? 'unsold' : 'available';

    const { data: player, error } = await supabase
      .from('players')
      .update({ status: newStatus })
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .select(`
        *,
        categories(id, name, base_price),
        teams(id, name, short_name, logo_url)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to toggle player availability' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle player availability' });
  }
});

// ========== PUBLIC PLAYER SELF-REGISTRATION ==========

// Schema for public player registration (no category - admin will assign)
const publicRegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  jersey_number: z.string().max(10).optional(),
  photo_url: z.string().optional().nullable(), // Allow any string, empty or URL
  role: z.string().max(50).optional(),
});

// Get public tournament info and categories for registration
router.get('/public/register/:shareCode/info', async (req, res) => {
  try {
    // Get tournament by share code
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, name, logo_url, status')
      .eq('share_code', req.params.shareCode)
      .single();

    if (tournamentError || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Only allow registration for tournaments in 'setup' status
    if (tournament.status !== 'setup') {
      return res.status(400).json({ error: 'Registration is closed for this tournament' });
    }

    // Get categories for this tournament
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, base_price')
      .eq('tournament_id', tournament.id)
      .order('name', { ascending: true });

    if (categoriesError) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        logo_url: tournament.logo_url,
      },
      categories: categories || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament info' });
  }
});

// Public player self-registration endpoint
router.post('/public/register/:shareCode', async (req, res) => {
  try {
    // Validate request body
    const data = publicRegisterSchema.parse(req.body);

    // Get tournament by share code
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, status')
      .eq('share_code', req.params.shareCode)
      .single();

    if (tournamentError || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Only allow registration for tournaments in 'setup' status
    if (tournament.status !== 'setup') {
      return res.status(400).json({ error: 'Registration is closed for this tournament' });
    }

    // Check for duplicate jersey number if provided
    if (data.jersey_number) {
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('jersey_number', data.jersey_number)
        .single();

      if (existingPlayer) {
        return res.status(400).json({ error: 'Jersey number already taken' });
      }
    }

    // Get next sequence number
    const { data: lastPlayer } = await supabase
      .from('players')
      .select('sequence_num')
      .eq('tournament_id', tournament.id)
      .order('sequence_num', { ascending: false })
      .limit(1)
      .single();

    const sequenceNum = (lastPlayer?.sequence_num || 0) + 1;

    // Generate unique player UID
    const playerUID = await generatePlayerUID(tournament.id);

    // Create the player - store pending flag in stats since 'pending' is not a valid status enum
    // We'll use status='available' but with stats.pending=true to indicate awaiting approval
    const { data: player, error: createError } = await supabase
      .from('players')
      .insert({
        name: data.name,
        jersey_number: data.jersey_number || null,
        player_uid: playerUID,
        category_id: null, // Admin will assign
        base_price: null, // Admin will assign
        photo_url: data.photo_url || null,
        stats: { role: data.role || null, pending: true }, // pending flag in stats
        tournament_id: tournament.id,
        sequence_num: sequenceNum,
        status: 'available', // Use available status, pending tracked via stats.pending
      })
      .select(`
        id, name, player_uid, jersey_number, photo_url, status, stats
      `)
      .single();

    if (createError) {
      console.error('Player registration error:', createError);
      // Show actual database error for debugging
      return res.status(400).json({ error: createError.message || 'Failed to register player' });
    }

    // Emit socket event to update players list
    const io = req.app.get('io');
    io.to(`tournament:${tournament.id}`).emit('players:updated');
    io.to(`tournament:${tournament.id}`).emit('pending:updated');

    res.status(201).json({
      success: true,
      player,
      message: 'Registration submitted! Awaiting admin approval.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register player' });
  }
});

// Approve pending player registration (admin only)
router.post('/:id/approve', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { category_id, base_price } = req.body;

    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Verify category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, base_price')
      .eq('id', category_id)
      .eq('tournament_id', req.tournamentId)
      .single();

    if (categoryError || !category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Get current player to preserve stats.role
    const { data: currentPlayer } = await supabase
      .from('players')
      .select('stats')
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .single();

    // Determine final base price
    const finalBasePrice = base_price || category.base_price || 1000;

    // Update player - remove pending flag, set category and price
    const updatedStats = { ...currentPlayer?.stats, pending: false };

    const { data: player, error } = await supabase
      .from('players')
      .update({
        category_id: category_id,
        base_price: finalBasePrice,
        stats: updatedStats,
      })
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .eq('stats->>pending', 'true')
      .select(`
        *,
        categories(id, name, base_price)
      `)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Pending player not found' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');
    io.to(`tournament:${req.tournamentId}`).emit('pending:updated');

    res.json({ success: true, player });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve player' });
  }
});

// Reject pending player registration (admin only)
router.post('/:id/reject', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', req.params.id)
      .eq('tournament_id', req.tournamentId)
      .eq('stats->>pending', 'true');

    if (error) {
      return res.status(500).json({ error: 'Failed to reject player' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('pending:updated');

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject player' });
  }
});

export default router;
