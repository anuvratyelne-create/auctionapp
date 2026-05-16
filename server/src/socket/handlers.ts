import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase';

interface AuctionState {
  currentPlayer: any | null;
  currentBid: number;
  currentTeam: any | null;
  bidHistory: Array<{ teamId: string; amount: number; timestamp: Date }>;
  status: 'idle' | 'bidding' | 'sold' | 'unsold';
  timer: {
    timeLeft: number;
    isRunning: boolean;
    duration: number;
  };
  rtmEnabled: boolean;
  rtmTeam: any | null;
}

interface ChatMessage {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
}

// Store chat messages per tournament with timestamps for cleanup
interface ChatStorage {
  messages: ChatMessage[];
  lastAccess: number;
}
const chatMessages: Map<string, ChatStorage> = new Map();

// Store auction states per tournament with timestamps for cleanup
interface AuctionStateStorage {
  state: AuctionState;
  lastAccess: number;
}
const auctionStates: Map<string, AuctionStateStorage> = new Map();

// Track which tournaments have been initialized from DB
const initializedTournaments: Set<string> = new Set();

// Cleanup stale entries every 30 minutes (entries not accessed in 2 hours)
const STATE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

setInterval(() => {
  const now = Date.now();
  const expiry = now - STATE_TTL_MS;

  // Cleanup stale auction states
  for (const [tournamentId, storage] of auctionStates.entries()) {
    if (storage.lastAccess < expiry) {
      auctionStates.delete(tournamentId);
      initializedTournaments.delete(tournamentId);
    }
  }

  // Cleanup stale chat messages
  for (const [tournamentId, storage] of chatMessages.entries()) {
    if (storage.lastAccess < expiry) {
      chatMessages.delete(tournamentId);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Restore auction state from database (for server restart scenarios)
async function restoreAuctionStateFromDB(tournamentId: string): Promise<AuctionState | null> {
  try {
    // Check for any player with status='bidding' in this tournament
    const { data: biddingPlayer, error } = await supabase
      .from('players')
      .select(`
        *,
        categories(id, name, base_price)
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'bidding')
      .single();

    if (error || !biddingPlayer) {
      return null; // No player currently being auctioned
    }

    // Get the latest bid for this player
    const { data: latestBid } = await supabase
      .from('bids')
      .select(`
        amount,
        team_id,
        teams(id, name, short_name, logo_url, total_budget)
      `)
      .eq('player_id', biddingPlayer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get team stats if there's a current bidder
    let currentTeamWithStats = null;
    if (latestBid?.teams) {
      const team = latestBid.teams as any;

      // Get team's full data including retention_spent
      const { data: teamData } = await supabase
        .from('teams')
        .select('retention_spent, total_budget')
        .eq('id', team.id)
        .single();

      // Get team's sold AND retained players to calculate stats
      const { data: players } = await supabase
        .from('players')
        .select('sold_price, retention_price, status')
        .eq('team_id', team.id)
        .in('status', ['sold', 'retained']);

      const soldPlayers = players?.filter(p => p.status === 'sold') || [];
      const retainedPlayers = players?.filter(p => p.status === 'retained') || [];

      const soldSpentPoints = soldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
      const retentionSpent = teamData?.retention_spent || 0;
      const totalSpentPoints = soldSpentPoints + retentionSpent;

      const playerCount = soldPlayers.length + retainedPlayers.length;
      const totalBudget = teamData?.total_budget || team.total_budget || 100000;

      currentTeamWithStats = {
        ...team,
        spent_points: totalSpentPoints,
        remaining_budget: totalBudget - totalSpentPoints,
        player_count: playerCount,
        retained_count: retainedPlayers.length,
      };
    }

    console.log(`Restored auction state for tournament ${tournamentId}: Player ${biddingPlayer.name}, Bid: ${latestBid?.amount || biddingPlayer.base_price}`);

    return {
      currentPlayer: biddingPlayer,
      currentBid: latestBid?.amount || biddingPlayer.base_price,
      currentTeam: currentTeamWithStats,
      bidHistory: [],
      status: 'bidding',
      timer: {
        timeLeft: 30,
        isRunning: false,
        duration: 30
      },
      rtmEnabled: false,
      rtmTeam: null
    };
  } catch (error) {
    console.error('Error restoring auction state:', error);
    return null;
  }
}

export const getAuctionState = (tournamentId: string): AuctionState => {
  const storage = auctionStates.get(tournamentId);
  if (storage) {
    storage.lastAccess = Date.now();
    return storage.state;
  }

  const defaultState: AuctionState = {
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
    rtmTeam: null
  };

  auctionStates.set(tournamentId, {
    state: defaultState,
    lastAccess: Date.now()
  });

  return defaultState;
};

// Async version that restores from DB if needed
export const getAuctionStateAsync = async (tournamentId: string): Promise<AuctionState> => {
  // If already initialized, return current state
  if (initializedTournaments.has(tournamentId)) {
    return getAuctionState(tournamentId);
  }

  // Try to restore from database
  const restoredState = await restoreAuctionStateFromDB(tournamentId);
  if (restoredState) {
    auctionStates.set(tournamentId, {
      state: restoredState,
      lastAccess: Date.now()
    });
  }

  initializedTournaments.add(tournamentId);
  return getAuctionState(tournamentId);
};

export const getChatMessages = (tournamentId: string): ChatMessage[] => {
  const storage = chatMessages.get(tournamentId);
  if (storage) {
    storage.lastAccess = Date.now();
    return storage.messages;
  }

  chatMessages.set(tournamentId, {
    messages: [],
    lastAccess: Date.now()
  });

  return [];
};

export const addChatMessage = (tournamentId: string, message: ChatMessage): void => {
  const storage = chatMessages.get(tournamentId);
  if (storage) {
    storage.messages.push(message);
    storage.lastAccess = Date.now();
    // Keep only last 100 messages
    if (storage.messages.length > 100) {
      storage.messages.shift();
    }
  } else {
    chatMessages.set(tournamentId, {
      messages: [message],
      lastAccess: Date.now()
    });
  }
};

export const updateAuctionState = (tournamentId: string, updates: Partial<AuctionState>): AuctionState => {
  const current = getAuctionState(tournamentId);
  const newState = { ...current, ...updates };
  auctionStates.set(tournamentId, {
    state: newState,
    lastAccess: Date.now()
  });
  return newState;
};

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join tournament room
    socket.on('join:tournament', async (tournamentId: string) => {
      socket.join(`tournament:${tournamentId}`);
      console.log(`Socket ${socket.id} joined tournament:${tournamentId}`);

      // Send current auction state (with DB restoration if needed)
      const state = await getAuctionStateAsync(tournamentId);
      socket.emit('auction:state', state);
    });

    // Join specific view rooms
    socket.on('join:live', async (tournamentId: string) => {
      socket.join(`live:${tournamentId}`);
      const state = await getAuctionStateAsync(tournamentId);
      socket.emit('auction:state', state);
      // Also emit timer state for views that listen separately
      socket.emit('timer:sync', state.timer);
    });

    socket.on('join:summary', (tournamentId: string) => {
      socket.join(`summary:${tournamentId}`);
    });

    socket.on('join:overlay', async (tournamentId: string) => {
      socket.join(`overlay:${tournamentId}`);
      const state = await getAuctionStateAsync(tournamentId);
      socket.emit('auction:state', state);
      // Also emit timer state for views that listen separately
      socket.emit('timer:sync', state.timer);
    });

    // Admin actions - these are handled via REST API and broadcast from there
    // But we can also handle direct socket events for faster updates

    socket.on('auction:newPlayer', async ({ tournamentId, player }) => {
      const state = updateAuctionState(tournamentId, {
        currentPlayer: player,
        currentBid: player.base_price,
        currentTeam: null,
        bidHistory: [],
        status: 'bidding'
      });

      // Broadcast to all rooms
      io.to(`tournament:${tournamentId}`).emit('auction:state', state);
      io.to(`live:${tournamentId}`).emit('auction:state', state);
      io.to(`overlay:${tournamentId}`).emit('auction:state', state);
    });

    socket.on('auction:placeBid', ({ tournamentId, team, amount }) => {
      const state = getAuctionState(tournamentId);

      const newState = updateAuctionState(tournamentId, {
        currentBid: amount,
        currentTeam: team,
        bidHistory: [...state.bidHistory, { teamId: team.id, amount, timestamp: new Date() }]
      });

      io.to(`tournament:${tournamentId}`).emit('auction:state', newState);
      io.to(`live:${tournamentId}`).emit('auction:state', newState);
      io.to(`overlay:${tournamentId}`).emit('auction:state', newState);
    });

    socket.on('auction:incrementBid', ({ tournamentId, increment }) => {
      const state = getAuctionState(tournamentId);
      const newAmount = state.currentBid + increment;

      const newState = updateAuctionState(tournamentId, {
        currentBid: newAmount
      });

      io.to(`tournament:${tournamentId}`).emit('auction:state', newState);
      io.to(`live:${tournamentId}`).emit('auction:state', newState);
      io.to(`overlay:${tournamentId}`).emit('auction:state', newState);
    });

    socket.on('auction:sold', ({ tournamentId }) => {
      const state = updateAuctionState(tournamentId, { status: 'sold' });

      io.to(`tournament:${tournamentId}`).emit('auction:state', state);
      io.to(`live:${tournamentId}`).emit('auction:state', state);
      io.to(`overlay:${tournamentId}`).emit('auction:state', state);
      io.to(`summary:${tournamentId}`).emit('teams:updated');
      io.to(`tournament:${tournamentId}`).emit('stats:updated');
    });

    socket.on('auction:unsold', ({ tournamentId }) => {
      const state = updateAuctionState(tournamentId, { status: 'unsold' });

      io.to(`tournament:${tournamentId}`).emit('auction:state', state);
      io.to(`live:${tournamentId}`).emit('auction:state', state);
      io.to(`overlay:${tournamentId}`).emit('auction:state', state);
    });

    socket.on('auction:reset', ({ tournamentId }) => {
      const state = updateAuctionState(tournamentId, {
        currentPlayer: null,
        currentBid: 0,
        currentTeam: null,
        bidHistory: [],
        status: 'idle'
      });

      io.to(`tournament:${tournamentId}`).emit('auction:state', state);
      io.to(`live:${tournamentId}`).emit('auction:state', state);
      io.to(`overlay:${tournamentId}`).emit('auction:state', state);
    });

    // Team updates broadcast
    socket.on('teams:refresh', ({ tournamentId }) => {
      io.to(`tournament:${tournamentId}`).emit('teams:updated');
      io.to(`live:${tournamentId}`).emit('teams:updated');
      io.to(`summary:${tournamentId}`).emit('teams:updated');
    });

    // Players updates broadcast
    socket.on('players:refresh', ({ tournamentId }) => {
      io.to(`tournament:${tournamentId}`).emit('players:updated');
      io.to(`live:${tournamentId}`).emit('players:updated');
    });

    // Timer handlers
    socket.on('timer:start', ({ tournamentId, timeLeft, duration }) => {
      const state = getAuctionState(tournamentId);
      const newState = updateAuctionState(tournamentId, {
        timer: { timeLeft, isRunning: true, duration }
      });
      io.to(`tournament:${tournamentId}`).emit('timer:sync', newState.timer);
      io.to(`live:${tournamentId}`).emit('timer:sync', newState.timer);
      io.to(`overlay:${tournamentId}`).emit('timer:sync', newState.timer);
    });

    socket.on('timer:pause', ({ tournamentId, timeLeft }) => {
      const state = getAuctionState(tournamentId);
      const newState = updateAuctionState(tournamentId, {
        timer: { ...state.timer, timeLeft, isRunning: false }
      });
      io.to(`tournament:${tournamentId}`).emit('timer:sync', newState.timer);
      io.to(`live:${tournamentId}`).emit('timer:sync', newState.timer);
      io.to(`overlay:${tournamentId}`).emit('timer:sync', newState.timer);
    });

    socket.on('timer:reset', ({ tournamentId, duration }) => {
      const newState = updateAuctionState(tournamentId, {
        timer: { timeLeft: duration, isRunning: false, duration }
      });
      io.to(`tournament:${tournamentId}`).emit('timer:sync', newState.timer);
      io.to(`live:${tournamentId}`).emit('timer:sync', newState.timer);
      io.to(`overlay:${tournamentId}`).emit('timer:sync', newState.timer);
    });

    // Chat handlers
    socket.on('chat:join', ({ tournamentId }) => {
      socket.join(`chat:${tournamentId}`);
      const messages = getChatMessages(tournamentId);
      socket.emit('chat:history', messages);
    });

    socket.on('chat:message', ({ tournamentId, userId, userName, message }) => {
      const chatMsg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tournamentId,
        userId,
        userName,
        message,
        timestamp: new Date(),
        isSystem: false
      };
      addChatMessage(tournamentId, chatMsg);
      io.to(`chat:${tournamentId}`).emit('chat:message', chatMsg);
      io.to(`overlay:${tournamentId}`).emit('chat:message', chatMsg);
    });

    socket.on('chat:system', ({ tournamentId, message }) => {
      const chatMsg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tournamentId,
        userId: 'system',
        userName: 'System',
        message,
        timestamp: new Date(),
        isSystem: true
      };
      addChatMessage(tournamentId, chatMsg);
      io.to(`chat:${tournamentId}`).emit('chat:message', chatMsg);
      io.to(`overlay:${tournamentId}`).emit('chat:message', chatMsg);
    });

    // RTM (Right to Match) handlers
    socket.on('rtm:enable', ({ tournamentId, team }) => {
      const newState = updateAuctionState(tournamentId, {
        rtmEnabled: true,
        rtmTeam: team
      });
      io.to(`tournament:${tournamentId}`).emit('auction:state', newState);
      io.to(`live:${tournamentId}`).emit('auction:state', newState);
      io.to(`overlay:${tournamentId}`).emit('auction:state', newState);
    });

    socket.on('rtm:match', ({ tournamentId }) => {
      // RTM team matches the bid - they win the player
      const state = getAuctionState(tournamentId);
      if (state.rtmTeam) {
        const newState = updateAuctionState(tournamentId, {
          currentTeam: state.rtmTeam,
          rtmEnabled: false,
          rtmTeam: null
        });
        io.to(`tournament:${tournamentId}`).emit('auction:state', newState);
        io.to(`live:${tournamentId}`).emit('auction:state', newState);
        io.to(`overlay:${tournamentId}`).emit('auction:state', newState);
      }
    });

    socket.on('rtm:decline', ({ tournamentId }) => {
      // RTM team declines - original winning team keeps player
      const newState = updateAuctionState(tournamentId, {
        rtmEnabled: false,
        rtmTeam: null
      });
      io.to(`tournament:${tournamentId}`).emit('auction:state', newState);
      io.to(`live:${tournamentId}`).emit('auction:state', newState);
      io.to(`overlay:${tournamentId}`).emit('auction:state', newState);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
