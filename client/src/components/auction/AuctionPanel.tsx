import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuctionStore } from '../../stores/auctionStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { socketClient } from '../../socket/client';
import { api } from '../../utils/api';
import { Team, Player, AuctionState } from '../../types';
import PlayerCard from './PlayerCard';
import BidDisplay from './BidDisplay';
import TeamButtons from './TeamButtons';
import AuctionTimer from './AuctionTimer';
import SoldCelebration from './SoldCelebration';
import { getBidIncrement } from '../../config/budgetPresets';
import { UserPlus, Check, X, RotateCcw, Search, Zap, Undo2, Loader2 } from 'lucide-react';
import RoleFilterDropdown from './RoleFilterDropdown';

export default function AuctionPanel() {
  const { tournament } = useAuthStore();
  const { timerDuration } = useUIStore();
  const {
    currentPlayer,
    currentBid,
    currentTeam,
    status,
    selectedCategoryId,
    selectedRoleCategory,
    setAuctionState,
  } = useAuctionStore();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [soldLoading, setSoldLoading] = useState(false);
  const [unsoldLoading, setUnsoldLoading] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [biddingTeamId, setBiddingTeamId] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastAction, setLastAction] = useState<{ player: Player; type: 'sold' | 'unsold' } | null>(null);
  const timerResetKey = useRef(0);
  const previousBidRef = useRef(currentBid);
  const previousStatusRef = useRef(status);

  // Debounced loadTeams to prevent multiple rapid calls
  const loadTeamsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTeamsDebounced = useCallback(() => {
    if (loadTeamsTimeoutRef.current) {
      clearTimeout(loadTeamsTimeoutRef.current);
    }
    loadTeamsTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await api.getTeams() as Team[];
        setTeams(data);
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    }, 300);
  }, []);

  useEffect(() => {
    // Initial load (immediate) with proper error handling
    const loadInitialData = async () => {
      try {
        const data = await api.getTeams();
        setTeams(data as Team[]);
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    };
    loadInitialData();
    loadAuctionState();

    // Listen for team updates via socket (debounced)
    const handleTeamsUpdated = () => loadTeamsDebounced();
    socketClient.onTeamsUpdated(handleTeamsUpdated);

    return () => {
      socketClient.off('teams:updated');
      if (loadTeamsTimeoutRef.current) {
        clearTimeout(loadTeamsTimeoutRef.current);
      }
    };
  }, [loadTeamsDebounced]);

  // Reset timer when a new bid is placed (like real IPL auction)
  useEffect(() => {
    if (status === 'bidding' && currentBid !== previousBidRef.current) {
      // A new bid was placed, reset the timer
      timerResetKey.current += 1;
      previousBidRef.current = currentBid;
    }
  }, [currentBid, status]);

  // Trigger celebration when player is sold
  useEffect(() => {
    if (status === 'sold' && previousStatusRef.current !== 'sold') {
      setShowCelebration(true);
      // Auto-hide celebration after animation
      const timer = setTimeout(() => setShowCelebration(false), 4000);
      return () => clearTimeout(timer);
    }
    previousStatusRef.current = status;
  }, [status]);

  const loadAuctionState = async () => {
    try {
      const state = await api.getAuctionState() as AuctionState;
      setAuctionState(state);
    } catch (error) {
      console.error('Failed to load auction state:', error);
    }
  };

  const handleNewPlayer = useCallback(async () => {
    setLoading(true);
    try {
      const player = await api.getNextPlayer(selectedCategoryId || undefined, selectedRoleCategory || undefined) as Player;
      // Reset timer when new player is fetched
      timerResetKey.current += 1;
      // Also update state directly in case socket event is missed
      if (player) {
        setAuctionState({
          currentPlayer: player,
          currentBid: player.base_price,
          currentTeam: null,
          bidHistory: [],
          status: 'bidding'
        });
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '';
      // Handle tournament not found - clear cache and redirect
      if (errorMsg.includes('not found') || errorMsg.includes('deleted')) {
        alert('Tournament not found. It may have been deleted. Please log in again.');
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return;
      }
      const hasFilter = selectedCategoryId || selectedRoleCategory;
      const defaultMsg = hasFilter
        ? 'No players available in this category/role. Try clearing the filter.'
        : 'No available players';
      alert(errorMsg || defaultMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, selectedRoleCategory, setAuctionState]);

  const handleTimerUp = useCallback(() => {
    // Auto-action when timer expires - handled server-side
  }, []);

  // Memoize team budget and bid increment to prevent recalculation
  const teamBudget = useMemo(() => teams[0]?.total_budget, [teams]);
  const bidIncrement = useMemo(() => getBidIncrement(currentBid, teamBudget), [currentBid, teamBudget]);

  const handleTeamBid = useCallback(async (team: Team) => {
    if (!currentPlayer || status !== 'bidding' || biddingTeamId) return;

    // Use memoized bid increment
    const newBid = currentTeam
      ? currentBid + bidIncrement
      : currentPlayer.base_price;

    if (newBid > team.max_bid) {
      alert(`${team.short_name} cannot afford this bid. Max bid: ${team.max_bid.toLocaleString()}`);
      return;
    }

    setBiddingTeamId(team.id);
    try {
      // Pass expectedBid for optimistic locking - prevents race conditions
      await api.placeBid(team.id, newBid, currentBid);
      // Socket will broadcast teams:updated, no need to call loadTeams()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to place bid';
      alert(message);
    } finally {
      setBiddingTeamId(null);
    }
  }, [currentPlayer, currentBid, currentTeam, status, biddingTeamId, bidIncrement]);

  const handleIncrementBid = useCallback(async () => {
    if (!currentPlayer || status !== 'bidding') return;

    try {
      await api.incrementBid(currentBid + bidIncrement);
    } catch (error: unknown) {
      console.error('Failed to increment bid:', error);
    }
  }, [currentPlayer, currentBid, status, bidIncrement]);

  const handleDecrementBid = useCallback(async () => {
    if (!currentPlayer || status !== 'bidding') return;

    // Get the base price - cannot go below this
    const basePrice = currentPlayer.base_price || 0;

    // Calculate new bid amount using memoized increment
    const newBid = currentBid - bidIncrement;

    // Constraint: Cannot go below base price
    if (newBid < basePrice) {
      return;
    }

    try {
      await api.incrementBid(newBid);
    } catch {
      // Failed to decrement bid - silently ignore
    }
  }, [currentPlayer, currentBid, status, bidIncrement]);

  const handleManualBid = useCallback(async (amount: number) => {
    if (!currentPlayer || status !== 'bidding') return false;

    const basePrice = currentPlayer.base_price || 0;

    if (amount < basePrice) {
      alert(`Amount must be at least base price: ₹${basePrice.toLocaleString('en-IN')}`);
      return false;
    }

    if (amount <= currentBid) {
      alert(`Amount must be higher than current bid: ₹${currentBid.toLocaleString('en-IN')}`);
      return false;
    }

    try {
      await api.incrementBid(amount);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to set manual bid';
      alert(message);
      return false;
    }
  }, [currentPlayer, currentBid, status]);

  const handleSold = useCallback(async () => {
    if (!currentPlayer || !currentTeam || soldLoading) {
      if (!currentTeam) alert('Please place a bid first');
      return;
    }

    setSoldLoading(true);
    try {
      setLastAction({ player: currentPlayer, type: 'sold' });
      await api.markSold();
      // Socket will broadcast teams:updated, no need to call loadTeams()
    } catch (error: unknown) {
      setLastAction(null);
      const message = error instanceof Error ? error.message : 'Failed to mark as sold';
      alert(message);
    } finally {
      setSoldLoading(false);
    }
  }, [currentPlayer, currentTeam, soldLoading]);

  const handleUnsold = useCallback(async () => {
    if (!currentPlayer || unsoldLoading) return;

    setUnsoldLoading(true);
    try {
      setLastAction({ player: currentPlayer, type: 'unsold' });
      await api.markUnsold();
    } catch (error: unknown) {
      setLastAction(null);
      const message = error instanceof Error ? error.message : 'Failed to mark as unsold';
      alert(message);
    } finally {
      setUnsoldLoading(false);
    }
  }, [currentPlayer, unsoldLoading]);

  const handleUndo = useCallback(async () => {
    if (!lastAction || undoLoading) return;

    setUndoLoading(true);
    try {
      // Reset the player in database
      await api.resetPlayer(lastAction.player.id);
      // Socket will broadcast teams:updated, no need to call loadTeams()

      // Bring the player back into auction/bidding mode
      const player = await api.getPlayerForAuction(lastAction.player.id) as Player;
      timerResetKey.current += 1;

      // Update auction state to restart bidding for this player
      setAuctionState({
        currentPlayer: player,
        currentBid: player.base_price,
        currentTeam: null,
        bidHistory: [],
        status: 'bidding'
      });

      alert(`Undid ${lastAction.type} for ${lastAction.player.name} - Auction restarted`);
      setLastAction(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to undo';
      alert(message);
    } finally {
      setUndoLoading(false);
    }
  }, [lastAction, undoLoading, setAuctionState]);

  const handleSearchPlayer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerSearch.trim() || searchLoading) return;

    setSearchLoading(true);
    try {
      const player = await api.searchPlayerByUID(playerSearch) as Player;
      await api.getPlayerForAuction(player.id);
      setPlayerSearch('');
      setShowSearch(false);
    } catch {
      alert('Player not found');
    } finally {
      setSearchLoading(false);
    }
  }, [playerSearch, searchLoading]);

  useKeyboardShortcuts({
    teams,
    onTeamBid: handleTeamBid,
    onIncrementBid: handleIncrementBid,
    onDecrementBid: handleDecrementBid,
    enabled: status === 'bidding',
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      {/* Sold Celebration Effect */}
      <SoldCelebration isActive={showCelebration} />

      {/* Timer Bar - Compact, above main content during bidding */}
      {status === 'bidding' && (
        <div className="px-6 pt-4">
          <div className="max-w-7xl mx-auto">
            <AuctionTimer
              key={timerResetKey.current}
              duration={timerDuration}
              onTimeUp={handleTimerUp}
              disabled={status !== 'bidding'}
              tournamentId={tournament?.id}
              compact={true}
              autoStart={currentBid > 0}
            />
          </div>
        </div>
      )}

      {/* Main Content Area - Takes available space */}
      <div className="flex-1 p-6 pb-0">
        <div className="max-w-7xl mx-auto h-full">
          {/* Player Card & Bid Display Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Player Card - Takes more space */}
            <div className="lg:col-span-7">
              <PlayerCard player={currentPlayer} status={status} />
            </div>

            {/* Bid Display */}
            <div className="lg:col-span-5">
              <BidDisplay
                currentBid={currentBid}
                currentTeam={currentTeam ? teams.find(t => t.id === currentTeam.id) || currentTeam : null}
                player={currentPlayer}
                teamBudget={teams[0]?.total_budget}
                onManualBid={handleManualBid}
                disabled={status !== 'bidding'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-6" />

      {/* Control Bar - Fixed at bottom of content area */}
      <div className="sticky bottom-20 z-40 px-6 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl shadow-2xl">
            {/* Decorative top border gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-purple-500 to-amber-500" />

            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/5 via-transparent to-amber-600/5 pointer-events-none" />

            <div className="relative z-10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-6">
                {/* Left: New Player & Role Filter & Search */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleNewPlayer}
                    disabled={loading || status === 'bidding'}
                    aria-label="Start auction for next player"
                    className="relative group flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-purple-600 group-hover:from-primary-500 group-hover:to-purple-500 transition-all" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {loading ? (
                      <Loader2 size={20} className="relative text-white animate-spin" />
                    ) : (
                      <UserPlus size={20} className="relative text-white" />
                    )}
                    <span className="relative text-white">{loading ? 'Loading...' : 'New Player'}</span>
                  </button>

                  <RoleFilterDropdown disabled={status === 'bidding'} />

                  {showSearch ? (
                    <form onSubmit={handleSearchPlayer} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value.toUpperCase())}
                        placeholder="P001"
                        aria-label="Enter player ID to search"
                        className="w-24 bg-slate-800/80 border border-slate-600/50 rounded-xl px-3 py-2.5 text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                        autoFocus
                        disabled={searchLoading}
                      />
                      <button
                        type="submit"
                        disabled={searchLoading}
                        aria-label="Search for player by ID"
                        className="bg-slate-700/80 hover:bg-slate-600 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50"
                      >
                        {searchLoading ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Search size={20} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSearch(false)}
                        aria-label="Close search"
                        className="text-slate-400 hover:text-white p-2"
                        disabled={searchLoading}
                      >
                        <X size={20} />
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowSearch(true)}
                      aria-label="Open player search"
                      className="flex items-center gap-2 bg-slate-700/80 hover:bg-slate-600 text-white p-3 rounded-xl transition-colors"
                      title="Search by Player ID"
                    >
                      <Search size={20} />
                    </button>
                  )}
                </div>

                {/* Center: Team Buttons */}
                <div className="flex-1 flex justify-center">
                  <TeamButtons
                    teams={teams}
                    onTeamBid={handleTeamBid}
                    currentTeamId={currentTeam?.id}
                    disabled={status !== 'bidding'}
                    loadingTeamId={biddingTeamId}
                  />
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSold}
                    disabled={!currentTeam || status !== 'bidding' || soldLoading}
                    aria-label="Mark player as sold to current bidder"
                    className="relative group flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 group-hover:from-emerald-500 group-hover:to-green-500 transition-all" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {soldLoading ? (
                      <Loader2 size={20} className="relative text-white animate-spin" />
                    ) : (
                      <Check size={20} className="relative text-white" />
                    )}
                    <span className="relative text-white">{soldLoading ? 'Saving...' : 'Sold'}</span>
                  </button>

                  <button
                    onClick={handleUnsold}
                    disabled={!currentPlayer || status !== 'bidding' || unsoldLoading}
                    aria-label="Mark player as unsold"
                    className="relative group flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-600 group-hover:from-red-500 group-hover:to-rose-500 transition-all" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {unsoldLoading ? (
                      <Loader2 size={20} className="relative text-white animate-spin" />
                    ) : (
                      <X size={20} className="relative text-white" />
                    )}
                    <span className="relative text-white">{unsoldLoading ? 'Saving...' : 'Unsold'}</span>
                  </button>

                  <button
                    onClick={handleUndo}
                    disabled={!lastAction || undoLoading}
                    aria-label={lastAction ? `Undo ${lastAction.type} for ${lastAction.player.name}` : 'Undo last action'}
                    className="relative group flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                    title={lastAction ? `Undo ${lastAction.type} for ${lastAction.player.name}` : 'No action to undo'}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 group-hover:from-amber-500 group-hover:to-orange-500 transition-all" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {undoLoading ? (
                      <Loader2 size={20} className="relative text-white animate-spin" />
                    ) : (
                      <Undo2 size={20} className="relative text-white" />
                    )}
                    <span className="relative text-white">{undoLoading ? 'Undoing...' : 'Undo'}</span>
                  </button>

                  <button
                    onClick={handleNewPlayer}
                    disabled={status !== 'sold' && status !== 'unsold'}
                    aria-label="Proceed to next player"
                    className="flex items-center gap-2 bg-amber-600/80 hover:bg-amber-500 disabled:bg-slate-700/50 disabled:text-slate-500 text-white p-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
                    title="Next Player"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>
              </div>

              {/* Keyboard Hints */}
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                  <span className="flex items-center gap-2">
                    <kbd className="px-2 py-1 rounded bg-slate-700/50 border border-slate-600/50 text-xs font-mono text-slate-300">↑</kbd>
                    <span>Increment bid</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    <span>Team shortcuts shown on hover</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
