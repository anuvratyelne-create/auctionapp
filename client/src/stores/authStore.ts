import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Tournament } from '../types';

interface AuthState {
  user: User | null;
  tournament: Tournament | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tournament: Tournament, token: string) => void;
  updateTournament: (tournament: Tournament) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tournament: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, tournament, token) => {
        set({
          user,
          tournament,
          token,
          isAuthenticated: true,
        });
      },

      updateTournament: (tournament) => {
        set({ tournament });
      },

      logout: () => {
        set({
          user: null,
          tournament: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auction-auth',
    }
  )
);
