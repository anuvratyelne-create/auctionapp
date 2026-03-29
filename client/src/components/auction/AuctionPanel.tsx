import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuctionStore } from '../../stores/auctionStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { socketClient } from '../../socket/client';
import { api } from '../../utils/api';
import { Team, Player } from '../../types';
import PlayerCard from './PlayerCard';
import BidDisplay from './BidDisplay';
import TeamButtons from './TeamButtons';
import AuctionTimer from './AuctionTimer';
import SoldCelebration from './SoldCelebration';
import { UserPlus, Check, X, RotateCcw, Search, Zap } from 'lucide-react';

// Dynamic bid increment based on current bid amount
function getBidIncrement(currentBid: number): number {
  if (currentBid >= 50000) return 5000;
  if (currentBid >= 30000) return 3000;
  if (currentBid >= 20000) return 2000;
  return 1000;
}

export default function AuctionPanel() {
  const { tournament } = useAuthStore();
  const { timerDuration } = useUIStore();
  const {
    currentPlayer,
    currentBid,
    currentTeam,
    status,
    selectedCategoryId,
    setAuctionState,
  } = useAuctionStore();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const timerResetKey = useRef(0);
  const previousBidRef = useRef(currentBid);
  const previousStatusRef = useRef(status);

  useEffect(() => {
    loadTeams();
    loadAuctionState();

    // Listen for team updates via socket
    socketClient.onTeamsUpdated(() => {
      loadTeams();
    });

    return () => {
      socketClient.off('teams:updated');
    };
  }, []);

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

  const loadTeams = async () => {
    try {
      const data = await api.getTeams() as Team[];
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

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
      const player = await api.getNextPlayer(selectedCategoryId || undefined) as any;
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
    } catch (error: any) {
      alert(error.message || 'No available players');
    } finally {
      setLoading(false);
    }
  };

  const handleTimerUp = useCallback(() => {
    // Auto-action when timer expires - could mark unsold if no bids
    console.log('Timer expired');
  }, []);

  const handleTeamBid = useCallback(async (team: Team) => {
    if (!currentPlayer || status !== 'bidding') return;

    const increment = getBidIncrement(currentBid);
    const newBid = currentTeam
      ? currentBid + increment
      : currentPlayer.base_price;

    if (newBid > team.max_bid) {
      alert(`${team.short_name} cannot afford this bid. Max bid: ${team.max_bid.toLocaleString()}`);
      return;
    }

    try {
      await api.placeBid(team.id, newBid);
      loadTeams();
    } catch (error: any) {
      alert(error.message || 'Failed to place bid');
    }
  }, [currentPlayer, currentBid, currentTeam, status]);

  const handleIncrementBid = useCallback(async () => {
    if (!currentPlayer || status !== 'bidding') return;

    const increment = getBidIncrement(currentBid);
    try {
      await api.incrementBid(currentBid + increment);
    } catch (error: any) {
      console.error('Failed to increment bid:', error);
    }
  }, [currentPlayer, currentBid, status]);

  const handleSold = async () => {
    if (!currentPlayer || !currentTeam) {
      alert('Please place a bid first');
      return;
    }

    try {
      await api.markSold();
      loadTeams();
    } catch (error: any) {
      alert(error.message || 'Failed to mark as sold');
    }
  };

  const handleUnsold = async () => {
    if (!currentPlayer) return;

    try {
      await api.markUnsold();
    } catch (error: any) {
      alert(error.message || 'Failed to mark as unsold');
    }
  };

  const handleSearchPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerSearch.trim()) return;

    try {
      const player = await api.searchPlayerByNumber(playerSearch) as Player;
      await api.getPlayerForAuction(player.id);
      setPlayerSearch('');
      setShowSearch(false);
    } catch (error: any) {
      alert('Player not found');
    }
  };

  useKeyboardShortcuts({
    teams,
    onTeamBid: handleTeamBid,
    onIncrementBid: handleIncrementBid,
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
                {/* Left: New Player & Search */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleNewPlayer}
                    disabled={loading || status === 'bidding'}
                    className="relative group flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-purple-600 group-hover:from-primary-500 group-hover:to-purple-500 transition-all" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <UserPlus size={20} className="relative text-white" />
                    <span className="relative text-white">New Player</span>
                  </button>

                  {showSearch ? (
                    <form onSubmit={handleSearchPlayer} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        placeholder="Jersey #"
                        className="w-24 bg-slate-800/80 border border-slate-600/50 rounded-xl px-3 py-2.5 text-white text-center focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-slate-700/80 hover:bg-slate-600 text-white p-2.5 rounded-xl transition-colors"
                      >
                        <Search size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSearch(false)}
                        className="text-slate-400 hover:text-white p-2"
                      >
                        <X size={20} />
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowSearch(true)}
                      className="flex items-center gap-2 bg-slate-700/80 hover:bg-slate-600 text-white p-3 rounded-xl transition-colors"
                      title="Search by jersey number"
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
                  />
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSold}
                    disabled={!currentTeam || status !== 'bidding'}
                    className="relative group flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 group-hover:from-emerald-500 group-hover:to-green-500 transition-all" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <Check size={20} className="relative text-white" />
                    <span className="relative text-white">Sold</span>
                  </button>

                  <button
                    onClick={handleUnsold}
                    disabled={!currentPlayer || status !== 'bidding'}
                    className="relative group flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-600 group-hover:from-red-500 group-hover:to-rose-500 transition-all" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <X size={20} className="relative text-white" />
                    <span className="relative text-white">Unsold</span>
                  </button>

                  <button
                    onClick={handleNewPlayer}
                    disabled={status !== 'sold' && status !== 'unsold'}
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
