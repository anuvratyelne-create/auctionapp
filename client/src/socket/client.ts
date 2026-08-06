import { io, Socket } from 'socket.io-client';
import { AuctionState, TimerState, ChatMessage, DraftPick } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

type ViewType = 'tournament' | 'live' | 'summary' | 'overlay';
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
type ConnectionStatusCallback = (status: ConnectionStatus) => void;

class SocketClient {
  private socket: Socket | null = null;
  private tournamentId: string | null = null;
  private pendingView: ViewType | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();

  private setConnectionStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.statusCallbacks.forEach(cb => cb(status));
  }

  // Subscribe to connection status changes
  onConnectionStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  connect(tournamentId: string, viewType: ViewType = 'tournament') {
    if (this.socket?.connected && this.tournamentId === tournamentId) {
      // Already connected to this tournament, just join the view
      this.joinView(viewType, tournamentId);
      return;
    }

    this.disconnect();
    this.tournamentId = tournamentId;
    this.pendingView = viewType;
    this.setConnectionStatus('connecting');

    // Get auth token from zustand persisted state
    let token: string | null = null;
    try {
      const authData = localStorage.getItem('auction-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        token = parsed?.state?.token || null;
      }
    } catch (e) {
      console.warn('[SocketClient] Failed to parse auth token:', e);
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: token ? { token } : undefined,
    });

    this.socket.on('connect', () => {
      this.setConnectionStatus('connected');
      // Join the tournament room first
      this.socket?.emit('join:tournament', tournamentId);
      // Then join the specific view room if needed
      if (this.pendingView && this.pendingView !== 'tournament') {
        this.joinView(this.pendingView, tournamentId);
      }
      this.pendingView = null;
    });

    this.socket.on('disconnect', () => {
      this.setConnectionStatus('disconnected');
    });

    this.socket.on('connect_error', () => {
      this.setConnectionStatus('error');
    });

    this.socket.on('error', (error: { message: string }) => {
      console.warn('Socket error:', error.message);
    });

    this.socket.on('server:shutdown', () => {
      // Server is shutting down, will reconnect automatically
    });
  }

  private joinView(viewType: ViewType, tournamentId: string) {
    if (!this.socket) return;

    switch (viewType) {
      case 'live':
        this.socket.emit('join:live', tournamentId);
        break;
      case 'summary':
        this.socket.emit('join:summary', tournamentId);
        break;
      case 'overlay':
        this.socket.emit('join:overlay', tournamentId);
        break;
    }
  }

  joinLiveView(tournamentId: string) {
    if (this.socket?.connected) {
      this.joinView('live', tournamentId);
    } else {
      this.connect(tournamentId, 'live');
    }
  }

  joinSummaryView(tournamentId: string) {
    if (this.socket?.connected) {
      this.joinView('summary', tournamentId);
    } else {
      this.connect(tournamentId, 'summary');
    }
  }

  joinOverlayView(tournamentId: string) {
    if (this.socket?.connected) {
      this.joinView('overlay', tournamentId);
    } else {
      this.connect(tournamentId, 'overlay');
    }
  }

  // Join public room for landing page (no auth, no tournament required)
  joinPublicRoom() {
    if (!this.socket) {
      // Create a socket connection without tournament context
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        this.setConnectionStatus('connected');
        this.socket?.emit('join:public');
      });

      this.socket.on('disconnect', () => {
        this.setConnectionStatus('disconnected');
      });

      this.socket.on('connect_error', () => {
        this.setConnectionStatus('error');
      });
    } else if (this.socket.connected) {
      this.socket.emit('join:public');
    }
  }

  onAuctionState(callback: (state: AuctionState) => void) {
    this.socket?.on('auction:state', callback);
  }

  onTeamsUpdated(callback: () => void) {
    this.socket?.on('teams:updated', callback);
  }

  onPlayersUpdated(callback: () => void) {
    this.socket?.on('players:updated', callback);
  }

  onStatsUpdated(callback: () => void) {
    this.socket?.on('stats:updated', callback);
  }

  emitNewPlayer(tournamentId: string, player: any) {
    this.socket?.emit('auction:newPlayer', { tournamentId, player });
  }

  emitPlaceBid(tournamentId: string, team: any, amount: number) {
    this.socket?.emit('auction:placeBid', { tournamentId, team, amount });
  }

  emitIncrementBid(tournamentId: string, increment: number) {
    this.socket?.emit('auction:incrementBid', { tournamentId, increment });
  }

  emitSold(tournamentId: string) {
    this.socket?.emit('auction:sold', { tournamentId });
  }

  emitUnsold(tournamentId: string) {
    this.socket?.emit('auction:unsold', { tournamentId });
  }

  emitReset(tournamentId: string) {
    this.socket?.emit('auction:reset', { tournamentId });
  }

  emitTeamsRefresh(tournamentId: string) {
    this.socket?.emit('teams:refresh', { tournamentId });
  }

  emitPlayersRefresh(tournamentId: string) {
    this.socket?.emit('players:refresh', { tournamentId });
  }

  // Timer methods
  onTimerSync(callback: (timer: TimerState) => void) {
    this.socket?.on('timer:sync', callback);
  }

  emitTimerStart(tournamentId: string, timeLeft: number, duration: number) {
    this.socket?.emit('timer:start', { tournamentId, timeLeft, duration });
  }

  emitTimerPause(tournamentId: string, timeLeft: number) {
    this.socket?.emit('timer:pause', { tournamentId, timeLeft });
  }

  emitTimerReset(tournamentId: string, duration: number) {
    this.socket?.emit('timer:reset', { tournamentId, duration });
  }

  // Chat methods
  joinChat(tournamentId: string) {
    this.socket?.emit('chat:join', { tournamentId });
  }

  onChatHistory(callback: (messages: ChatMessage[]) => void) {
    this.socket?.on('chat:history', callback);
  }

  onChatMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on('chat:message', callback);
  }

  emitChatMessage(tournamentId: string, userId: string, userName: string, message: string) {
    this.socket?.emit('chat:message', { tournamentId, userId, userName, message });
  }

  emitSystemMessage(tournamentId: string, message: string) {
    this.socket?.emit('chat:system', { tournamentId, message });
  }

  // RTM methods
  emitRTMEnable(tournamentId: string, team: any) {
    this.socket?.emit('rtm:enable', { tournamentId, team });
  }

  emitRTMMatch(tournamentId: string) {
    this.socket?.emit('rtm:match', { tournamentId });
  }

  emitRTMDecline(tournamentId: string) {
    this.socket?.emit('rtm:decline', { tournamentId });
  }

  // Draft methods
  emitDraftStart(tournamentId: string, state: any) {
    this.socket?.emit('draft:start', { tournamentId, state });
  }

  emitDraftPause(tournamentId: string, isPaused: boolean) {
    this.socket?.emit('draft:pause', { tournamentId, isPaused });
  }

  emitDraftPick(tournamentId: string, pick: DraftPick) {
    this.socket?.emit('draft:pick', { tournamentId, pick });
  }

  emitDraftReset(tournamentId: string) {
    this.socket?.emit('draft:reset', { tournamentId });
  }

  onDraftUpdate(callback: (state: any) => void) {
    this.socket?.on('draft:update', callback);
  }

  // Round methods
  emitRoundAdd(tournamentId: string, round: any) {
    this.socket?.emit('rounds:add', { tournamentId, round });
  }

  emitRoundStart(tournamentId: string, roundId: string) {
    this.socket?.emit('rounds:start', { tournamentId, roundId });
  }

  emitRoundComplete(tournamentId: string, roundId: string) {
    this.socket?.emit('rounds:complete', { tournamentId, roundId });
  }

  emitRoundCarryForward(tournamentId: string, fromRoundId: string, toRoundId: string) {
    this.socket?.emit('rounds:carryForward', { tournamentId, fromRoundId, toRoundId });
  }

  onRoundsUpdate(callback: (rounds: any[]) => void) {
    this.socket?.on('rounds:update', callback);
  }

  // Generic event handlers
  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.removeAllListeners(event);
    }
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  // Overlay settings events
  emitOverlaySettingsUpdate(tournamentId: string, settings: any) {
    this.socket?.emit('overlay:settingsUpdate', { tournamentId, settings });
  }

  onOverlaySettingsUpdated(callback: (settings: any) => void) {
    this.socket?.on('overlay:settingsUpdated', callback);
  }

  removeAllListeners() {
    this.socket?.removeAllListeners('auction:state');
    this.socket?.removeAllListeners('teams:updated');
    this.socket?.removeAllListeners('players:updated');
    this.socket?.removeAllListeners('stats:updated');
    this.socket?.removeAllListeners('timer:sync');
    this.socket?.removeAllListeners('chat:history');
    this.socket?.removeAllListeners('chat:message');
    this.socket?.removeAllListeners('draft:update');
    this.socket?.removeAllListeners('rounds:update');
    this.socket?.removeAllListeners('overlay:settingsUpdated');
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.tournamentId = null;
    this.setConnectionStatus('disconnected');
  }

  // Reconnect with fresh auth token (call after login/logout/token change)
  reconnectWithNewToken() {
    const currentTournamentId = this.tournamentId;
    this.disconnect();
    if (currentTournamentId) {
      this.connect(currentTournamentId);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketClient = new SocketClient();
