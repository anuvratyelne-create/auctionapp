import { Router, Response } from 'express';
import supabase from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getAuctionState, updateAuctionState } from '../socket/handlers';

const router = Router();

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
    const { category_id } = req.query;

    // Reset any stuck 'bidding' players back to 'available' first
    // This handles cases where the auction was abandoned mid-bid
    await supabase
      .from('players')
      .update({ status: 'available' })
      .eq('tournament_id', req.tournamentId)
      .eq('status', 'bidding');

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

    console.log('Next player query - found:', players?.length, 'players with status=available');

    if (error) {
      console.error('Next player query error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!players || players.length === 0) {
      // Debug: Check all player statuses
      const { data: allPlayers } = await supabase
        .from('players')
        .select('id, name, status')
        .eq('tournament_id', req.tournamentId);
      console.log('All players statuses:', allPlayers?.map(p => ({ name: p.name, status: p.status })));
      return res.status(404).json({ error: 'No available players' });
    }

    let selectedPlayer;

    if (tournament?.player_display_mode === 'sequential') {
      // Get player with lowest sequence number
      selectedPlayer = players.sort((a, b) => a.sequence_num - b.sequence_num)[0];
    } else {
      // Random selection
      const randomIndex = Math.floor(Math.random() * players.length);
      selectedPlayer = players[randomIndex];
    }

    // Update player status to bidding
    await supabase
      .from('players')
      .update({ status: 'bidding' })
      .eq('id', selectedPlayer.id);

    selectedPlayer.status = 'bidding';

    // Update auction state
    const io = req.app.get('io');
    const state = updateAuctionState(req.tournamentId!, {
      currentPlayer: selectedPlayer,
      currentBid: selectedPlayer.base_price,
      currentTeam: null,
      bidHistory: [],
      status: 'bidding'
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
      status: 'bidding'
    });

    io.to(`tournament:${req.tournamentId}`).emit('auction:state', state);
    io.to(`live:${req.tournamentId}`).emit('auction:state', state);
    io.to(`overlay:${req.tournamentId}`).emit('auction:state', state);

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Place bid
router.post('/bid', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { team_id, amount } = req.body;

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

    // Check if this is the first bid for this player (bidHistory is empty)
    const isFirstBid = state.bidHistory.length === 0;

    // Check if same team is trying to bid again
    // Only block if NOT the first bid AND currentTeam matches the bidding team
    console.log('Bid check - isFirstBid:', isFirstBid, 'currentTeam:', state.currentTeam?.id, 'incoming team_id:', team_id);
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

// Mark player as sold
router.post('/sold', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { player_id, team_id, amount } = req.body;
    const state = getAuctionState(req.tournamentId!);

    const playerId = player_id || state.currentPlayer?.id;
    const teamId = team_id || state.currentTeam?.id;
    const soldAmount = amount || state.currentBid;

    if (!playerId || !teamId) {
      return res.status(400).json({ error: 'Player and team required' });
    }

    // Update player
    const { data: player, error } = await supabase
      .from('players')
      .update({
        status: 'sold',
        team_id: teamId,
        sold_price: soldAmount
      })
      .eq('id', playerId)
      .select(`
        *,
        categories(id, name),
        teams(id, name, short_name, logo_url)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update player' });
    }

    // Record final bid
    await supabase.from('bids').insert({
      player_id: playerId,
      team_id: teamId,
      amount: soldAmount,
      is_final: true,
      tournament_id: req.tournamentId
    });

    // Update auction state
    const io = req.app.get('io');
    const newState = updateAuctionState(req.tournamentId!, {
      status: 'sold'
    });

    io.to(`tournament:${req.tournamentId}`).emit('auction:state', newState);
    io.to(`live:${req.tournamentId}`).emit('auction:state', newState);
    io.to(`overlay:${req.tournamentId}`).emit('auction:state', newState);
    io.to(`summary:${req.tournamentId}`).emit('teams:updated');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');
    io.to(`live:${req.tournamentId}`).emit('teams:updated');
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');

    res.json({ success: true, player });
  } catch (error) {
    console.error('Sold error:', error);
    res.status(500).json({ error: 'Failed to mark as sold' });
  }
});

// Mark player as unsold
router.post('/unsold', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const state = getAuctionState(req.tournamentId!);

    if (!state.currentPlayer) {
      return res.status(400).json({ error: 'No player in auction' });
    }

    // Update player
    const { data: player, error } = await supabase
      .from('players')
      .update({ status: 'unsold' })
      .eq('id', state.currentPlayer.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update player' });
    }

    // Update auction state
    const io = req.app.get('io');
    const newState = updateAuctionState(req.tournamentId!, {
      status: 'unsold'
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
    // Reset all players including retention data
    await supabase
      .from('players')
      .update({
        status: 'available',
        team_id: null,
        sold_price: null,
        is_retained: false,
        retention_price: null,
        retained_at: null
      })
      .eq('tournament_id', req.tournamentId);

    // Reset all team spending (both spent_points and retention_spent)
    await supabase
      .from('teams')
      .update({
        spent_points: 0,
        retention_spent: 0
      })
      .eq('tournament_id', req.tournamentId);

    // Clear bids
    await supabase
      .from('bids')
      .delete()
      .eq('tournament_id', req.tournamentId);

    // Reset auction state
    const io = req.app.get('io');
    const state = updateAuctionState(req.tournamentId!, {
      currentPlayer: null,
      currentBid: 0,
      currentTeam: null,
      bidHistory: [],
      status: 'idle'
    });

    io.to(`tournament:${req.tournamentId}`).emit('auction:state', state);
    io.to(`tournament:${req.tournamentId}`).emit('players:updated');
    io.to(`tournament:${req.tournamentId}`).emit('teams:updated');
    io.to(`live:${req.tournamentId}`).emit('auction:state', state);
    io.to(`summary:${req.tournamentId}`).emit('teams:updated');

    res.json({ success: true, message: 'Auction reset including all retentions' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset auction' });
  }
});

// Get current auction state
router.get('/state', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const state = getAuctionState(req.tournamentId!);
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

export default router;
