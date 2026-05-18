import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase';

// Memory bounds constants
const MAX_AUCTION_STATES = 50;
const MAX_BID_HISTORY = 100;
const MAX_CHAT_MESSAGES = 100;

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const RATE_LIMIT_MAX_EVENTS = 10; // 10 events per second

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

// Extended socket interface with auth info
interface AuthenticatedSocket extends Socket {
  isAdmin?: boolean;
  userId?: string;
  tournamentId?: string;
}

// Rate limiting storage
interface RateLimitEntry {
  count: number;
  windowStart: number;
}
const rateLimitMap: Map<string, RateLimitEntry> = new Map();

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

// Store auction states per tournament with timestamps for cleanup (LRU cache)
interface AuctionStateStorage {
  state: AuctionState;
  lastAccess: number;
}
const auctionStates: Map<string, AuctionStateStorage> = new Map();

// Track which tournaments have been initialized from DB
const initializedTournaments: Set<string> = new Set();

// LRU eviction for auction states when limit exceeded
function enforceAuctionStateBounds(): void {
  if (auctionStates.size <= MAX_AUCTION_STATES) return;

  // Sort by lastAccess and remove oldest entries
  const entries = Array.from(auctionStates.entries())
    .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

  const toRemove = entries.slice(0, entries.length - MAX_AUCTION_STATES);
  for (const [tournamentId] of toRemove) {
    auctionStates.delete(tournamentId);
    initializedTournaments.delete(tournamentId);
    console.log(`LRU evicted auction state for tournament: ${tournamentId}`);
  }
}

// Rate limiter check - returns true if request should be allowed
function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(socketId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(socketId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_EVENTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Cleanup rate limit entry for disconnected socket
function cleanupRateLimit(socketId: string): void {
  rateLimitMap.delete(socketId);
}

// Socket authentication middleware
function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token;

  // Allow connection without token (for public viewers)
  if (!token) {
    socket.isAdmin = false;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      tournamentId: string;
    };
    socket.isAdmin = true;
    socket.userId = decoded.userId;
    socket.tournamentId = decoded.tournamentId;
    next();
  } catch (error) {
    // Invalid token - allow connection but not as admin
    socket.isAdmin = false;
    next();
  }
}

// Check if socket is authorized for admin actions
function requireAdmin(socket: AuthenticatedSocket, callback: () => void, errorCallback?: () => void): void {
  if (socket.isAdmin) {
    callback();
  } else {
    socket.emit('error', { message: 'Unauthorized: Admin access required' });
    if (errorCallback) errorCallback();
  }
}

// Rate-limited event wrapper
function withRateLimit(socket: AuthenticatedSocket, callback: () => void): void {
  if (!checkRateLimit(socket.id)) {
    socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
    return;
  }
  callback();
}

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

  // Enforce bid history bounds - keep only newest entries
  if (newState.bidHistory.length > MAX_BID_HISTORY) {
    newState.bidHistory = newState.bidHistory.slice(-MAX_BID_HISTORY);
  }

  auctionStates.set(tournamentId, {
    state: newState,
    lastAccess: Date.now()
  });

  // Enforce auction state bounds (LRU eviction)
  enforceAuctionStateBounds();

  return newState;
};

// Helper to broadcast to auction-related rooms (reduces code duplication)
const broadcastToAuctionRooms = (io: Server, tournamentId: string, event: string, data: any) => {
  const rooms = [`tournament:${tournamentId}`, `live:${tournamentId}`, `overlay:${tournamentId}`];
  rooms.forEach(room => io.to(room).emit(event, data));
};

// Helper to broadcast to all view rooms including summary
const broadcastToAllRooms = (io: Server, tournamentId: string, event: string, data?: any) => {
  const rooms = [`tournament:${tournamentId}`, `live:${tournamentId}`, `overlay:${tournamentId}`, `summary:${tournamentId}`];
  rooms.forEach(room => io.to(room).emit(event, data));
};

export const setupSocketHandlers = (io: Server) => {
  // Add authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.id}, isAdmin: ${socket.isAdmin}`);

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
    // All admin actions require authentication and are rate limited

    socket.on('auction:newPlayer', async ({ tournamentId, player }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const state = updateAuctionState(tournamentId, {
            currentPlayer: player,
            currentBid: player.base_price,
            currentTeam: null,
            bidHistory: [],
            status: 'bidding'
          });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', state);
        });
      });
    });

    socket.on('auction:placeBid', ({ tournamentId, team, amount }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const state = getAuctionState(tournamentId);
          const newState = updateAuctionState(tournamentId, {
            currentBid: amount,
            currentTeam: team,
            bidHistory: [...state.bidHistory, { teamId: team.id, amount, timestamp: new Date() }]
          });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', newState);
        });
      });
    });

    socket.on('auction:incrementBid', ({ tournamentId, increment }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const state = getAuctionState(tournamentId);
          const newAmount = state.currentBid + increment;
          const newState = updateAuctionState(tournamentId, {
            currentBid: newAmount
          });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', newState);
        });
      });
    });

    socket.on('auction:sold', ({ tournamentId }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const state = updateAuctionState(tournamentId, { status: 'sold' });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', state);
          io.to(`summary:${tournamentId}`).emit('teams:updated');
          io.to(`tournament:${tournamentId}`).emit('stats:updated');
        });
      });
    });

    socket.on('auction:unsold', ({ tournamentId }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const state = updateAuctionState(tournamentId, { status: 'unsold' });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', state);
        });
      });
    });

    socket.on('auction:reset', ({ tournamentId }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const state = updateAuctionState(tournamentId, {
            currentPlayer: null,
            currentBid: 0,
            currentTeam: null,
            bidHistory: [],
            status: 'idle'
          });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', state);
        });
      });
    });

    // Team updates broadcast (admin only)
    socket.on('teams:refresh', ({ tournamentId }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          broadcastToAllRooms(io, tournamentId, 'teams:updated');
        });
      });
    });

    // Players updates broadcast (admin only)
    socket.on('players:refresh', ({ tournamentId }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          io.to(`tournament:${tournamentId}`).emit('players:updated');
          io.to(`live:${tournamentId}`).emit('players:updated');
        });
      });
    });

    // Timer handlers (admin only)
    socket.on('timer:start', ({ tournamentId, timeLeft, duration }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const newState = updateAuctionState(tournamentId, {
            timer: { timeLeft, isRunning: true, duration }
          });
          broadcastToAuctionRooms(io, tournamentId, 'timer:sync', newState.timer);
        });
      });
    });

    socket.on('timer:pause', ({ tournamentId, timeLeft }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const state = getAuctionState(tournamentId);
          const newState = updateAuctionState(tournamentId, {
            timer: { ...state.timer, timeLeft, isRunning: false }
          });
          broadcastToAuctionRooms(io, tournamentId, 'timer:sync', newState.timer);
        });
      });
    });

    socket.on('timer:reset', ({ tournamentId, duration }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const newState = updateAuctionState(tournamentId, {
            timer: { timeLeft: duration, isRunning: false, duration }
          });
          broadcastToAuctionRooms(io, tournamentId, 'timer:sync', newState.timer);
        });
      });
    });

    // Chat handlers (rate limited but public for joining, admin for system messages)
    socket.on('chat:join', ({ tournamentId }) => {
      withRateLimit(socket, () => {
        socket.join(`chat:${tournamentId}`);
        const messages = getChatMessages(tournamentId);
        socket.emit('chat:history', messages);
      });
    });

    socket.on('chat:message', ({ tournamentId, userId, userName, message }) => {
      withRateLimit(socket, () => {
        const chatMsg: ChatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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
    });

    socket.on('chat:system', ({ tournamentId, message }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const chatMsg: ChatMessage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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
      });
    });

    // RTM (Right to Match) handlers (admin only)
    socket.on('rtm:enable', ({ tournamentId, team }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const newState = updateAuctionState(tournamentId, {
            rtmEnabled: true,
            rtmTeam: team
          });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', newState);
        });
      });
    });

    socket.on('rtm:match', ({ tournamentId }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          // RTM team matches the bid - they win the player
          const state = getAuctionState(tournamentId);
          if (state.rtmTeam) {
            const newState = updateAuctionState(tournamentId, {
              currentTeam: state.rtmTeam,
              rtmEnabled: false,
              rtmTeam: null
            });
            broadcastToAuctionRooms(io, tournamentId, 'auction:state', newState);
          }
        });
      });
    });

    socket.on('rtm:decline', ({ tournamentId }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          // RTM team declines - original winning team keeps player
          const newState = updateAuctionState(tournamentId, {
            rtmEnabled: false,
            rtmTeam: null
          });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', newState);
        });
      });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      // Cleanup rate limit entry
      cleanupRateLimit(socket.id);
    });
  });
};
