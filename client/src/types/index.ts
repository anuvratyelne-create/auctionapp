export type SportsType = 'cricket' | 'football' | 'kabaddi' | 'basketball' | 'other';

export interface Tournament {
  id: string;
  name: string;
  logo_url?: string;
  sports_type: SportsType;
  auction_date?: string;
  auction_time?: string;
  total_points: number;
  min_players: number;
  max_players: number;
  bid_increment: number;
  default_base_bid: number;
  share_code: string;
  status: 'setup' | 'live' | 'paused' | 'completed';
  player_display_mode: 'random' | 'sequential';
  owner_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  short_name: string;
  logo_url?: string;
  keyboard_key?: string;
  owner_name?: string;
  owner_photo?: string;
  total_budget: number;
  spent_points: number;
  remaining_budget: number;
  player_count: number;
  reserve_points: number;
  max_bid: number;
  players?: Player[];
}

export interface Category {
  id: string;
  tournament_id: string;
  name: string;
  base_price: number;
  display_order: number;
  total_players: number;
  sold_players: number;
  available_players: number;
  unsold_players: number;
  avg_sold_price: number;
  total_sold_value: number;
}

export type PlayerRole = 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';

export interface Player {
  id: string;
  tournament_id: string;
  category_id: string;
  team_id?: string;
  name: string;
  photo_url?: string;
  jersey_number?: string;
  role?: PlayerRole;
  base_price: number;
  sold_price?: number;
  status: 'available' | 'bidding' | 'sold' | 'unsold';
  stats?: Record<string, any>;
  sequence_num: number;
  categories?: Category;
  teams?: Team;
  is_retained?: boolean;
  retention_price?: number;
}

export interface Bid {
  teamId: string;
  amount: number;
  timestamp: Date;
}

export interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  duration: number;
}

export interface AuctionState {
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  bidHistory: Bid[];
  status: 'idle' | 'bidding' | 'sold' | 'unsold';
  timer?: TimerState;
  rtmEnabled?: boolean;
  rtmTeam?: Team | null;
}

export interface ChatMessage {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
}

export interface DraftPick {
  round: number;
  pick: number;
  teamId: string;
  playerId: string;
  playerName: string;
}

export interface DraftState {
  type: 'snake' | 'standard';
  currentRound: number;
  currentPickIndex: number;
  draftOrder: string[];
  picks: DraftPick[];
  isActive: boolean;
  isPaused: boolean;
}

export interface Round {
  id: string;
  number: number;
  name: string;
  status: 'pending' | 'active' | 'completed';
  playersAvailable: number;
  playersSold: number;
  playersUnsold: number;
  totalValue: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Sponsor {
  id: string;
  tournament_id: string;
  logo_url: string;
  display_order: number;
}

export interface User {
  id: string;
  mobile: string;
}

export interface AuthState {
  user: User | null;
  tournament: Tournament | null;
  token: string | null;
  isAuthenticated: boolean;
}
