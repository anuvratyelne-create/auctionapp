import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Tournament } from '../types';
import { api as apiClient } from '../utils/api';
import { socketClient } from '../socket/client';
import { localCache } from '../utils/localCache';

interface AuthState {
  user: User | null;
  tournament: Tournament | null;
  tournaments: Tournament[]; // All tournaments owned by user
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tournament: Tournament | null, token: string, tournaments?: Tournament[]) => void;
  updateTournament: (tournament: Tournament | null) => void;
  setTournaments: (tournaments: Tournament[]) => void;
  switchTournament: (tournamentId: string) => Promise<boolean>;
  refreshTournament: () => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tournament: null,
      tournaments: [],
      token: null,
      isAuthenticated: false,

      setAuth: (user, tournament, token, tournaments = []) => {
        // Update API client token and reconnect socket with new auth
        apiClient.setToken(token);
        // Set tournament ID for localStorage caching
        apiClient.setTournamentId(tournament?.id || null);
        localCache.setTournamentId(tournament?.id || null);
        socketClient.reconnectWithNewToken();
        set({
          user,
          tournament,
          tournaments,
          token,
          isAuthenticated: true,
        });
      },

      updateTournament: (newTournament) => {
        // Merge with existing tournament data to prevent losing fields
        // Only update fields that are explicitly set (not null/undefined)
        set((state) => {
          if (!newTournament) {
            localCache.setTournamentId(null);
            return { tournament: null };
          }

          // Update cache tournament ID if it changed
          if (newTournament.id && newTournament.id !== state.tournament?.id) {
            localCache.setTournamentId(newTournament.id);
            apiClient.setTournamentId(newTournament.id);
            // Clear caches when switching tournaments
            localCache.clearAll();
          }

          const merged = { ...state.tournament };
          for (const [key, value] of Object.entries(newTournament)) {
            // Only update if value is defined and not null (unless we're explicitly clearing)
            if (value !== undefined) {
              (merged as any)[key] = value;
            }
          }
          return { tournament: merged as Tournament };
        });
      },

      setTournaments: (tournaments) => {
        set({ tournaments });
      },

      switchTournament: async (tournamentId: string) => {
        const state = get();
        if (!state.token) return false;

        try {
          const response = await fetch('/api/auth/switch-tournament', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ tournamentId })
          });

          if (!response.ok) {
            console.error('Failed to switch tournament');
            return false;
          }

          const data = await response.json();

          // Update auth state with new token and tournament
          apiClient.setToken(data.token);
          apiClient.setTournamentId(data.tournament.id);
          localCache.setTournamentId(data.tournament.id);
          localCache.clearAll(); // Clear caches when switching
          socketClient.reconnectWithNewToken();

          set({
            token: data.token,
            tournament: data.tournament
          });

          return true;
        } catch (error) {
          console.error('Error switching tournament:', error);
          return false;
        }
      },

      refreshTournament: async () => {
        const state = get();
        if (!state.token || !state.tournament?.id) return false;

        try {
          // Use the verify endpoint to get fresh tournament data
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${state.token}`
            }
          });

          if (!response.ok) {
            console.error('Failed to refresh tournament');
            return false;
          }

          const data = await response.json();

          if (data.tournament) {
            set({ tournament: data.tournament });
          }
          if (data.tournaments) {
            set({ tournaments: data.tournaments });
          }

          return true;
        } catch (error) {
          console.error('Error refreshing tournament:', error);
          return false;
        }
      },

      logout: () => {
        // Clear API cache, localStorage cache, and disconnect socket on logout
        apiClient.setToken(null);
        apiClient.setTournamentId(null);
        localCache.clearAll();
        socketClient.disconnect();
        set({
          user: null,
          tournament: null,
          tournaments: [],
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
