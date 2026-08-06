import { useState, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { Team, Player } from '../types';
import { getBidIncrement } from '../config/budgetPresets';

interface UseAuctionHandlersProps {
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  status: 'idle' | 'bidding' | 'sold' | 'unsold';
  teams: Team[];
  selectedCategoryId: string | null;
  selectedRoleCategory: string | null;
  setAuctionState: (state: any) => void;
  onShowPlayerEntry?: (player: Player) => void;
  onShowToast?: (message: string, type: 'error' | 'warning' | 'info', team?: Team) => void;
}

interface LastAction {
  player: Player;
  type: 'sold' | 'unsold';
}

export function useAuctionHandlers({
  currentPlayer,
  currentBid,
  currentTeam,
  status,
  teams,
  selectedCategoryId,
  selectedRoleCategory,
  setAuctionState,
  onShowPlayerEntry,
  onShowToast,
}: UseAuctionHandlersProps) {
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [showFortuneWheel, setShowFortuneWheel] = useState(false);
  const timerResetKey = useRef(0);

  const handleNewPlayer = useCallback(async () => {
    setLoading(true);
    try {
      const player = await api.getNextPlayer(
        selectedCategoryId || undefined,
        selectedRoleCategory || undefined
      ) as Player;
      timerResetKey.current += 1;
      if (player) {
        onShowPlayerEntry?.(player);
        setAuctionState({
          currentPlayer: player,
          currentBid: player.base_price,
          currentTeam: null,
          bidHistory: [],
          status: 'bidding'
        });
      }
    } catch (error: any) {
      const hasFilter = selectedCategoryId || selectedRoleCategory;
      const defaultMsg = hasFilter
        ? 'No players available in this category/role. Try clearing the filter.'
        : 'No available players';
      alert(error.message || defaultMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, selectedRoleCategory, setAuctionState, onShowPlayerEntry]);

  const handleOpenFortuneWheel = useCallback(async () => {
    try {
      const players = await api.getPlayers(
        'available',
        selectedCategoryId || undefined,
        selectedRoleCategory || undefined
      ) as Player[];
      if (!players || players.length === 0) {
        const hasFilter = selectedCategoryId || selectedRoleCategory;
        alert(hasFilter
          ? 'No players available in this category/role for the Fortune Wheel. Try clearing the filter.'
          : 'No available players for the Fortune Wheel');
        return;
      }
      setAvailablePlayers(players);
      setShowFortuneWheel(true);
    } catch (error) {
      console.error('Failed to fetch players:', error);
      alert('Failed to load players for Fortune Wheel');
    }
  }, [selectedCategoryId, selectedRoleCategory]);

  const handleFortuneWheelSelect = useCallback(async (player: Player) => {
    setShowFortuneWheel(false);
    timerResetKey.current += 1;
    try {
      const updatedPlayer = await api.getPlayerForAuction(player.id) as Player;
      onShowPlayerEntry?.(updatedPlayer);
      setAuctionState({
        currentPlayer: updatedPlayer,
        currentBid: updatedPlayer.base_price,
        currentTeam: null,
        bidHistory: [],
        status: 'bidding'
      });
    } catch (error) {
      console.error('Failed to start bidding:', error);
      alert('Failed to start bidding for this player');
    }
  }, [setAuctionState, onShowPlayerEntry]);

  const handleTeamBid = useCallback(async (team: Team) => {
    if (!currentPlayer || status !== 'bidding') return;

    const teamBudget = teams[0]?.total_budget;
    const increment = getBidIncrement(currentBid, teamBudget);
    const newBid = currentTeam
      ? currentBid + increment
      : currentPlayer.base_price;

    if (newBid > team.max_bid) {
      onShowToast?.(
        `Cannot afford this bid! Max: ₹${team.max_bid.toLocaleString('en-IN')}`,
        'error',
        team
      );
      return;
    }

    try {
      await api.placeBid(team.id, newBid);
      // Socket will broadcast teams:updated
    } catch (error: any) {
      onShowToast?.(error.message || 'Failed to place bid', 'error', team);
    }
  }, [currentPlayer, currentBid, currentTeam, status, teams, onShowToast]);

  const handleIncrementBid = useCallback(async () => {
    if (!currentPlayer || status !== 'bidding') return;
    const teamBudget = teams[0]?.total_budget;
    const increment = getBidIncrement(currentBid, teamBudget);
    try {
      await api.incrementBid(currentBid + increment);
    } catch (error: any) {
      console.error('Failed to increment bid:', error);
    }
  }, [currentPlayer, currentBid, status, teams]);

  const handleDecrementBid = useCallback(async () => {
    if (!currentPlayer || status !== 'bidding') return;
    const basePrice = currentPlayer.base_price || 0;
    const teamBudget = teams[0]?.total_budget;
    const increment = getBidIncrement(currentBid, teamBudget);
    const newBid = currentBid - increment;

    if (newBid < basePrice) {
      return;
    }

    try {
      await api.incrementBid(newBid);
    } catch {
      // Failed to decrement bid - silently ignore
    }
  }, [currentPlayer, currentBid, status, teams]);

  const handleSold = useCallback(async () => {
    if (!currentPlayer || !currentTeam) {
      alert('Please place a bid first');
      return;
    }

    try {
      setLastAction({ player: currentPlayer, type: 'sold' });
      await api.markSold();
      // Socket will broadcast teams:updated
    } catch (error: any) {
      setLastAction(null);
      alert(error.message || 'Failed to mark as sold');
    }
  }, [currentPlayer, currentTeam]);

  const handleUnsold = useCallback(async () => {
    if (!currentPlayer) return;

    try {
      setLastAction({ player: currentPlayer, type: 'unsold' });
      await api.markUnsold();
    } catch (error: any) {
      setLastAction(null);
      alert(error.message || 'Failed to mark as unsold');
    }
  }, [currentPlayer]);

  const handleUndo = useCallback(async () => {
    if (!lastAction) return;

    try {
      await api.resetPlayer(lastAction.player.id);
      // Socket will broadcast teams:updated

      const player = await api.getPlayerForAuction(lastAction.player.id) as Player;
      timerResetKey.current += 1;

      setAuctionState({
        currentPlayer: player,
        currentBid: player.base_price,
        currentTeam: null,
        bidHistory: [],
        status: 'bidding'
      });

      onShowToast?.(
        `Undid ${lastAction.type} for ${lastAction.player.name} - Auction restarted`,
        'info'
      );
      setLastAction(null);
    } catch (error: any) {
      alert(error.message || 'Failed to undo');
    }
  }, [lastAction, setAuctionState, onShowToast]);

  const handleSearchPlayer = useCallback(async (uid: string) => {
    if (!uid.trim()) return;

    try {
      const player = await api.searchPlayerByUID(uid) as Player;
      const updatedPlayer = await api.getPlayerForAuction(player.id) as Player;
      timerResetKey.current += 1;
      onShowPlayerEntry?.(updatedPlayer);
      setAuctionState({
        currentPlayer: updatedPlayer,
        currentBid: updatedPlayer.base_price,
        currentTeam: null,
        bidHistory: [],
        status: 'bidding'
      });
    } catch (error: any) {
      alert('Player not found');
    }
  }, [setAuctionState, onShowPlayerEntry]);

  const closeFortuneWheel = useCallback(() => {
    setShowFortuneWheel(false);
  }, []);

  return {
    loading,
    lastAction,
    availablePlayers,
    showFortuneWheel,
    timerResetKey,
    handleNewPlayer,
    handleOpenFortuneWheel,
    handleFortuneWheelSelect,
    handleTeamBid,
    handleIncrementBid,
    handleDecrementBid,
    handleSold,
    handleUnsold,
    handleUndo,
    handleSearchPlayer,
    closeFortuneWheel,
  };
}
