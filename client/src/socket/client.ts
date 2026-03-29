import { io, Socket } from 'socket.io-client';
import { AuctionState, TimerState, ChatMessage, DraftPick } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

class SocketClient {
  private socket: Socket | null = null;
  private tournamentId: string | null = null;

  connect(tournamentId: string) {
    if (this.socket?.connected && this.tournamentId === tournamentId) {
      return;
    }

    this.disconnect();
    this.tournamentId = tournamentId;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.socket?.emit('join:tournament', tournamentId);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  joinLiveView(tournamentId: string) {
    if (!this.socket?.connected) {
      this.connect(tournamentId);
    }
    this.socket?.emit('join:live', tournamentId);
  }

  joinSummaryView(tournamentId: string) {
    if (!this.socket?.connected) {
      this.connect(tournamentId);
    }
    this.socket?.emit('join:summary', tournamentId);
  }

  joinOverlayView(tournamentId: string) {
    if (!this.socket?.connected) {
      this.connect(tournamentId);
    }
    this.socket?.emit('join:overlay', tournamentId);
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
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.tournamentId = null;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketClient = new SocketClient();
