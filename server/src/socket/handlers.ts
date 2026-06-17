import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import supabase from '../config/supabase';
import { z } from 'zod';

// Socket event validation schemas
const uuidSchema = z.string().uuid();
const tournamentIdSchema = z.string().uuid();

const newPlayerSchema = z.object({
  tournamentId: tournamentIdSchema,
  player: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    base_price: z.number().nonnegative()
  }).passthrough() // Allow additional fields
});

const placeBidSchema = z.object({
  tournamentId: tournamentIdSchema,
  team: z.object({
    id: z.string().uuid(),
    name: z.string().min(1)
  }).passthrough(),
  amount: z.number().positive()
});

const timerSchema = z.object({
  tournamentId: tournamentIdSchema,
  timeLeft: z.number().nonnegative().optional(),
  duration: z.number().positive().optional()
});

const chatMessageSchema = z.object({
  tournamentId: tournamentIdSchema,
  userId: z.string().min(1),
  userName: z.string().min(1),
  message: z.string().min(1).max(500)
});

const overlaySettingsSchema = z.object({
  tournamentId: tournamentIdSchema,
  settings: z.record(z.unknown())
});

// Helper to validate socket events and emit error if invalid
function validateSocketEvent<T>(socket: Socket, schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    socket.emit('error', { message: 'Invalid data format', details: result.error.format() });
    return null;
  }
  return result.data;
}

// Generate secure unique ID
function generateSecureId(): string {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

// Memory bounds constants (configurable via environment variables)
const MAX_AUCTION_STATES = parseInt(process.env.MAX_AUCTION_STATES || '50', 10);
const MAX_BID_HISTORY = parseInt(process.env.MAX_BID_HISTORY || '100', 10);
const MAX_CHAT_MESSAGES = parseInt(process.env.MAX_CHAT_MESSAGES || '100', 10);

// Rate limiting constants (configurable via environment variables)
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000', 10); // 1 second default
const RATE_LIMIT_MAX_EVENTS = parseInt(process.env.RATE_LIMIT_MAX_EVENTS || '10', 10); // 10 events/sec default

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
  accentColor?: string; // Current admin theme accent color for overlay sync
  // Auction lifecycle tracking
  auctionStarted?: boolean; // True once first player is ever called
  lastPlayer?: any | null; // Last player that was sold/unsold
  lastStatus?: 'sold' | 'unsold' | null; // Status of last player
  lastTeam?: any | null; // Team that won last player (if sold)
  lastPrice?: number; // Final price of last player
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

// Clear all in-memory state for a tournament (call on delete)
export function clearTournamentState(tournamentId: string): void {
  auctionStates.delete(tournamentId);
  initializedTournaments.delete(tournamentId);
  chatMessages.delete(tournamentId);
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

// Cleanup stale entries more aggressively to prevent memory buildup
// Configurable via environment variables
const STATE_TTL_MS = parseInt(process.env.STATE_TTL_MS || String(30 * 60 * 1000), 10); // 30 minutes default
const CLEANUP_INTERVAL_MS = parseInt(process.env.CLEANUP_INTERVAL_MS || String(10 * 60 * 1000), 10); // 10 minutes default

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
    rtmTeam: null,
    accentColor: '#22c55e', // Default green, updated by admin
    auctionStarted: false,
    lastPlayer: null,
    lastStatus: null,
    lastTeam: null,
    lastPrice: 0
  };

  auctionStates.set(tournamentId, {
    state: defaultState,
    lastAccess: Date.now()
  });

  return defaultState;
};

// Async version that restores from DB if needed
export const getAuctionStateAsync = async (tournamentId: string): Promise<AuctionState> => {
  // If already initialized, validate current state against DB
  if (initializedTournaments.has(tournamentId)) {
    const currentState = getAuctionState(tournamentId);

    // If there's a current player in memory with 'bidding' status,
    // verify they're still actually in bidding state in the database
    if (currentState.currentPlayer && currentState.status === 'bidding') {
      const { data: dbPlayer, error } = await supabase
        .from('players')
        .select('status')
        .eq('id', currentState.currentPlayer.id)
        .single();

      if (error || !dbPlayer) {
        // Player doesn't exist, reset to idle
        return updateAuctionState(tournamentId, {
          currentPlayer: null,
          currentBid: 0,
          currentTeam: null,
          bidHistory: [],
          status: 'idle'
        });
      }

      if (dbPlayer.status !== 'bidding') {
        // Player was already sold/unsold, reset to idle
        // This handles stale state from previous sessions (e.g., yesterday's auction)
        return updateAuctionState(tournamentId, {
          currentPlayer: null,
          currentBid: 0,
          currentTeam: null,
          bidHistory: [],
          status: 'idle'
        });
      }
    }

    return currentState;
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

    // Join tournament room (admin users must own the tournament)
    socket.on('join:tournament', async (tournamentId: unknown) => {
      // Validate tournament ID is a valid UUID
      const validatedId = uuidSchema.safeParse(tournamentId);
      if (!validatedId.success) {
        socket.emit('error', { message: 'Invalid tournament ID' });
        return;
      }
      const validTournamentId = validatedId.data;

      // For admin users, verify tournament ownership
      if (socket.isAdmin && socket.userId) {
        const { data: tournament, error } = await supabase
          .from('tournaments')
          .select('owner_id')
          .eq('id', validTournamentId)
          .single();

        if (error || !tournament) {
          socket.emit('error', { message: 'Tournament not found' });
          return;
        }

        if (tournament.owner_id !== socket.userId) {
          socket.emit('error', { message: 'Not authorized to access this tournament' });
          return;
        }
      }

      socket.join(`tournament:${validTournamentId}`);

      // Send current auction state (with DB restoration if needed)
      const state = await getAuctionStateAsync(validTournamentId);
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

    socket.on('auction:newPlayer', async (data: unknown) => {
      const validated = validateSocketEvent(socket, newPlayerSchema, data);
      if (!validated) return;

      const { tournamentId, player } = validated;
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const state = updateAuctionState(tournamentId, {
            currentPlayer: player,
            currentBid: player.base_price,
            currentTeam: null,
            bidHistory: [],
            status: 'bidding',
            auctionStarted: true // Mark auction as started
          });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', state);
        });
      });
    });

    socket.on('auction:placeBid', (data: unknown) => {
      const validated = validateSocketEvent(socket, placeBidSchema, data);
      if (!validated) return;

      const { tournamentId, team, amount } = validated;
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
          const currentState = getAuctionState(tournamentId);
          const state = updateAuctionState(tournamentId, {
            status: 'sold',
            // Save last player info for resume functionality
            lastPlayer: currentState.currentPlayer,
            lastStatus: 'sold',
            lastTeam: currentState.currentTeam,
            lastPrice: currentState.currentBid
          });
          broadcastToAuctionRooms(io, tournamentId, 'auction:state', state);
          io.to(`summary:${tournamentId}`).emit('teams:updated');
          io.to(`tournament:${tournamentId}`).emit('stats:updated');
        });
      });
    });

    socket.on('auction:unsold', ({ tournamentId }) => {
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          const currentState = getAuctionState(tournamentId);
          const state = updateAuctionState(tournamentId, {
            status: 'unsold',
            // Save last player info for resume functionality
            lastPlayer: currentState.currentPlayer,
            lastStatus: 'unsold',
            lastTeam: null,
            lastPrice: currentState.currentBid
          });
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
    socket.on('timer:start', (data: unknown) => {
      const validated = validateSocketEvent(socket, timerSchema, data);
      if (!validated || validated.timeLeft === undefined || validated.duration === undefined) return;

      const { tournamentId, timeLeft, duration } = validated;
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

    socket.on('chat:message', (data: unknown) => {
      const validated = validateSocketEvent(socket, chatMessageSchema, data);
      if (!validated) return;

      const { tournamentId, userId, userName, message } = validated;
      withRateLimit(socket, () => {
        const chatMsg: ChatMessage = {
          id: generateSecureId(),
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
            id: generateSecureId(),
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

    // Overlay settings update (admin only) - broadcasts to overlay views
    socket.on('overlay:settingsUpdate', (data: unknown) => {
      const validated = validateSocketEvent(socket, overlaySettingsSchema, data);
      if (!validated) return;

      const { tournamentId, settings } = validated;
      withRateLimit(socket, () => {
        requireAdmin(socket, () => {
          // Store accent color in auction state so new overlays get it
          if (settings && typeof settings === 'object' && 'accentColor' in settings) {
            const state = getAuctionState(tournamentId);
            state.accentColor = settings.accentColor as string;
          }
          // Broadcast only to overlay views for real-time sync
          io.to(`overlay:${tournamentId}`).emit('overlay:settingsUpdated', settings);
        });
      });
    });

    // =====================================================
    // ADMIN PANEL SOCKET HANDLERS
    // =====================================================

    // Join admin dashboard room for real-time updates
    socket.on('admin:join', () => {
      withRateLimit(socket, () => {
        // Admin room requires authentication (checked via isAdmin flag from token)
        if (socket.isAdmin) {
          socket.join('admin:dashboard');
        } else {
          socket.emit('error', { message: 'Admin access required' });
        }
      });
    });

    // Admin force stop auction (real-time broadcast)
    socket.on('admin:auction:force-stop', async ({ tournamentId }) => {
      withRateLimit(socket, () => {
        if (!socket.isAdmin) {
          socket.emit('error', { message: 'Admin access required' });
          return;
        }

        // Reset auction state
        const state = updateAuctionState(tournamentId, {
          currentPlayer: null,
          currentBid: 0,
          currentTeam: null,
          bidHistory: [],
          status: 'idle',
          timer: { timeLeft: 30, isRunning: false, duration: 30 }
        });

        // Broadcast to all rooms
        broadcastToAuctionRooms(io, tournamentId, 'auction:state', state);
        io.to(`tournament:${tournamentId}`).emit('auction:force-stopped', { by: 'admin' });
      });
    });

    // Broadcast stats updates to admin dashboard
    socket.on('admin:request-stats', () => {
      withRateLimit(socket, () => {
        if (!socket.isAdmin) {
          socket.emit('error', { message: 'Admin access required' });
          return;
        }
        // This would be enhanced to fetch real-time stats
        // For now, admins poll via REST API
        socket.emit('admin:stats:ack');
      });
    });

    socket.on('disconnect', () => {
      // Cleanup rate limit entry
      cleanupRateLimit(socket.id);
    });
  });
};
