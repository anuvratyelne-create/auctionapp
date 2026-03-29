import { useEffect } from 'react';
import { socketClient } from '../socket/client';
import { useAuctionStore } from '../stores/auctionStore';
import { useAuthStore } from '../stores/authStore';

export const useSocket = (autoConnect = true) => {
  const { tournament } = useAuthStore();
  const { setAuctionState } = useAuctionStore();

  useEffect(() => {
    if (!autoConnect || !tournament?.id) return;

    socketClient.connect(tournament.id);

    socketClient.onAuctionState((state) => {
      setAuctionState(state);
    });

    return () => {
      socketClient.removeAllListeners();
    };
  }, [tournament?.id, autoConnect, setAuctionState]);

  return socketClient;
};

export const useLiveSocket = (tournamentId: string) => {
  const { setAuctionState } = useAuctionStore();

  useEffect(() => {
    if (!tournamentId) return;

    socketClient.joinLiveView(tournamentId);

    socketClient.onAuctionState((state) => {
      setAuctionState(state);
    });

    return () => {
      socketClient.removeAllListeners();
    };
  }, [tournamentId, setAuctionState]);

  return socketClient;
};
