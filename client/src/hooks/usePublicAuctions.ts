import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { PublicTournament } from '../types';
import { socketClient } from '../socket/client';

interface PublicAuctionsState {
  live: PublicTournament[];
  upcoming: PublicTournament[];
  completed: PublicTournament[];
  loading: boolean;
  error: string | null;
}

export function usePublicAuctions() {
  const [state, setState] = useState<PublicAuctionsState>({
    live: [],
    upcoming: [],
    completed: [],
    loading: true,
    error: null,
  });

  const fetchPublicAuctions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await api.getPublicTournaments();
      setState({
        live: data.live || [],
        upcoming: data.upcoming || [],
        completed: data.completed || [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load auctions',
      }));
    }
  }, []);

  useEffect(() => {
    fetchPublicAuctions();

    // Join public room for real-time updates
    socketClient.joinPublicRoom();
    socketClient.on('public:auction-update', fetchPublicAuctions);

    return () => {
      socketClient.off('public:auction-update', fetchPublicAuctions);
    };
  }, [fetchPublicAuctions]);

  // Refresh function for manual refresh
  const refresh = useCallback(() => {
    fetchPublicAuctions();
  }, [fetchPublicAuctions]);

  return {
    ...state,
    refresh,
  };
}
