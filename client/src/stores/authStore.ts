import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Tournament } from '../types';
import { api as apiClient } from '../utils/api';
import { socketClient } from '../socket/client';

interface AuthState {
  user: User | null;
  tournament: Tournament | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tournament: Tournament | null, token: string) => void;
  updateTournament: (tournament: Tournament | null) => void;
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
        // Update API client token and reconnect socket with new auth
        apiClient.setToken(token);
        socketClient.reconnectWithNewToken();
        set({
          user,
          tournament,
          token,
          isAuthenticated: true,
        });
      },

      updateTournament: (newTournament) => {
        // Merge with existing tournament data to prevent losing fields
        // Only update fields that are explicitly set (not null/undefined)
        set((state) => {
          if (!newTournament) return { tournament: null };

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

      logout: () => {
        // Clear API cache and disconnect socket on logout
        apiClient.setToken(null);
        socketClient.disconnect();
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
