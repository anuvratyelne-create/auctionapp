import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuctionStore } from '../../stores/auctionStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { socketClient } from '../../socket/client';
import { api } from '../../utils/api';
import { soundManager } from '../../utils/soundManager';
import { Team, Player } from '../../types';
import { getTemplate } from '../../config/auctionTemplates';
import ProPlayerCard from './ProPlayerCard';
import TeamButtons from './TeamButtons';
import AuctionTimer from './AuctionTimer';
import SoldCelebration from './SoldCelebration';
import SoldPlayerAnimation from './SoldPlayerAnimation';
import ClassicSoldAnimation from './ClassicSoldAnimation';
import TemplateSelector from './TemplateSelector';
import AnimatedBackground from './AnimatedBackground';
import FortuneWheel from './FortuneWheel';
import PlayerEntryAnimation from './PlayerEntryAnimation';
import BudgetAlerts from '../common/BudgetAlerts';
import { PremiumBroadcastLayout, FireBroadcastLayout, CityBroadcastLayout, BreakScreen } from './layouts';
import CompletionScreen from './layouts/CompletionScreen';
import PremiumPlayerEntry from './layouts/PremiumPlayerEntry';
import FirePlayerEntry from './FirePlayerEntry';
import FireSoldAnimation from './FireSoldAnimation';
import CityPlayerEntry from './CityPlayerEntry';
import CitySoldAnimation from './CitySoldAnimation';
import ClassicIdleScreen from './layouts/ClassicIdleScreen';
import AuctionResumeScreen from './layouts/AuctionResumeScreen';
import { getBidIncrement } from '../../config/budgetPresets';
import { UserPlus, Check, X, RotateCcw, Search, Zap, Volume2, VolumeX, Disc, FastForward, Layout, Undo2, Pause, Loader2 } from 'lucide-react';
import RoleFilterDropdown from './RoleFilterDropdown';

interface ProAuctionLayoutProps {
  onClose?: () => void;
}

export default function ProAuctionLayout({ onClose }: ProAuctionLayoutProps) {
  const { tournament, updateTournament } = useAuthStore();
  const { selectedThemeId, selectedLayout, setSelectedLayout, showTemplateSelector, toggleTemplateSelector, soundEnabled, toggleSound, timerDuration, acceleratedMode, acceleratedTimerDuration, toggleAcceleratedMode, showSponsors, sponsorRotationInterval, isAuctionPaused, setAuctionPaused } = useUIStore();
  const template = getTemplate(selectedThemeId);
  const {
    currentPlayer,
    currentBid,
    currentTeam,
    status,
    selectedCategoryId,
    selectedRoleCategory,
    setAuctionState,
  } = useAuctionStore();

  // Get auction lifecycle state from store (these come from socket updates)
  const auctionState = useAuctionStore();
  const auctionStarted = auctionState.auctionStarted ?? false;
  const lastPlayer = auctionState.lastPlayer ?? null;
  const lastStatus = auctionState.lastStatus ?? null;
  const lastTeam = auctionState.lastTeam ?? null;
  const lastPrice = auctionState.lastPrice ?? 0;

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
  const [showFortuneWheel, setShowFortuneWheel] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [toast, setToast] = useState<{ message: string; team?: Team; type: 'error' | 'warning' | 'info' } | null>(null);
  const [showPlayerEntry, setShowPlayerEntry] = useState(false);
  const [entryPlayer, setEntryPlayer] = useState<Player | null>(null);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [showSoldAnimation, setShowSoldAnimation] = useState(false);
  const [soldAnimationData, setSoldAnimationData] = useState<{ player: Player; team: Team; price: number } | null>(null);
  const [sponsors, setSponsors] = useState<Array<{ id: string; name?: string; logo_url: string }>>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);
  const [lastAction, setLastAction] = useState<{ player: Player; type: 'sold' | 'unsold' } | null>(null);
  const [availablePlayersCount, setAvailablePlayersCount] = useState<number | null>(null);
  const timerResetKey = useRef(0);
  const previousBidRef = useRef(currentBid);
  const previousStatusRef = useRef(status);

  // Debounced loadTeams to prevent multiple rapid calls (must be defined before useEffect that uses it)
  const loadTeamsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTeams = useCallback(async () => {
    // Clear any pending load
    if (loadTeamsTimeoutRef.current) {
      clearTimeout(loadTeamsTimeoutRef.current);
    }
    // Debounce: wait 300ms before actually loading
    loadTeamsTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await api.getTeams() as Team[];
        setTeams(data);
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    }, 300);
  }, []);

  // Load available players count
  const loadAvailablePlayersCount = useCallback(async () => {
    try {
      const players = await api.getPlayers('available') as Player[];
      setAvailablePlayersCount(players.length);
    } catch (error) {
      console.error('Failed to load available players count:', error);
      setAvailablePlayersCount(0);
    }
  }, []);

  useEffect(() => {
    if (!tournament?.id) return;

    // Connect to socket and join tournament room
    socketClient.connect(tournament.id);

    // Initial load (immediate, no debounce) with proper error handling
    const loadInitialTeams = async () => {
      try {
        const data = await api.getTeams();
        setTeams(data as Team[]);
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    };
    loadInitialTeams();
    loadAuctionState();
    loadAvailablePlayersCount();

    // Define handlers for proper cleanup
    const handleAuctionState = (state: any) => {
      setAuctionState(state);
    };

    const handleTeamsUpdated = () => {
      loadTeams(); // Uses debounced version
    };

    const handlePlayersUpdated = () => {
      loadAvailablePlayersCount(); // Refresh available count
    };

    // Listen for auction state updates from server
    socketClient.onAuctionState(handleAuctionState);
    socketClient.onTeamsUpdated(handleTeamsUpdated);
    socketClient.on('players:updated', handlePlayersUpdated);

    // Listen for tournament status changes (e.g., when admin marks as completed)
    const handleTournamentCompleted = (data: { status: string; by?: string }) => {
      if (tournament) {
        updateTournament({ ...tournament, status: 'completed' });
      }
    };

    const handleTournamentStatusChanged = (data: { status: string; by?: string }) => {
      if (tournament && data.status) {
        updateTournament({ ...tournament, status: data.status as 'setup' | 'live' | 'paused' | 'completed' });
      }
    };

    socketClient.on('tournament:completed', handleTournamentCompleted);
    socketClient.on('tournament:status-changed', handleTournamentStatusChanged);

    // Cleanup: remove specific listeners and clear debounce timeout
    return () => {
      socketClient.removeAllListeners();
      socketClient.off('tournament:completed', handleTournamentCompleted);
      socketClient.off('tournament:status-changed', handleTournamentStatusChanged);
      socketClient.off('players:updated', handlePlayersUpdated);
      if (loadTeamsTimeoutRef.current) {
        clearTimeout(loadTeamsTimeoutRef.current);
      }
    };
  }, [tournament?.id, setAuctionState, loadTeams, loadAvailablePlayersCount, tournament, updateTournament]);

  // Broadcast accent color to overlay when theme changes or on initial load
  // Use a ref to track if we've done the initial broadcast
  const initialBroadcastDone = useRef(false);

  useEffect(() => {
    if (!tournament?.id) return;

    // Small delay to ensure socket is connected
    const broadcastAccentColor = () => {
      socketClient.emitOverlaySettingsUpdate(tournament.id, {
        accentColor: template.accentColor
      });
    };

    // Broadcast after a short delay to ensure socket is connected
    const timeoutId = setTimeout(broadcastAccentColor, 500);

    // Also broadcast immediately if this is a theme change (not initial load)
    if (initialBroadcastDone.current) {
      broadcastAccentColor();
    }
    initialBroadcastDone.current = true;

    return () => clearTimeout(timeoutId);
  }, [selectedThemeId, tournament?.id, template.accentColor]);

  useEffect(() => {
    if (status === 'bidding' && currentBid !== previousBidRef.current) {
      // Play bid sound on new bid (not on initial bid)
      if (previousBidRef.current > 0 && currentBid > previousBidRef.current) {
        soundManager.play('bid');
      }
      timerResetKey.current += 1;
      previousBidRef.current = currentBid;
    }
  }, [currentBid, status]);

  // Track if we've already shown animation for current sold state
  const soldAnimationShownRef = useRef(false);

  useEffect(() => {
    // Reset flag when status changes away from sold
    if (status !== 'sold') {
      soldAnimationShownRef.current = false;
    }

    // Play sounds and show celebration on status change to sold
    if (status === 'sold' && previousStatusRef.current !== 'sold' && !soldAnimationShownRef.current) {
      soldAnimationShownRef.current = true;
      // Play sold sound ONCE
      soundManager.play('sold');
      // Show sold animation with player and team info
      if (currentPlayer && currentTeam) {
        setSoldAnimationData({
          player: currentPlayer,
          team: currentTeam,
          price: currentBid
        });
        setShowSoldAnimation(true);
      }
      // Show confetti celebration alongside
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      previousStatusRef.current = status;
      return () => clearTimeout(timer);
    }
    if (status === 'unsold' && previousStatusRef.current !== 'unsold') {
      soundManager.play('unsold');
    }
    previousStatusRef.current = status;
    // Only depend on status to prevent retriggering from object reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Load sponsors
  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const data = await api.getSponsors() as Array<{ id: string; name?: string; logo_url: string; display_order: number }>;
        setSponsors(data.sort((a, b) => a.display_order - b.display_order));
      } catch (error) {
        console.error('Failed to load sponsors:', error);
      }
    };
    loadSponsors();
  }, []);

  // Rotate sponsors based on interval
  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSponsorIndex((prev) => (prev + 1) % sponsors.length);
    }, sponsorRotationInterval * 1000);
    return () => clearInterval(interval);
  }, [sponsors.length, sponsorRotationInterval]);

  const currentSponsor = sponsors[currentSponsorIndex];

  // Memoized timer duration to prevent recalculation on every render
  const effectiveTimerDuration = useMemo(() =>
    acceleratedMode ? acceleratedTimerDuration : timerDuration,
    [acceleratedMode, acceleratedTimerDuration, timerDuration]
  );

  const loadAuctionState = async () => {
    try {
      const state = await api.getAuctionState() as any;
      setAuctionState(state);
    } catch (error) {
      console.error('Failed to load auction state:', error);
    }
  };

  const handleNewPlayer = async () => {
    setLoading(true);
    try {
      // Get next player with category and role filters
      const player = await api.getNextPlayer(selectedCategoryId || undefined, selectedRoleCategory || undefined) as any;
      timerResetKey.current += 1;
      if (player) {
        // Show dramatic entry animation
        setEntryPlayer(player);
        setShowPlayerEntry(true);

        // Set auction state (timer will start after animation)
        setAuctionState({
          currentPlayer: player,
          currentBid: player.base_price,
          currentTeam: null,
          bidHistory: [],
          status: 'bidding'
        });
      }
    } catch (error: any) {
      const errorMsg = error.message || '';
      // Handle tournament not found - clear cache and redirect
      if (errorMsg.includes('not found') || errorMsg.includes('deleted')) {
        alert('Tournament not found. It may have been deleted. Please log in again.');
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return;
      }
      // Show more specific message if filters are active
      const hasFilter = selectedCategoryId || selectedRoleCategory;
      const defaultMsg = hasFilter
        ? 'No players available in this category/role. Try clearing the filter.'
        : 'No available players';
      alert(errorMsg || defaultMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFortuneWheel = async () => {
    try {
      // Fetch available players for the wheel with category and role filters
      const players = await api.getPlayers('available', selectedCategoryId || undefined, selectedRoleCategory || undefined) as Player[];
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
  };

  const handleFortuneWheelSelect = async (player: Player) => {
    setShowFortuneWheel(false);
    timerResetKey.current += 1;

    // Set player for auction via API (this updates status to bidding and broadcasts)
    try {
      const updatedPlayer = await api.getPlayerForAuction(player.id) as Player;

      // Show dramatic entry animation
      setEntryPlayer(updatedPlayer);
      setShowPlayerEntry(true);

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
  };

  const handleTimerUp = useCallback(() => {
    // Timer expired - player auto-unsold handling is done server-side
  }, []);

  const handleTeamBid = useCallback(async (team: Team) => {
    if (!currentPlayer || status !== 'bidding' || biddingTeamId) return;

    // Use team budget to determine appropriate bid increment
    const teamBudget = teams[0]?.total_budget;
    const increment = getBidIncrement(currentBid, teamBudget);
    const newBid = currentTeam
      ? currentBid + increment
      : currentPlayer.base_price;

    if (newBid > team.max_bid) {
      setToast({
        message: `Cannot afford this bid! Max: ₹${team.max_bid.toLocaleString('en-IN')}`,
        team,
        type: 'error'
      });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    setBiddingTeamId(team.id);
    try {
      // Pass expectedBid for optimistic locking - prevents race conditions
      await api.placeBid(team.id, newBid, currentBid);
      // Socket will broadcast teams:updated, no need to call loadTeams()
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to place bid',
        team,
        type: 'error'
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setBiddingTeamId(null);
    }
  }, [currentPlayer, currentBid, currentTeam, status, teams, biddingTeamId]);

  const handleIncrementBid = useCallback(async () => {
    if (!currentPlayer || status !== 'bidding') return;

    // Use team budget to determine appropriate bid increment
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

    // Get the base price - cannot go below this
    const basePrice = currentPlayer.base_price || 0;

    // Use team budget to determine appropriate bid increment
    const teamBudget = teams[0]?.total_budget;
    const increment = getBidIncrement(currentBid, teamBudget);

    // Calculate new bid amount
    const newBid = currentBid - increment;

    // Constraint: Cannot go below base price
    if (newBid < basePrice) {
      return;
    }

    try {
      await api.incrementBid(newBid);
    } catch (error: any) {
      console.error('Failed to decrement bid:', error);
    }
  }, [currentPlayer, currentBid, status, teams]);

  // Stable callback for sold animation completion
  const handleSoldAnimationComplete = useCallback(() => {
    setShowSoldAnimation(false);
    setSoldAnimationData(null);
  }, []);

  // Stable callback for player entry animation completion
  const handlePlayerEntryComplete = useCallback(() => {
    setShowPlayerEntry(false);
    setEntryPlayer(null);
  }, []);

  const handleSold = async () => {
    if (!currentPlayer || !currentTeam || soldLoading) {
      if (!currentTeam) alert('Please place a bid first');
      return;
    }

    setSoldLoading(true);
    try {
      // Save for undo before marking sold
      setLastAction({ player: currentPlayer, type: 'sold' });
      await api.markSold();
      // Socket will broadcast teams:updated, no need to call loadTeams()
    } catch (error: any) {
      setLastAction(null);
      alert(error.message || 'Failed to mark as sold');
    } finally {
      setSoldLoading(false);
    }
  };

  const handleUnsold = async () => {
    if (!currentPlayer || unsoldLoading) return;

    setUnsoldLoading(true);
    try {
      // Save for undo before marking unsold
      setLastAction({ player: currentPlayer, type: 'unsold' });
      await api.markUnsold();
    } catch (error: any) {
      setLastAction(null);
      alert(error.message || 'Failed to mark as unsold');
    } finally {
      setUnsoldLoading(false);
    }
  };

  const handleUndo = async () => {
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

      setLastAction(null);
      // Show confirmation toast
      setToast({
        message: `Undid ${lastAction.type} for ${lastAction.player.name} - Auction restarted`,
        type: 'info'
      });
      setTimeout(() => setToast(null), 3000);
    } catch (error: any) {
      alert(error.message || 'Failed to undo');
    } finally {
      setUndoLoading(false);
    }
  };

  const handleSearchPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerSearch.trim() || searchLoading) return;

    setSearchLoading(true);
    try {
      const player = await api.searchPlayerByUID(playerSearch) as Player;
      const updatedPlayer = await api.getPlayerForAuction(player.id) as Player;

      timerResetKey.current += 1;

      // Show dramatic entry animation
      setEntryPlayer(updatedPlayer);
      setShowPlayerEntry(true);

      setAuctionState({
        currentPlayer: updatedPlayer,
        currentBid: updatedPlayer.base_price,
        currentTeam: null,
        bidHistory: [],
        status: 'bidding'
      });

      setPlayerSearch('');
      setShowSearch(false);
    } catch (error: any) {
      alert('Player not found');
    } finally {
      setSearchLoading(false);
    }
  };

  useKeyboardShortcuts({
    teams,
    onTeamBid: handleTeamBid,
    onIncrementBid: handleIncrementBid,
    onDecrementBid: handleDecrementBid,
    enabled: status === 'bidding',
  });

  // Show Completion Screen when tournament is completed
  if (tournament?.status === 'completed') {
    const themeMap: Record<string, 'classic' | 'premium' | 'fire' | 'city'> = {
      'premium-broadcast': 'premium',
      'fire': 'fire',
      'city': 'city',
      'classic': 'classic',
    };
    return (
      <CompletionScreen
        tournament={tournament}
        stats={{
          totalTeams: teams.length,
          totalPlayers: availablePlayers.length,
          soldPlayers: teams.reduce((acc, t) => acc + (t.player_count || 0), 0),
          totalSpent: teams.reduce((acc, t) => acc + (t.spent_points || 0), 0),
        }}
        theme={themeMap[selectedLayout] || 'classic'}
        onClose={onClose}
      />
    );
  }

  // Premium Broadcast Layout
  if (selectedLayout === 'premium-broadcast') {
    return (
      <div className="relative min-h-screen h-screen flex flex-col overflow-hidden">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all backdrop-blur-sm"
            title="Back to Dashboard"
          >
            <X size={20} />
          </button>
        )}

        {/* Break Screen when auction is paused */}
        {isAuctionPaused && tournament && (
          <BreakScreen
            tournament={tournament}
            theme="premium"
            onResume={() => setAuctionPaused(false)}
          />
        )}

        {/* Premium Broadcast Display */}
        <div className="flex-1 relative">
          <PremiumBroadcastLayout
            tournament={tournament}
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            currentTeam={currentTeam}
            teams={teams}
            status={status}
            timerSeconds={effectiveTimerDuration}
            timerKey={timerResetKey.current}
            onNewPlayer={handleNewPlayer}
            onClose={onClose}
            loading={loading}
            auctionStarted={auctionStarted}
            lastPlayer={lastPlayer}
            lastStatus={lastStatus}
            lastTeam={lastTeam}
            lastPrice={lastPrice}
            availablePlayersCount={availablePlayersCount ?? 0}
          />
        </div>

        {/* Control Bar Overlay - positioned above bottom nav (hidden when paused or idle) */}
        {!isAuctionPaused && currentPlayer && (
        <div className="absolute bottom-16 left-0 right-0 z-40 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-8 pb-4 px-6">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            {/* Left: New Player + Role Filter + Search */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewPlayer}
                disabled={loading || status === 'bidding'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white transition-all disabled:opacity-50"
              >
                <UserPlus size={18} />
                New Player
              </button>
              <RoleFilterDropdown disabled={status === 'bidding'} theme="premium" />
              <button
                onClick={handleOpenFortuneWheel}
                disabled={status === 'bidding'}
                className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors border border-amber-500/30 disabled:opacity-50"
                title="Fortune Wheel"
              >
                <Disc size={18} />
              </button>

              {/* Search by Player ID */}
              {showSearch ? (
                <form onSubmit={handleSearchPlayer} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value.toUpperCase())}
                    placeholder="P001"
                    className="w-20 bg-primary-500/10 border border-primary-500/40 rounded-xl px-3 py-2 text-primary-400 text-center focus:border-primary-400 transition-all font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors border border-primary-500/30"
                  >
                    <Search size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSearch(false)}
                    className="text-primary-400/60 hover:text-primary-400 p-2"
                  >
                    <X size={18} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  disabled={status === 'bidding'}
                  className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors border border-primary-500/30 disabled:opacity-50"
                  title="Search by Player ID"
                >
                  <Search size={18} />
                </button>
              )}
            </div>

            {/* Center: Teams */}
            <div className="flex-1 flex justify-center">
              <TeamButtons
                teams={teams}
                onTeamBid={handleTeamBid}
                currentTeamId={currentTeam?.id}
                disabled={status !== 'bidding'}
                loadingTeamId={biddingTeamId}
              />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSold}
                disabled={!currentTeam || status !== 'bidding'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 text-white transition-all disabled:opacity-40"
              >
                <Check size={18} />
                Sold
              </button>
              <button
                onClick={handleUnsold}
                disabled={!currentPlayer || status !== 'bidding'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white transition-all disabled:opacity-40"
              >
                <X size={18} />
                Unsold
              </button>
              <button
                onClick={handleUndo}
                disabled={!lastAction}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white transition-all disabled:opacity-40"
                title={lastAction ? `Undo ${lastAction.type} for ${lastAction.player.name}` : 'No action to undo'}
              >
                <Undo2 size={18} />
                Undo
              </button>
              {/* Pause/Break Button */}
              <button
                onClick={() => setAuctionPaused(true)}
                disabled={status === 'bidding'}
                className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors border border-purple-500/30 disabled:opacity-40"
                title="Take a Break"
              >
                <Pause size={18} />
              </button>
              {/* Layout Toggle */}
              <button
                onClick={() => setSelectedLayout('classic')}
                className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors border border-purple-500/30"
                title="Switch to Classic Layout"
              >
                <Layout size={18} />
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Fortune Wheel Modal */}
        {showFortuneWheel && (
          <FortuneWheel
            players={availablePlayers}
            onSelect={handleFortuneWheelSelect}
            onClose={() => setShowFortuneWheel(false)}
          />
        )}

        {/* Sold Celebration */}
        {showCelebration && currentTeam && (
          <SoldCelebration isActive={showCelebration} teamColor={template.accentColor} />
        )}

        {/* Sold Player Animation */}
        {showSoldAnimation && soldAnimationData && (
          <SoldPlayerAnimation
            player={soldAnimationData.player}
            team={soldAnimationData.team}
            soldPrice={soldAnimationData.price}
            teamColor={template.accentColor}
            onComplete={handleSoldAnimationComplete}
            tournament={tournament || undefined}
          />
        )}

        {/* Budget Alerts */}
        <BudgetAlerts teams={teams} totalBudget={tournament?.total_points || 100000} />

        {/* Premium Player Entry Animation */}
        {showPlayerEntry && entryPlayer && (
          <PremiumPlayerEntry
            player={entryPlayer}
            onComplete={handlePlayerEntryComplete}
            tournament={tournament || undefined}
          />
        )}
      </div>
    );
  }

  // Fire Layout
  if (selectedLayout === 'fire') {
    return (
      <div className="relative min-h-screen h-screen flex flex-col overflow-hidden">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all backdrop-blur-sm"
            title="Back to Dashboard"
          >
            <X size={20} />
          </button>
        )}

        {/* Break Screen when auction is paused */}
        {isAuctionPaused && tournament && (
          <BreakScreen
            tournament={tournament}
            theme="fire"
            onResume={() => setAuctionPaused(false)}
          />
        )}

        {/* Fire Broadcast Display */}
        <div className="flex-1 relative">
          <FireBroadcastLayout
            tournament={tournament}
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            currentTeam={currentTeam}
            teams={teams}
            status={status}
            timerSeconds={effectiveTimerDuration}
            timerKey={timerResetKey.current}
            onNewPlayer={handleNewPlayer}
            onClose={onClose}
            loading={loading}
            auctionStarted={auctionStarted}
            lastPlayer={lastPlayer}
            lastStatus={lastStatus}
            lastTeam={lastTeam}
            lastPrice={lastPrice}
            availablePlayersCount={availablePlayersCount ?? 0}
          />
        </div>

        {/* Control Bar Overlay - Fire themed - positioned above bottom nav (hidden when paused or idle) */}
        {!isAuctionPaused && currentPlayer && (
        <div className="absolute bottom-16 left-0 right-0 z-40 px-4 pt-4 pb-3"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(15,5,5,0.95) 50%, rgba(15,5,5,0.7) 80%, transparent 100%)',
          }}
        >
          {/* Single Row: Left | Center Teams | Right */}
          <div className="flex items-end justify-between gap-2">
            {/* Left: New Player + Role Filter + Fortune Wheel - Fire styled */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleNewPlayer}
                disabled={loading || status === 'bidding'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-white text-sm transition-all disabled:opacity-50 hover:scale-105 border border-orange-500/40"
                style={{
                  background: 'linear-gradient(135deg, #c2410c, #991b1b)',
                  boxShadow: '0 0 15px rgba(249, 115, 22, 0.3)',
                }}
              >
                <UserPlus size={16} />
                New Player
              </button>
              <RoleFilterDropdown disabled={status === 'bidding'} theme="fire" />
              <button
                onClick={handleOpenFortuneWheel}
                disabled={status === 'bidding'}
                className="p-2 rounded-lg text-orange-400 hover:scale-105 transition-all disabled:opacity-50 border border-orange-500/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(194,65,12,0.3), rgba(153,27,27,0.2))',
                }}
                title="Fortune Wheel"
              >
                <Disc size={16} />
              </button>

              {/* Search by Player ID - Fire styled */}
              {showSearch ? (
                <form onSubmit={handleSearchPlayer} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value.toUpperCase())}
                    placeholder="P001"
                    className="w-16 bg-orange-500/10 border border-orange-500/40 rounded-lg px-2 py-1.5 text-orange-400 text-center text-sm focus:border-orange-400 transition-all font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-lg text-orange-400 hover:scale-105 transition-all border border-orange-500/40"
                    style={{
                      background: 'linear-gradient(135deg, rgba(194,65,12,0.3), rgba(153,27,27,0.2))',
                    }}
                  >
                    <Search size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSearch(false)}
                    className="text-orange-400/60 hover:text-orange-400 p-1"
                  >
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  disabled={status === 'bidding'}
                  className="p-2 rounded-lg text-orange-400 hover:scale-105 transition-all disabled:opacity-50 border border-orange-500/40"
                  style={{
                    background: 'linear-gradient(135deg, rgba(194,65,12,0.3), rgba(153,27,27,0.2))',
                  }}
                  title="Search by Player ID"
                >
                  <Search size={16} />
                </button>
              )}
            </div>

            {/* Center: Teams - Fire themed */}
            <div className="flex-1 flex justify-center px-2 min-w-0">
              <TeamButtons
                teams={teams}
                onTeamBid={handleTeamBid}
                currentTeamId={currentTeam?.id}
                disabled={status !== 'bidding'}
                theme="fire"
              />
            </div>

            {/* Right: Actions - Fire styled */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleSold}
                disabled={!currentTeam || status !== 'bidding'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-white text-sm transition-all disabled:opacity-40 hover:scale-105 border border-emerald-500/40"
                style={{
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  boxShadow: !currentTeam || status !== 'bidding' ? 'none' : '0 0 12px rgba(16, 185, 129, 0.4)',
                }}
              >
                <Check size={16} />
                Sold
              </button>
              <button
                onClick={handleUnsold}
                disabled={!currentPlayer || status !== 'bidding'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-white text-sm transition-all disabled:opacity-40 hover:scale-105 border border-red-500/40"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                  boxShadow: !currentPlayer || status !== 'bidding' ? 'none' : '0 0 12px rgba(239, 68, 68, 0.4)',
                }}
              >
                <X size={16} />
                Unsold
              </button>
              <button
                onClick={handleUndo}
                disabled={!lastAction}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-white text-sm transition-all disabled:opacity-40 hover:scale-105 border border-amber-500/40"
                style={{
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  boxShadow: !lastAction ? 'none' : '0 0 12px rgba(217, 119, 6, 0.4)',
                }}
                title={lastAction ? `Undo ${lastAction.type} for ${lastAction.player.name}` : 'No action to undo'}
              >
                <Undo2 size={16} />
                Undo
              </button>
              {/* Pause/Break Button */}
              <button
                onClick={() => setAuctionPaused(true)}
                disabled={status === 'bidding'}
                className="p-2 rounded-lg text-orange-400 hover:scale-105 transition-all border border-orange-500/40 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, rgba(194,65,12,0.3), rgba(153,27,27,0.2))',
                }}
                title="Take a Break"
              >
                <Pause size={16} />
              </button>
              {/* Layout Toggle */}
              <button
                onClick={() => setSelectedLayout('classic')}
                className="p-2 rounded-lg text-orange-400 hover:scale-105 transition-all border border-orange-500/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(194,65,12,0.3), rgba(153,27,27,0.2))',
                }}
                title="Switch to Classic Layout"
              >
                <Layout size={16} />
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Fortune Wheel Modal */}
        {showFortuneWheel && (
          <FortuneWheel
            players={availablePlayers}
            onSelect={handleFortuneWheelSelect}
            onClose={() => setShowFortuneWheel(false)}
          />
        )}

        {/* Sold Celebration */}
        {showCelebration && currentTeam && (
          <SoldCelebration isActive={showCelebration} teamColor="#f97316" />
        )}

        {/* Fire Sold Animation */}
        {showSoldAnimation && soldAnimationData && (
          <FireSoldAnimation
            player={soldAnimationData.player}
            team={soldAnimationData.team}
            soldPrice={soldAnimationData.price}
            onComplete={handleSoldAnimationComplete}
            tournament={tournament || undefined}
          />
        )}

        {/* Budget Alerts */}
        <BudgetAlerts teams={teams} totalBudget={tournament?.total_points || 100000} />

        {/* Fire Player Entry Animation */}
        {showPlayerEntry && entryPlayer && (
          <FirePlayerEntry
            player={entryPlayer}
            onComplete={handlePlayerEntryComplete}
            tournament={tournament || undefined}
          />
        )}
      </div>
    );
  }

  // City Layout
  if (selectedLayout === 'city') {
    return (
      <div className="relative min-h-screen h-screen flex flex-col overflow-hidden">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all backdrop-blur-sm"
            title="Back to Dashboard"
          >
            <X size={20} />
          </button>
        )}

        {/* Break Screen when auction is paused */}
        {isAuctionPaused && tournament && (
          <BreakScreen
            tournament={tournament}
            theme="city"
            onResume={() => setAuctionPaused(false)}
          />
        )}

        {/* City Broadcast Display */}
        <div className="flex-1 relative">
          <CityBroadcastLayout
            tournament={tournament}
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            currentTeam={currentTeam}
            teams={teams}
            status={status}
            timerSeconds={effectiveTimerDuration}
            timerKey={timerResetKey.current}
            onNewPlayer={handleNewPlayer}
            onClose={onClose}
            loading={loading}
            auctionStarted={auctionStarted}
            lastPlayer={lastPlayer}
            lastStatus={lastStatus}
            lastTeam={lastTeam}
            lastPrice={lastPrice}
            availablePlayersCount={availablePlayersCount ?? 0}
          />
        </div>

        {/* Control Bar Overlay - City themed (hidden when paused or idle) */}
        {!isAuctionPaused && currentPlayer && (
        <div className="absolute bottom-16 left-0 right-0 z-40 pt-8 pb-4 px-6"
          style={{
            background: 'linear-gradient(to top, rgba(10,22,40,0.98), rgba(10,22,40,0.8), transparent)',
          }}
        >
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            {/* Left: New Player + Role Filter + Fortune Wheel */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewPlayer}
                disabled={loading || status === 'bidding'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 hover:scale-105 border border-cyan-500/40"
                style={{
                  background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
                }}
              >
                <UserPlus size={18} />
                New Player
              </button>
              <RoleFilterDropdown disabled={status === 'bidding'} theme="city" />
              <button
                onClick={handleOpenFortuneWheel}
                disabled={status === 'bidding'}
                className="p-2.5 rounded-xl text-cyan-400 hover:scale-105 transition-all disabled:opacity-50 border border-cyan-500/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(8,145,178,0.3), rgba(124,58,237,0.2))',
                }}
                title="Fortune Wheel"
              >
                <Disc size={18} />
              </button>

              {/* Search by Player ID */}
              {showSearch ? (
                <form onSubmit={handleSearchPlayer} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value.toUpperCase())}
                    placeholder="P001"
                    className="w-20 bg-cyan-500/10 border border-cyan-500/40 rounded-xl px-3 py-2 text-cyan-400 text-center focus:border-cyan-400 transition-all font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl text-cyan-400 hover:scale-105 transition-all border border-cyan-500/40"
                    style={{
                      background: 'linear-gradient(135deg, rgba(8,145,178,0.3), rgba(124,58,237,0.2))',
                    }}
                  >
                    <Search size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSearch(false)}
                    className="text-cyan-400/60 hover:text-cyan-400 p-2"
                  >
                    <X size={18} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowSearch(true)}
                  disabled={status === 'bidding'}
                  className="p-2.5 rounded-xl text-cyan-400 hover:scale-105 transition-all disabled:opacity-50 border border-cyan-500/40"
                  style={{
                    background: 'linear-gradient(135deg, rgba(8,145,178,0.3), rgba(124,58,237,0.2))',
                  }}
                  title="Search by Player ID"
                >
                  <Search size={18} />
                </button>
              )}
            </div>

            {/* Center: Teams */}
            <div className="flex-1 flex justify-center">
              <TeamButtons
                teams={teams}
                onTeamBid={handleTeamBid}
                currentTeamId={currentTeam?.id}
                disabled={status !== 'bidding'}
                theme="premium"
              />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSold}
                disabled={!currentTeam || status !== 'bidding'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-40 hover:scale-105 border border-emerald-500/40"
                style={{
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  boxShadow: !currentTeam || status !== 'bidding' ? 'none' : '0 0 15px rgba(16, 185, 129, 0.4)',
                }}
              >
                <Check size={18} />
                Sold
              </button>
              <button
                onClick={handleUnsold}
                disabled={!currentPlayer || status !== 'bidding'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-40 hover:scale-105 border border-red-500/40"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                  boxShadow: !currentPlayer || status !== 'bidding' ? 'none' : '0 0 15px rgba(239, 68, 68, 0.4)',
                }}
              >
                <X size={18} />
                Unsold
              </button>
              <button
                onClick={handleUndo}
                disabled={!lastAction}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-40 hover:scale-105 border border-cyan-500/40"
                style={{
                  background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                  boxShadow: !lastAction ? 'none' : '0 0 15px rgba(8, 145, 178, 0.4)',
                }}
                title={lastAction ? `Undo ${lastAction.type} for ${lastAction.player.name}` : 'No action to undo'}
              >
                <Undo2 size={18} />
                Undo
              </button>
              {/* Pause/Break Button */}
              <button
                onClick={() => setAuctionPaused(true)}
                disabled={status === 'bidding'}
                className="p-2.5 rounded-xl text-cyan-400 hover:scale-105 transition-all border border-cyan-500/40 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, rgba(8,145,178,0.3), rgba(124,58,237,0.2))',
                }}
                title="Take a Break"
              >
                <Pause size={18} />
              </button>
              {/* Layout Toggle */}
              <button
                onClick={() => setSelectedLayout('classic')}
                className="p-2.5 rounded-xl text-purple-400 hover:scale-105 transition-all border border-purple-500/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(192,38,211,0.2))',
                }}
                title="Switch to Classic Layout"
              >
                <Layout size={18} />
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Fortune Wheel Modal */}
        {showFortuneWheel && (
          <FortuneWheel
            players={availablePlayers}
            onSelect={handleFortuneWheelSelect}
            onClose={() => setShowFortuneWheel(false)}
          />
        )}

        {/* Sold Celebration */}
        {showCelebration && currentTeam && (
          <SoldCelebration isActive={showCelebration} teamColor="#06b6d4" />
        )}

        {/* City Sold Animation */}
        {showSoldAnimation && soldAnimationData && (
          <CitySoldAnimation
            player={soldAnimationData.player}
            team={soldAnimationData.team}
            soldPrice={soldAnimationData.price}
            onComplete={handleSoldAnimationComplete}
            tournament={tournament || undefined}
          />
        )}

        {/* Budget Alerts */}
        <BudgetAlerts teams={teams} totalBudget={tournament?.total_points || 100000} />

        {/* City Player Entry Animation */}
        {showPlayerEntry && entryPlayer && (
          <CityPlayerEntry
            player={entryPlayer}
            onComplete={handlePlayerEntryComplete}
            tournament={tournament || undefined}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen h-screen flex flex-col overflow-hidden bg-slate-950">
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all backdrop-blur-sm"
          title="Back to Dashboard"
        >
          <X size={20} />
        </button>
      )}

      {/* Animated Background (for LIVE templates) */}
      {template.animatedBg && (
        <AnimatedBackground
          type={template.animatedBg}
          accentColor={template.accentColor}
          intensity="medium"
        />
      )}

      {/* Static Background Image */}
      {template.background && !template.animatedBg && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${template.background})` }}
        />
      )}

      {/* Dark Overlay (for image backgrounds) */}
      {template.background && !template.animatedBg && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${template.overlayOpacity})` }}
        />
      )}

      {/* Sold Celebration Effect */}
      <SoldCelebration isActive={showCelebration} teamColor={template.accentColor} />

      {/* Sold Player Animation - Classic or Premium based on layout */}
      {showSoldAnimation && soldAnimationData && (
        selectedLayout === 'classic' ? (
          <ClassicSoldAnimation
            player={soldAnimationData.player}
            team={soldAnimationData.team}
            soldPrice={soldAnimationData.price}
            teamColor={template.accentColor}
            onComplete={handleSoldAnimationComplete}
            tournament={tournament || undefined}
          />
        ) : (
          <SoldPlayerAnimation
            player={soldAnimationData.player}
            team={soldAnimationData.team}
            soldPrice={soldAnimationData.price}
            teamColor={template.accentColor}
            onComplete={handleSoldAnimationComplete}
            tournament={tournament || undefined}
          />
        )
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector onClose={toggleTemplateSelector} />
      )}

      {/* Header Bar - Projector Optimized */}
      <div
        className="relative z-10 flex items-center justify-between px-8 py-5"
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.6), transparent)`,
        }}
      >
        {/* Left: Tournament Logo & Name */}
        <div className="flex items-center gap-6">
          {/* Tournament Logo - Large for projector */}
          <div
            className="relative"
            style={{
              filter: `drop-shadow(0 0 20px ${template.accentColor}40)`
            }}
          >
            {tournament?.logo_url ? (
              <img
                src={tournament.logo_url}
                alt={tournament.name}
                className="h-24 w-auto object-contain"
              />
            ) : (
              <div
                className="h-24 w-24 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${template.accentColor}40, ${template.accentColor}20)`,
                  border: `2px solid ${template.accentColor}60`
                }}
              >
                <span className="text-white font-bold text-lg">LOGO</span>
              </div>
            )}
          </div>

          {/* Tournament Info */}
          <div>
            <div className="flex items-center gap-4">
              <h1
                className="text-3xl font-black text-white tracking-tight uppercase"
                style={{ textShadow: `0 0 30px ${template.accentColor}40` }}
              >
                {tournament?.name || 'PLAYERS AUCTION'}
              </h1>
              {/* LIVE Indicator */}
              {template.isAnimated && (
                <div
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full animate-pulse"
                  style={{
                    background: `linear-gradient(90deg, #dc2626, #ef4444)`,
                    boxShadow: '0 0 20px rgba(220, 38, 38, 0.5)'
                  }}
                >
                  <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Live</span>
                </div>
              )}
            </div>
            <p
              className="text-lg uppercase tracking-widest mt-1"
              style={{ color: `${template.accentColor}` }}
            >
              Players Auction
            </p>
          </div>
        </div>

        {/* Center: Timer - Minimal clean version */}
        {status === 'bidding' && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <AuctionTimer
              key={timerResetKey.current}
              duration={acceleratedMode ? acceleratedTimerDuration : timerDuration}
              onTimeUp={handleTimerUp}
              disabled={status !== 'bidding'}
              tournamentId={tournament?.id}
              minimal={true}
              accentColor={template.accentColor}
              autoStart={currentBid > 0}
            />
          </div>
        )}

        {/* Right: Sound Toggle + Sponsor + Template Selector */}
        <div className="flex items-center gap-5">
          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            className="p-4 rounded-xl transition-all hover:scale-105"
            style={{
              background: soundEnabled
                ? `linear-gradient(135deg, ${template.accentColor}30, ${template.accentColor}10)`
                : 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.1))',
              border: soundEnabled
                ? `2px solid ${template.accentColor}50`
                : '2px solid rgba(239,68,68,0.5)',
              boxShadow: soundEnabled
                ? `0 0 20px ${template.accentColor}20`
                : '0 0 20px rgba(239,68,68,0.2)'
            }}
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? (
              <Volume2 size={24} style={{ color: template.accentColor }} />
            ) : (
              <VolumeX size={24} className="text-red-400" />
            )}
          </button>

          {/* Accelerated Mode Toggle */}
          <button
            onClick={toggleAcceleratedMode}
            className="p-4 rounded-xl transition-all hover:scale-105 relative"
            style={{
              background: acceleratedMode
                ? 'linear-gradient(135deg, rgba(249,115,22,0.4), rgba(249,115,22,0.2))'
                : `linear-gradient(135deg, ${template.accentColor}30, ${template.accentColor}10)`,
              border: acceleratedMode
                ? '2px solid rgba(249,115,22,0.6)'
                : `2px solid ${template.accentColor}50`,
              boxShadow: acceleratedMode
                ? '0 0 20px rgba(249,115,22,0.3)'
                : `0 0 20px ${template.accentColor}20`
            }}
            title={acceleratedMode ? `Accelerated Mode ON (${acceleratedTimerDuration}s timer)` : 'Enable Accelerated Mode'}
          >
            <FastForward
              size={24}
              className={acceleratedMode ? 'text-orange-400' : ''}
              style={{ color: acceleratedMode ? undefined : template.accentColor }}
            />
            {acceleratedMode && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Layout Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutPicker(!showLayoutPicker)}
              className="p-4 rounded-xl transition-all hover:scale-105"
              style={{
                background: selectedLayout !== 'classic'
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(139,92,246,0.2))'
                  : `linear-gradient(135deg, ${template.accentColor}30, ${template.accentColor}10)`,
                border: selectedLayout !== 'classic'
                  ? '2px solid rgba(139,92,246,0.6)'
                  : `2px solid ${template.accentColor}50`,
                boxShadow: selectedLayout !== 'classic'
                  ? '0 0 20px rgba(139,92,246,0.3)'
                  : `0 0 20px ${template.accentColor}20`
              }}
              title="Change Layout"
            >
              <Layout
                size={24}
                className={selectedLayout !== 'classic' ? 'text-purple-400' : ''}
                style={{ color: selectedLayout !== 'classic' ? undefined : template.accentColor }}
              />
            </button>
            {showLayoutPicker && (
              <div className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700 shadow-2xl p-3 z-50 min-w-[200px]">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">Select Layout</p>
                {[
                  { id: 'classic', name: 'Classic', desc: 'Default layout' },
                  { id: 'premium-broadcast', name: 'Premium Broadcast', desc: 'TV broadcast style' },
                  { id: 'fire', name: '🔥 Fire', desc: 'Dramatic fire theme' },
                  { id: 'city', name: '🌃 City', desc: 'Night city skyline' },
                ].map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => {
                      setSelectedLayout(layout.id as any);
                      setShowLayoutPicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors mb-1 ${
                      selectedLayout === layout.id
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-medium">{layout.name}</p>
                    <p className="text-xs text-slate-500">{layout.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sponsor Area - Extra Large, no box */}
          {showSponsors && (
            <div className="flex flex-col items-center">
              <p
                className="text-xs uppercase tracking-[0.3em] mb-3 font-semibold"
                style={{ color: `${template.accentColor}cc` }}
              >
                Powered By
              </p>
              {currentSponsor?.logo_url ? (
                <img
                  src={currentSponsor.logo_url}
                  alt={currentSponsor.name || 'Sponsor'}
                  className="h-28 md:h-36 max-w-[320px] object-contain transition-all duration-500"
                  style={{ filter: `drop-shadow(0 0 25px ${template.accentColor}80)` }}
                />
              ) : (
                <span className="text-lg" style={{ color: `${template.accentColor}80` }}>Your Sponsor</span>
              )}
              {currentSponsor?.name && (
                <p
                  className="text-base font-bold uppercase tracking-wider mt-3"
                  style={{ color: template.accentColor, textShadow: `0 0 15px ${template.accentColor}60` }}
                >
                  {currentSponsor.name}
                </p>
              )}
              {sponsors.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  {sponsors.map((_, idx) => (
                    <div
                      key={idx}
                      className="w-2.5 h-2.5 rounded-full transition-all"
                      style={{
                        background: idx === currentSponsorIndex ? template.accentColor : `${template.accentColor}40`,
                        boxShadow: idx === currentSponsorIndex ? `0 0 8px ${template.accentColor}` : 'none',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Break Screen when auction is paused */}
      {isAuctionPaused && tournament && (
        <BreakScreen
          tournament={tournament}
          theme="classic"
          accentColor={template.accentColor}
          onResume={() => setAuctionPaused(false)}
        />
      )}

      {/* New Player Screen - Only when players are available */}
      {!currentPlayer && !isAuctionPaused && tournament && tournament.status !== 'completed' && (availablePlayersCount === null || availablePlayersCount > 0) && (
        <ClassicIdleScreen
          tournament={tournament}
          accentColor={template.accentColor}
          onNewPlayer={handleNewPlayer}
          onClose={onClose}
          loading={loading}
        />
      )}

      {/* Resume Auction Screen - When no players available but auction not completed */}
      {!currentPlayer && !isAuctionPaused && tournament && tournament.status !== 'completed' && availablePlayersCount === 0 && (
        <AuctionResumeScreen
          tournament={tournament}
          lastPlayer={lastPlayer}
          lastStatus={lastStatus}
          lastTeam={lastTeam}
          lastPrice={lastPrice}
          availablePlayers={0}
          onNewPlayer={handleNewPlayer}
          onClose={onClose}
          loading={loading}
          theme="classic"
        />
      )}

      {/* Completion Screen - Only when admin marks tournament as completed */}
      {!currentPlayer && !isAuctionPaused && tournament && tournament.status === 'completed' && (
        <CompletionScreen
          tournament={tournament}
          stats={{
            totalPlayers: teams.reduce((sum, t) => sum + (t.player_count || 0), 0),
            totalSpent: teams.reduce((sum, t) => sum + (t.spent_points || 0), 0),
            teamsCount: teams.length,
          }}
          theme="classic"
          onClose={onClose}
        />
      )}

      {/* Main Content - Classic Layout */}
      <div className="relative z-10 flex-1 flex items-stretch">
        <div className="flex-1 flex items-stretch px-12 py-6 gap-8">
            {/* Left Side - Player Card */}
            <div className="flex-1 flex items-center justify-center pl-12">
              <ProPlayerCard
                player={currentPlayer}
                status={status}
                currentBid={currentBid}
                currentTeam={currentTeam ? teams.find(t => t.id === currentTeam.id) || currentTeam : null}
                accentColor={template.accentColor}
                teamBudget={teams[0]?.total_budget}
              />
            </div>

            {/* Right Side - Floating Bidding Team Display */}
            {currentTeam && status === 'bidding' && (
              <div className="w-[450px] flex items-center justify-center pr-12">
                {(() => {
                  const biddingTeam = teams.find(t => t.id === currentTeam.id) || currentTeam;
                  return (
                    <div className="flex flex-col items-center gap-4">
                      {/* Floating Team Logo with glow */}
                      <div
                        className="relative"
                        style={{
                          filter: `drop-shadow(0 0 40px ${template.accentColor}60) drop-shadow(0 0 80px ${template.accentColor}30)`
                        }}
                      >
                        {biddingTeam.logo_url ? (
                          <img
                            src={biddingTeam.logo_url}
                            alt={biddingTeam.name}
                            className="w-52 h-52 lg:w-60 lg:h-60 object-contain"
                          />
                        ) : (
                          <div
                            className="w-52 h-52 lg:w-60 lg:h-60 rounded-2xl flex items-center justify-center text-5xl font-black text-white"
                            style={{
                              background: `linear-gradient(135deg, ${template.accentColor}, ${template.accentColor}80)`,
                              boxShadow: `0 0 50px ${template.accentColor}60`
                            }}
                          >
                            {biddingTeam.short_name}
                          </div>
                        )}

                        {/* Pulsing ring around logo */}
                        <div
                          className="absolute inset-0 rounded-full animate-ping opacity-20"
                          style={{ border: `3px solid ${template.accentColor}` }}
                        />
                      </div>

                      {/* Team Name - styled bar */}
                      <div
                        className="relative px-8 py-3 rounded-l-full"
                        style={{
                          background: `linear-gradient(270deg, transparent, ${template.accentColor}20, ${template.accentColor}40)`,
                          borderRight: `4px solid ${template.accentColor}`
                        }}
                      >
                        <h3 className="text-2xl font-black text-white tracking-tight uppercase text-right">
                          {biddingTeam.name}
                        </h3>
                      </div>

                      {/* Stats bars */}
                      <div className="flex flex-col gap-3 w-full">
                        <div
                          className="relative px-6 py-3 rounded-l-full"
                          style={{
                            background: `linear-gradient(270deg, transparent, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.3))`,
                            borderRight: `4px solid #22c55e`
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/70 uppercase tracking-wider">Remaining</span>
                            <span className="text-xl font-black text-emerald-400">
                              {biddingTeam.remaining_budget?.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div
                          className="relative px-6 py-3 rounded-l-full"
                          style={{
                            background: `linear-gradient(270deg, transparent, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.3))`,
                            borderRight: `4px solid #06b6d4`
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/70 uppercase tracking-wider">Players</span>
                            <span className="text-xl font-black text-cyan-400">
                              {biddingTeam.player_count || 0}
                            </span>
                          </div>
                        </div>

                        <div
                          className="relative px-6 py-3 rounded-l-full"
                          style={{
                            background: `linear-gradient(270deg, transparent, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.3))`,
                            borderRight: `4px solid #f59e0b`
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/70 uppercase tracking-wider">Max Bid</span>
                            <span className="text-xl font-black text-amber-400">
                              {biddingTeam.max_bid?.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="relative z-10 px-6 pb-4">
        <div className="relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
          {/* Accent top border */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, ${template.accentColor}, ${template.accentColor}80, ${template.accentColor})` }}
          />

          <div className="relative z-10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: New Player & Role Filter & Search */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleNewPlayer}
                  disabled={loading || status === 'bidding'}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  style={{
                    background: `linear-gradient(135deg, ${template.accentColor}, ${template.accentColor}cc)`
                  }}
                >
                  <UserPlus size={18} />
                  <span>New Player</span>
                </button>

                <RoleFilterDropdown disabled={status === 'bidding'} />

                {showSearch ? (
                  <form onSubmit={handleSearchPlayer} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value.toUpperCase())}
                      placeholder="P001"
                      className="w-20 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-center focus:border-white/40 transition-all"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-colors"
                    >
                      <Search size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSearch(false)}
                      className="text-white/60 hover:text-white p-2"
                    >
                      <X size={18} />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowSearch(true)}
                    className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-colors"
                    title="Search by Player ID"
                  >
                    <Search size={18} />
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
                />
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSold}
                  disabled={!currentTeam || status !== 'bidding' || soldLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {soldLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  <span>{soldLoading ? 'Saving...' : 'Sold'}</span>
                </button>

                <button
                  onClick={handleUnsold}
                  disabled={!currentPlayer || status !== 'bidding' || unsoldLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {unsoldLoading ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                  <span>{unsoldLoading ? 'Saving...' : 'Unsold'}</span>
                </button>

                <button
                  onClick={handleUndo}
                  disabled={!lastAction || undoLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title={lastAction ? `Undo ${lastAction.type} for ${lastAction.player.name}` : 'No action to undo'}
                >
                  {undoLoading ? <Loader2 size={18} className="animate-spin" /> : <Undo2 size={18} />}
                  <span>{undoLoading ? 'Undoing...' : 'Undo'}</span>
                </button>

                <button
                  onClick={handleNewPlayer}
                  disabled={status !== 'sold' && status !== 'unsold' && status !== 'idle'}
                  className="bg-amber-600/80 hover:bg-amber-500 disabled:bg-white/10 disabled:text-white/30 text-white p-2.5 rounded-xl transition-all disabled:cursor-not-allowed"
                  title="Next Player (Random)"
                >
                  <RotateCcw size={18} />
                </button>

                <button
                  onClick={handleOpenFortuneWheel}
                  disabled={status !== 'sold' && status !== 'unsold' && status !== 'idle'}
                  className="disabled:bg-white/10 disabled:text-white/30 text-white p-2.5 rounded-xl transition-all disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    background: status === 'sold' || status === 'unsold' || status === 'idle'
                      ? `linear-gradient(135deg, ${template.accentColor}, ${template.accentColor}cc)`
                      : undefined,
                    boxShadow: status === 'sold' || status === 'unsold' || status === 'idle'
                      ? `0 0 15px ${template.accentColor}40`
                      : undefined
                  }}
                  title="Fortune Wheel"
                >
                  <Disc size={18} />
                </button>

                {/* Pause/Break Button */}
                <button
                  onClick={() => setAuctionPaused(true)}
                  disabled={status === 'bidding'}
                  className="disabled:bg-white/10 disabled:text-white/30 text-white p-2.5 rounded-xl transition-all disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    background: status !== 'bidding'
                      ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                      : undefined,
                    boxShadow: status !== 'bidding'
                      ? '0 0 15px rgba(139,92,246,0.4)'
                      : undefined
                  }}
                  title="Take a Break"
                >
                  <Pause size={18} />
                </button>
              </div>
            </div>

            {/* Keyboard Hints */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
                <span className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono text-white/70">UP</kbd>
                  <span>Increment bid</span>
                </span>
                <span className="flex items-center gap-2">
                  <Zap size={14} style={{ color: template.accentColor }} />
                  <span>Team shortcuts shown on hover</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fortune Wheel Modal */}
      {showFortuneWheel && (
        <FortuneWheel
          players={availablePlayers}
          onSelect={handleFortuneWheelSelect}
          onClose={() => setShowFortuneWheel(false)}
          accentColor={template.accentColor}
        />
      )}

      {/* Player Entry Animation */}
      {showPlayerEntry && entryPlayer && (
        <PlayerEntryAnimation
          player={entryPlayer}
          onComplete={handlePlayerEntryComplete}
          accentColor={template.accentColor}
          tournament={tournament || undefined}
        />
      )}

      {/* Budget Alerts - only show when a team with low budget places a bid */}
      <BudgetAlerts
        teams={teams}
        totalBudget={tournament?.total_points || 100000}
        currentBiddingTeam={currentTeam}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]">
          <div
            className={`
              relative px-8 py-6 rounded-2xl shadow-2xl backdrop-blur-md
              border-2 min-w-[320px] max-w-md
              animate-bounce-in
              ${toast.type === 'error'
                ? 'bg-gradient-to-br from-red-900/95 to-red-800/95 border-red-500'
                : 'bg-gradient-to-br from-amber-900/95 to-amber-800/95 border-amber-500'
              }
            `}
          >
            {/* Close button */}
            <button
              onClick={() => setToast(null)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={18} className="text-white/70" />
            </button>

            <div className="flex items-center gap-4">
              {/* Team Logo */}
              {toast.team?.logo_url ? (
                <div className="w-16 h-16 rounded-xl bg-white/10 p-2 flex-shrink-0">
                  <img
                    src={toast.team.logo_url}
                    alt={toast.team.short_name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  toast.type === 'error' ? 'bg-red-500/30' : 'bg-amber-500/30'
                }`}>
                  <X size={32} className={toast.type === 'error' ? 'text-red-400' : 'text-amber-400'} />
                </div>
              )}

              {/* Content */}
              <div className="flex-1">
                {toast.team && (
                  <p className="text-white/60 text-sm font-medium mb-1">
                    {toast.team.short_name}
                  </p>
                )}
                <p className="text-white text-lg font-bold">
                  {toast.message}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
              <div
                className={`h-full ${toast.type === 'error' ? 'bg-red-400' : 'bg-amber-400'}`}
                style={{
                  animation: 'shrinkWidth 4s linear forwards'
                }}
              />
            </div>
          </div>

          <style>{`
            @keyframes bounceIn {
              0% { transform: scale(0.5); opacity: 0; }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes shrinkWidth {
              from { width: 100%; }
              to { width: 0%; }
            }
            .animate-bounce-in {
              animation: bounceIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
