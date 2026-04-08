import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

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

// Store chat messages per tournament
const chatMessages: Map<string, ChatMessage[]> = new Map();

// Store auction states per tournament
const auctionStates: Map<string, AuctionState> = new Map();

export const getAuctionState = (tournamentId: string): AuctionState => {
  if (!auctionStates.has(tournamentId)) {
    auctionStates.set(tournamentId, {
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
    });
  }
  return auctionStates.get(tournamentId)!;
};

export const getChatMessages = (tournamentId: string): ChatMessage[] => {
  if (!chatMessages.has(tournamentId)) {
    chatMessages.set(tournamentId, []);
  }
  return chatMessages.get(tournamentId)!;
};

export const addChatMessage = (tournamentId: string, message: ChatMessage): void => {
  const messages = getChatMessages(tournamentId);
  messages.push(message);
  // Keep only last 100 messages
  if (messages.length > 100) {
    messages.shift();
  }
};

export const updateAuctionState = (tournamentId: string, updates: Partial<AuctionState>) => {
  const current = getAuctionState(tournamentId);
  auctionStates.set(tournamentId, { ...current, ...updates });
  return auctionStates.get(tournamentId)!;
};

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join tournament room
    socket.on('join:tournament', (tournamentId: string) => {
      socket.join(`tournament:${tournamentId}`);
      console.log(`Socket ${socket.id} joined tournament:${tournamentId}`);

      // Send current auction state
      const state = getAuctionState(tournamentId);
      socket.emit('auction:state', state);
    });

    // Join specific view rooms
    socket.on('join:live', (tournamentId: string) => {
      socket.join(`live:${tournamentId}`);
      const state = getAuctionState(tournamentId);
      socket.emit('auction:state', state);
      // Also emit timer state for views that listen separately
      socket.emit('timer:sync', state.timer);
    });

    socket.on('join:summary', (tournamentId: string) => {
      socket.join(`summary:${tournamentId}`);
    });

    socket.on('join:overlay', (tournamentId: string) => {
      socket.join(`overlay:${tournamentId}`);
      const state = getAuctionState(tournamentId);
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
