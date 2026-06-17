import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getAuctionState, getAuctionStateAsync, updateAuctionState } from '../socket/handlers';
import { getRolesByFilterCategory } from '../config/roleMapping';
import { auditLog } from '../utils/auditLog';
import { z } from 'zod';

// Validation schemas for auction endpoints
const bidSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  amount: z.number().positive('Bid amount must be positive').int('Bid amount must be a whole number'),
  expectedBid: z.number().nonnegative('Expected bid must be non-negative').int().optional()
});

const soldSchema = z.object({
  player_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional(),
  amount: z.number().positive().int().optional()
});

const router = Router();

// Simple mutex lock for bid operations per tournament
// Prevents race conditions when multiple bids come in simultaneously
const bidLocks = new Map<string, Promise<void>>();

async function withBidLock<T>(tournamentId: string, operation: () => Promise<T>): Promise<T> {
  // Wait for any existing lock to release
  const existingLock = bidLocks.get(tournamentId);
  if (existingLock) {
    await existingLock;
  }

  // Create a new lock
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  bidLocks.set(tournamentId, lockPromise);

  try {
    return await operation();
  } finally {
    releaseLock!();
    bidLocks.delete(tournamentId);
  }
}

// Helper to check if tournament exists and is approved for auction
async function checkTournamentApproval(tournamentId: string): Promise<{ exists: boolean; approved: boolean; status: string }> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('approval_status')
    .eq('id', tournamentId)
    .single();

  if (error || !data) {
    return { exists: false, approved: false, status: 'not_found' };
  }

  const status = data.approval_status || 'pending';
  return { exists: true, approved: status === 'approved', status };
}

// Dynamic bid increment based on current bid amount
function getBidIncrement(currentBid: number): number {
  if (currentBid >= 50000) return 5000;
  if (currentBid >= 30000) return 3000;
  if (currentBid >= 20000) return 2000;
  return 1000; // Default for bids under 20,000
}

// Get next available player (random or sequential)
router.get('/next-player', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if tournament exists and is approved before allowing auction
    const approval = await checkTournamentApproval(req.tournamentId!);
    if (!approval.exists) {
      return res.status(404).json({
        error: 'Tournament not found. It may have been deleted.',
        code: 'TOURNAMENT_NOT_FOUND'
      });
    }
    if (!approval.approved) {
      return res.status(403).json({
        error: 'Tournament must be approved by admin before starting auction',
        approval_status: approval.status
      });
    }

    const { category_id, role_category } = req.query;

    // Reset any STUCK 'bidding' players back to 'available'
    // Only reset players that have been in 'bidding' status for more than 5 minutes
    // This prevents race conditions where a real ongoing bid gets cancelled
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabase
      .from('players')
      .update({ status: 'available' })
      .eq('tournament_id', req.tournamentId)
      .eq('status', 'bidding')
      .lt('updated_at', fiveMinutesAgo);

    // Get tournament settings
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('player_display_mode')
      .eq('id', req.tournamentId)
      .single();

    let query = supabase
      .from('players')
      .select(`
        *,
        categories(id, name, base_price)
      `)
      .eq('tournament_id', req.tournamentId)
      .eq('status', 'available')
      .eq('is_retained', false)
      // Exclude pending registrations (players without category_id or base_price)
      .not('category_id', 'is', null)
      .not('base_price', 'is', null);

    if (category_id && category_id !== 'all') {
      query = query.eq('category_id', category_id);
    }

    const { data: players, error } = await query;

    // Filter by role category if specified
    let filteredPlayers = players || [];
    if (role_category && typeof role_category === 'string') {
      const validRoles = getRolesByFilterCategory(role_category);
      if (validRoles.length > 0) {
        filteredPlayers = filteredPlayers.filter((player: any) => {
          const playerRole = player.stats?.role?.toLowerCase();
          return playerRole && validRoles.some(r => r.toLowerCase() === playerRole);
        });
      }
    }

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (filteredPlayers.length === 0) {
      return res.status(404).json({ error: 'No available players' });
    }

    let selectedPlayer;

    if (tournament?.player_display_mode === 'sequential') {
      // Get player with lowest sequence number
      selectedPlayer = filteredPlayers.sort((a: any, b: any) => a.sequence_num - b.sequence_num)[0];
    } else {
      // Random selection
      const randomIndex = Math.floor(Math.random() * filteredPlayers.length);
      selectedPlayer = filteredPlayers[randomIndex];
    }

    // Update player status to bidding
    await supabase
      .from('players')
      .update({ status: 'bidding' })
      .eq('id', selectedPlayer.id);

    selectedPlayer.status = 'bidding';

    // Update auction state - ensure base_price is valid
    const io = req.app.get('io');
    const basePrice = selectedPlayer.base_price || selectedPlayer.categories?.base_price || 1000;
    const state = updateAuctionState(req.tournamentId!, {
      currentPlayer: selectedPlayer,
      currentBid: basePrice,
      currentTeam: null,
      bidHistory: [],
      status: 'bidding',
      auctionStarted: true // Mark auction as started
    });

    // Broadcast to all rooms
    io.to(`tournament:${req.tournamentId}`).emit('auction:state', state);
    io.to(`live:${req.tournamentId}`).emit('auction:state', state);
    io.to(`overlay:${req.tournamentId}`).emit('auction:state', state);

    res.json(selectedPlayer);
  } catch (error) {
    console.error('Error fetching next player:', error);
    res.status(500).json({ error: 'Failed to fetch next player' });
  }
});

// Get specific player for auction (manual/recall)
router.get('/player/:playerId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Check if tournament exists and is approved before allowing auction
    const approval = await checkTournamentApproval(req.tournamentId!);
    if (!approval.exists) {
      return res.status(404).json({
        error: 'Tournament not found. It may have been deleted.',
        code: 'TOURNAMENT_NOT_FOUND'
      });
    }
    if (!approval.approved) {
      return res.status(403).json({
        error: 'Tournament must be approved by admin before starting auction',
        approval_status: approval.status
      });
    }

    // First update player status to 'bidding' in database
    // This is critical for the /sold endpoint which checks for status='bidding'
    const { error: updateError } = await supabase
      .from('players')
      .update({ status: 'bidding' })
      .eq('id', req.params.playerId)
      .eq('tournament_id', req.tournamentId);

    if (updateError) {
      console.error('Failed to update player status to bidding:', updateError);
    }

    const { data: player, error } = await supabase
      .from('players')
      .select(`
        *,
        categories(id, name, base_price),
        teams(id, name, short_name, logo_url)
      `)
      .eq('id', req.params.playerId)
      .eq('tournament_id', req.tournamentId)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Update auction state
    const io = req.app.get('io');
    const state = updateAuctionState(req.tournamentId!, {
      currentPlayer: player,
      currentBid: player.sold_price || player.base_price,
      currentTeam: player.teams || null,
      bidHistory: [],
      status: 'bidding',
      auctionStarted: true // Mark auction as started
    });

    io.to(`tournament:${req.tournamentId}`).emit('auction:state', state);
    io.to(`live:${req.tournamentId}`).emit('auction:state', state);
    io.to(`overlay:${req.tournamentId}`).emit('auction:state', state);

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Place bid (with mutex lock and optimistic locking)
router.post('/bid', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Use mutex lock to prevent race conditions when multiple bids arrive simultaneously
  return withBidLock(req.tournamentId!, async () => {
    try {
      // Validate input
      const validationResult = bidSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid bid data',
          details: validationResult.error.format()
        });
      }
      const { team_id, amount, expectedBid } = validationResult.data;

      // Get tournament settings
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('total_points, min_players')
        .eq('id', req.tournamentId)
        .single();

      // Get team details with players for stats calculation
      const { data: team } = await supabase
        .from('teams')
        .select(`
          *,
          players:players(id, sold_price, status)
        `)
        .eq('id', team_id)
        .single();

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Calculate team stats
      const soldPlayers = team.players?.filter((p: any) => p.status === 'sold') || [];
      const spentPoints = soldPlayers.reduce((sum: number, p: any) => sum + (p.sold_price || 0), 0);
      const playerCount = soldPlayers.length;
      // Subtract 1 from remaining slots to account for the player being auctioned
      const remainingSlots = Math.max(0, (tournament?.min_players || 7) - playerCount - 1);
      const minBasePrice = 1000;
      const reservePoints = remainingSlots * minBasePrice;
      const totalBudget = team.total_budget || tournament?.total_points || 100000;
      const remainingBudget = totalBudget - spentPoints;
      const maxBid = Math.max(0, remainingBudget - reservePoints);

      // Create team object with stats (without players array)
      const teamWithStats = {
        ...team,
        spent_points: spentPoints,
        remaining_budget: remainingBudget,
        player_count: playerCount,
        reserve_points: reservePoints,
        max_bid: maxBid,
        players: undefined
      };

      const state = getAuctionState(req.tournamentId!);

      if (!state.currentPlayer) {
        return res.status(400).json({ error: 'No player in auction' });
      }

      // Optimistic locking: if expectedBid is provided, verify it matches current bid
      if (expectedBid !== undefined && state.currentBid !== expectedBid) {
        return res.status(409).json({
          error: 'Bid state changed. Please refresh and try again.',
          currentBid: state.currentBid
        });
      }

      // Check if this is the first bid for this player (bidHistory is empty)
      const isFirstBid = state.bidHistory.length === 0;

      // Check if same team is trying to bid again
      // Only block if NOT the first bid AND currentTeam matches the bidding team
      if (!isFirstBid && state.currentTeam?.id === team_id) {
        return res.status(400).json({ error: 'Same team cannot bid again. Wait for another team to bid.' });
      }

      // Check if bid exceeds team capacity (using already calculated maxBid)
      if (amount > maxBid) {
        return res.status(400).json({
          error: 'Bid exceeds team capacity',
          maxBid
        });
      }

      // Update auction state with team including stats
      const io = req.app.get('io');
      const newState = updateAuctionState(req.tournamentId!, {
        currentBid: amount,
        currentTeam: teamWithStats,
        bidHistory: [...state.bidHistory, { teamId: team.id, amount, timestamp: new Date() }]
      });

      // Record bid in database
      await supabase.from('bids').insert({
        player_id: state.currentPlayer.id,
        team_id: team.id,
        amount,
        tournament_id: req.tournamentId
      });

      // Audit log - don't await to avoid slowing down response
      auditLog.bidPlaced(req.userId!, req.tournamentId!, state.currentPlayer.id, {
        teamId: team.id,
        teamName: team.name,
        amount,
        playerName: state.currentPlayer.name
      });

      io.to(`tournament:${req.tournamentId}`).emit('auction:state', newState);
      io.to(`live:${req.tournamentId}`).emit('auction:state', newState);
      io.to(`overlay:${req.tournamentId}`).emit('auction:state', newState);
      // Refresh teams so BidDisplay shows accurate balance/squad
      io.to(`tournament:${req.tournamentId}`).emit('teams:updated');

      res.json({ success: true, state: newState });
    } catch (error) {
      console.error('Bid error:', error);
      res.status(500).json({ error: 'Failed to place bid' });
    }
  });
});

// Get current bid increment for display
router.get('/increment', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const state = getAuctionState(req.tournamentId!);
    const increment = getBidIncrement(state.currentBid);
    res.json({ currentBid: state.currentBid, increment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get increment' });
  }
});

// Increment bid amount (without assigning team)
router.post('/increment', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const state = getAuctionState(req.tournamentId!);

    if (!state.currentPlayer) {
      return res.status(400).json({ error: 'No player in auction' });
    }

    // Use dynamic increment based on current bid
    const dynamicIncrement = getBidIncrement(state.currentBid);
    const newAmount = amount || (state.currentBid + dynamicIncrement);

    const io = req.app.get('io');
    const newState = updateAuctionState(req.tournamentId!, {
      currentBid: newAmount
    });

    io.to(`tournament:${req.tournamentId}`).emit('auction:state', newState);
    io.to(`live:${req.tournamentId}`).emit('auction:state', newState);
    io.to(`overlay:${req.tournamentId}`).emit('auction:state', newState);

    res.json({ success: true, currentBid: newAmount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to increment bid' });
  }
});

// Mark player as sold (with race condition protection)
router.post('/sold', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Validate optional overrides if provided
    const validationResult = soldSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid sold data',
        details: validationResult.error.format()
      });
    }
    const { player_id, team_id, amount } = validationResult.data;
    const state = getAuctionState(req.tournamentId!);

    const playerId = player_id || state.currentPlayer?.id;
    const teamId = team_id || state.currentTeam?.id;
    const soldAmount = amount || state.currentBid;

    if (!playerId || !teamId) {
      return res.status(400).json({ error: 'Player and team required' });
    }

    // Update player with optimistic locking - only update if status is still 'bidding'
    // This prevents double-sell race conditions
    const { data: player, error } = await supabase
      .from('players')
      .update({
        status: 'sold',
        team_id: teamId,
        sold_price: soldAmount
      })
      .eq('id', playerId)
      .eq('status', 'bidding') // Only update if still in bidding state
      .select(`
        *,
        categories(id, name),
        teams(id, name, short_name, logo_url)
      `)
      .single();

    if (error) {
      // Check if this is because the player was already sold
      if (error.code === 'PGRST116') { // No rows returned
        return res.status(409).json({ error: 'Player already sold or state changed' });
      }
      return res.status(500).json({ error: 'Failed to update player' });
    }

    if (!player) {
      return res.status(409).json({ error: 'Player already sold or state changed' });
    }

    // Record final bid
    await supabase.from('bids').insert({
      player_id: playerId,
      team_id: teamId,
      amount: soldAmount,
      is_final: true,
      tournament_id: req.tournamentId
    });

    // Audit log - don't await to avoid slowing down response
    auditLog.playerSold(req.userId!, req.tournamentId!, playerId, {
      teamId,
      teamName: state.currentTeam?.name || player?.teams?.name,
      amount: soldAmount,
      playerName: player?.name || state.currentPlayer?.name
    });

    // Update auction state - save last player info for resume
    const io = req.app.get('io');
    const newState = updateAuctionState(req.tournamentId!, {
      status: 'sold',
      lastPlayer: state.currentPlayer,
      lastStatus: 'sold',
      lastTeam: state.currentTeam,
      lastPrice: soldAmount
    });

    // Broadcast auction state to all relevant rooms
    const rooms = [`tournament:${req.tournamentId}`, `live:${req.tournamentId}`, `overlay:${req.tournamentId}`];
    rooms.forEach(room => io.to(room).emit('auction:state', newState));

    // Broadcast data updates - combine into fewer emissions
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');
    io.to(`live:${req.tournamentId}`).emit('teams:updated');
    io.to(`summary:${req.tournamentId}`).emit('teams:updated');

    res.json({ success: true, player });
  } catch (error) {
    console.error('Sold error:', error);
    res.status(500).json({ error: 'Failed to mark as sold' });
  }
});

// Mark player as unsold (with race condition protection)
router.post('/unsold', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const state = getAuctionState(req.tournamentId!);

    if (!state.currentPlayer) {
      return res.status(400).json({ error: 'No player in auction' });
    }

    // Update player with optimistic locking - only update if status is still 'bidding'
    const { data: player, error } = await supabase
      .from('players')
      .update({ status: 'unsold' })
      .eq('id', state.currentPlayer.id)
      .eq('status', 'bidding') // Only update if still in bidding state
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return res.status(409).json({ error: 'Player state changed' });
      }
      return res.status(500).json({ error: 'Failed to update player' });
    }

    if (!player) {
      return res.status(409).json({ error: 'Player state changed' });
    }

    // Audit log - don't await to avoid slowing down response
    auditLog.playerUnsold(req.userId!, req.tournamentId!, state.currentPlayer.id);

    // Update auction state - save last player info for resume
    const io = req.app.get('io');
    const newState = updateAuctionState(req.tournamentId!, {
      status: 'unsold',
      lastPlayer: state.currentPlayer,
      lastStatus: 'unsold',
      lastTeam: null,
      lastPrice: state.currentBid
    });

    io.to(`tournament:${req.tournamentId}`).emit('auction:state', newState);
    io.to(`live:${req.tournamentId}`).emit('auction:state', newState);
    io.to(`overlay:${req.tournamentId}`).emit('auction:state', newState);
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.json({ success: true, player });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as unsold' });
  }
});

// Re-auction all unsold players
router.post('/reauction-unsold', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .update({ status: 'available' })
      .eq('tournament_id', req.tournamentId)
      .eq('status', 'unsold')
      .select();

    if (error) {
      return res.status(500).json({ error: 'Failed to re-auction players' });
    }

    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.json({ success: true, count: players?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to re-auction players' });
  }
});

// Reset auction (clear all sold data including retentions)
router.post('/reset', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tournamentId = req.tournamentId!;

    // Reset all players including retention data
    const { error: playersError } = await supabase
      .from('players')
      .update({
        status: 'available',
        team_id: null,
        sold_price: null,
        is_retained: false,
        retention_price: null,
        retained_at: null
      })
      .eq('tournament_id', tournamentId);

    if (playersError) {
      console.error('Reset players error:', playersError);
      return res.status(500).json({ error: 'Failed to reset players' });
    }

    // Reset all team spending (both spent_points and retention_spent)
    const { error: teamsError } = await supabase
      .from('teams')
      .update({
        spent_points: 0,
        retention_spent: 0
      })
      .eq('tournament_id', tournamentId);

    if (teamsError) {
      console.error('Reset teams error:', teamsError);
      return res.status(500).json({ error: 'Failed to reset teams' });
    }

    // Clear bids
    const { error: bidsError } = await supabase
      .from('bids')
      .delete()
      .eq('tournament_id', tournamentId);

    if (bidsError) {
      console.error('Reset bids error:', bidsError);
      return res.status(500).json({ error: 'Failed to clear bids' });
    }

    // Reset auction state completely (including timer, RTM, and auction lifecycle)
    const io = req.app.get('io');
    const state = updateAuctionState(tournamentId, {
      currentPlayer: null,
      currentBid: 0,
      currentTeam: null,
      bidHistory: [],
      status: 'idle',
      timer: {
        timeLeft: 30,
        isRunning: false,
        duration: 30
      },
      rtmEnabled: false,
      rtmTeam: null,
      // Reset auction lifecycle
      auctionStarted: false,
      lastPlayer: null,
      lastStatus: null,
      lastTeam: null,
      lastPrice: 0
    });

    // Broadcast reset to all rooms
    const rooms = [`tournament:${tournamentId}`, `live:${tournamentId}`, `overlay:${tournamentId}`];
    rooms.forEach(room => {
      io.to(room).emit('auction:state', state);
      io.to(room).emit('timer:sync', state.timer);
    });
    io.to(`tournament:${tournamentId}`).emit('players:updated');
    io.to(`tournament:${tournamentId}`).emit('teams:updated');
    io.to(`summary:${tournamentId}`).emit('teams:updated');

    // Audit log - important operation
    auditLog.auctionReset(req.userId!, tournamentId);

    res.json({ success: true, message: 'Auction reset including all retentions' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset auction' });
  }
});

// Get current auction state
router.get('/state', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const state = await getAuctionStateAsync(req.tournamentId!);
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get auction state' });
  }
});

// Update team points (recalculate all)
router.post('/update-points', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', req.tournamentId);

    // Points are calculated dynamically, so just trigger refresh
    const io = req.app.get('io');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');
    io.to(`summary:${req.tournamentId}`).emit('teams:updated');

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update points' });
  }
});

// ============================================
// TIMER ENDPOINTS (REST API for reliable timer control)
// ============================================

// Start timer
router.post('/timer/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { timeLeft, duration } = req.body;
    const tournamentId = req.tournamentId!;

    const newState = updateAuctionState(tournamentId, {
      timer: { timeLeft: timeLeft || duration || 30, isRunning: true, duration: duration || 30 }
    });

    // Broadcast to all rooms
    const io = req.app.get('io');
    const rooms = [`tournament:${tournamentId}`, `live:${tournamentId}`, `overlay:${tournamentId}`];
    rooms.forEach(room => io.to(room).emit('timer:sync', newState.timer));

    res.json({ success: true, timer: newState.timer });
  } catch (error) {
    console.error('Timer start error:', error);
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

// Pause timer
router.post('/timer/pause', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { timeLeft } = req.body;
    const tournamentId = req.tournamentId!;

    const state = getAuctionState(tournamentId);
    const newState = updateAuctionState(tournamentId, {
      timer: { ...state.timer, timeLeft: timeLeft ?? state.timer.timeLeft, isRunning: false }
    });

    // Broadcast to all rooms
    const io = req.app.get('io');
    const rooms = [`tournament:${tournamentId}`, `live:${tournamentId}`, `overlay:${tournamentId}`];
    rooms.forEach(room => io.to(room).emit('timer:sync', newState.timer));

    res.json({ success: true, timer: newState.timer });
  } catch (error) {
    console.error('Timer pause error:', error);
    res.status(500).json({ error: 'Failed to pause timer' });
  }
});

// Reset timer
router.post('/timer/reset', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { duration } = req.body;
    const tournamentId = req.tournamentId!;
    const timerDuration = duration || 30;

    const newState = updateAuctionState(tournamentId, {
      timer: { timeLeft: timerDuration, isRunning: false, duration: timerDuration }
    });

    // Broadcast to all rooms
    const io = req.app.get('io');
    const rooms = [`tournament:${tournamentId}`, `live:${tournamentId}`, `overlay:${tournamentId}`];
    rooms.forEach(room => io.to(room).emit('timer:sync', newState.timer));

    res.json({ success: true, timer: newState.timer });
  } catch (error) {
    console.error('Timer reset error:', error);
    res.status(500).json({ error: 'Failed to reset timer' });
  }
});

export default router;
