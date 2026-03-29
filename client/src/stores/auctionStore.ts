import { create } from 'zustand';
import { AuctionState, Player, Team } from '../types';

interface AuctionStore extends AuctionState {
  selectedCategoryId: string | null;
  setAuctionState: (state: Partial<AuctionState>) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setCurrentBid: (amount: number) => void;
  setCurrentTeam: (team: Team | null) => void;
  addBidToHistory: (teamId: string, amount: number) => void;
  setStatus: (status: AuctionState['status']) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  reset: () => void;
}

const initialState: AuctionState = {
  currentPlayer: null,
  currentBid: 0,
  currentTeam: null,
  bidHistory: [],
  status: 'idle',
};

export const useAuctionStore = create<AuctionStore>((set) => ({
  ...initialState,
  selectedCategoryId: null,

  setAuctionState: (state) => {
    set((prev) => ({ ...prev, ...state }));
  },

  setCurrentPlayer: (player) => {
    set({
      currentPlayer: player,
      currentBid: player?.base_price || 0,
      currentTeam: null,
      bidHistory: [],
      status: player ? 'bidding' : 'idle',
    });
  },

  setCurrentBid: (amount) => {
    set({ currentBid: amount });
  },

  setCurrentTeam: (team) => {
    set({ currentTeam: team });
  },

  addBidToHistory: (teamId, amount) => {
    set((state) => ({
      bidHistory: [
        ...state.bidHistory,
        { teamId, amount, timestamp: new Date() },
      ],
    }));
  },

  setStatus: (status) => {
    set({ status });
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId });
  },

  reset: () => {
    set(initialState);
  },
}));
