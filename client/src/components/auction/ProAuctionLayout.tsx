import { useState, useEffect, useCallback, useRef } from 'react';
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
import { PremiumBroadcastLayout, FireBroadcastLayout } from './layouts';
import PremiumPlayerEntry from './layouts/PremiumPlayerEntry';
import FirePlayerEntry from './FirePlayerEntry';
import FireSoldAnimation from './FireSoldAnimation';
import { UserPlus, Check, X, RotateCcw, Search, Zap, Volume2, VolumeX, Disc, FastForward, Layout } from 'lucide-react';

// Dynamic bid increment based on current bid amount
function getBidIncrement(currentBid: number): number {
  if (currentBid >= 50000) return 5000;
  if (currentBid >= 30000) return 3000;
  if (currentBid >= 20000) return 2000;
  return 1000;
}

export default function ProAuctionLayout() {
  const { tournament } = useAuthStore();
  const { selectedThemeId, selectedLayout, setSelectedLayout, showTemplateSelector, toggleTemplateSelector, soundEnabled, toggleSound, timerDuration, acceleratedMode, acceleratedTimerDuration, toggleAcceleratedMode } = useUIStore();
  const template = getTemplate(selectedThemeId);
  const {
    currentPlayer,
    currentBid,
    currentTeam,
    status,
    setAuctionState,
  } = useAuctionStore();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
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
  const timerResetKey = useRef(0);
  const previousBidRef = useRef(currentBid);
  const previousStatusRef = useRef(status);

  useEffect(() => {
    if (!tournament?.id) return;

    // Connect to socket and join tournament room
    socketClient.connect(tournament.id);

    loadTeams();
    loadAuctionState();

    // Listen for auction state updates from server
    socketClient.onAuctionState((state) => {
      setAuctionState(state);
    });

    socketClient.onTeamsUpdated(() => {
      loadTeams();
    });

    socketClient.onPlayersUpdated(() => {
      // Refresh players if needed
    });

    return () => {
      socketClient.removeAllListeners();
    };
  }, [tournament?.id, setAuctionState]);

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

  useEffect(() => {
    // Play sounds and show celebration on status change
    if (status === 'sold' && previousStatusRef.current !== 'sold') {
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
  }, [status, currentPlayer, currentTeam, currentBid]);

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
      // Get next player (no category filter - fetch from all categories)
      const player = await api.getNextPlayer() as any;
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
      alert(error.message || 'No available players');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFortuneWheel = async () => {
    try {
      // Fetch ALL available players for the wheel (no category filter)
      const players = await api.getPlayers('available') as Player[];
      if (!players || players.length === 0) {
        alert('No available players for the Fortune Wheel');
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
    console.log('Timer expired');
  }, []);

  const handleTeamBid = useCallback(async (team: Team) => {
    if (!currentPlayer || status !== 'bidding') return;

    const increment = getBidIncrement(currentBid);
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

    try {
      await api.placeBid(team.id, newBid);
      loadTeams();
    } catch (error: any) {
      setToast({
        message: error.message || 'Failed to place bid',
        team,
        type: 'error'
      });
      setTimeout(() => setToast(null), 4000);
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

  // Premium Broadcast Layout
  if (selectedLayout === 'premium-broadcast') {
    return (
      <div className="relative min-h-screen h-screen flex flex-col overflow-hidden">
        {/* Premium Broadcast Display */}
        <div className="flex-1 relative">
          <PremiumBroadcastLayout
            tournament={tournament}
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            currentTeam={currentTeam}
            teams={teams}
            status={status}
            timerSeconds={acceleratedMode ? acceleratedTimerDuration : timerDuration}
            timerKey={timerResetKey.current}
          />
        </div>

        {/* Control Bar Overlay - positioned above bottom nav */}
        <div className="absolute bottom-16 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-8 pb-4 px-6">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            {/* Left: New Player + Search */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewPlayer}
                disabled={loading || status === 'bidding'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white transition-all disabled:opacity-50"
              >
                <UserPlus size={18} />
                New Player
              </button>
              <button
                onClick={handleOpenFortuneWheel}
                disabled={status === 'bidding'}
                className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors border border-amber-500/30 disabled:opacity-50"
                title="Fortune Wheel"
              >
                <Disc size={18} />
              </button>
            </div>

            {/* Center: Teams */}
            <div className="flex-1 flex justify-center">
              <TeamButtons
                teams={teams}
                onTeamBid={handleTeamBid}
                currentTeamId={currentTeam?.id}
                disabled={status !== 'bidding'}
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
            onComplete={() => {
              setShowSoldAnimation(false);
              setSoldAnimationData(null);
            }}
          />
        )}

        {/* Budget Alerts */}
        <BudgetAlerts teams={teams} totalBudget={tournament?.total_points || 100000} />

        {/* Premium Player Entry Animation */}
        {showPlayerEntry && entryPlayer && (
          <PremiumPlayerEntry
            player={entryPlayer}
            onComplete={() => {
              setShowPlayerEntry(false);
              setEntryPlayer(null);
            }}
          />
        )}
      </div>
    );
  }

  // Fire Layout
  if (selectedLayout === 'fire') {
    return (
      <div className="relative min-h-screen h-screen flex flex-col overflow-hidden">
        {/* Fire Broadcast Display */}
        <div className="flex-1 relative">
          <FireBroadcastLayout
            tournament={tournament}
            currentPlayer={currentPlayer}
            currentBid={currentBid}
            currentTeam={currentTeam}
            teams={teams}
            status={status}
            timerSeconds={acceleratedMode ? acceleratedTimerDuration : timerDuration}
            timerKey={timerResetKey.current}
          />
        </div>

        {/* Control Bar Overlay - Fire themed */}
        <div className="absolute bottom-16 left-0 right-0 z-50 pt-8 pb-4 px-6"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(20,5,5,0.8), transparent)',
          }}
        >
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            {/* Left: New Player + Fortune Wheel - Fire styled */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewPlayer}
                disabled={loading || status === 'bidding'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 hover:scale-105 border border-orange-500/40"
                style={{
                  background: 'linear-gradient(135deg, #c2410c, #991b1b)',
                  boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)',
                }}
              >
                <UserPlus size={18} />
                New Player
              </button>
              <button
                onClick={handleOpenFortuneWheel}
                disabled={status === 'bidding'}
                className="p-2.5 rounded-xl text-orange-400 hover:scale-105 transition-all disabled:opacity-50 border border-orange-500/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(194,65,12,0.3), rgba(153,27,27,0.2))',
                }}
                title="Fortune Wheel"
              >
                <Disc size={18} />
              </button>
            </div>

            {/* Center: Teams - Fire themed */}
            <div className="flex-1 flex justify-center">
              <TeamButtons
                teams={teams}
                onTeamBid={handleTeamBid}
                currentTeamId={currentTeam?.id}
                disabled={status !== 'bidding'}
                theme="fire"
              />
            </div>

            {/* Right: Actions - Fire styled */}
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
              {/* Layout Toggle */}
              <button
                onClick={() => setSelectedLayout('classic')}
                className="p-2.5 rounded-xl text-orange-400 hover:scale-105 transition-all border border-orange-500/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(194,65,12,0.3), rgba(153,27,27,0.2))',
                }}
                title="Switch to Classic Layout"
              >
                <Layout size={18} />
              </button>
            </div>
          </div>
        </div>

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
            onComplete={() => {
              setShowSoldAnimation(false);
              setSoldAnimationData(null);
            }}
          />
        )}

        {/* Budget Alerts */}
        <BudgetAlerts teams={teams} totalBudget={tournament?.total_points || 100000} />

        {/* Fire Player Entry Animation */}
        {showPlayerEntry && entryPlayer && (
          <FirePlayerEntry
            player={entryPlayer}
            onComplete={() => {
              setShowPlayerEntry(false);
              setEntryPlayer(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen h-screen flex flex-col overflow-hidden bg-slate-950">
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
            onComplete={() => {
              setShowSoldAnimation(false);
              setSoldAnimationData(null);
            }}
          />
        ) : (
          <SoldPlayerAnimation
            player={soldAnimationData.player}
            team={soldAnimationData.team}
            soldPrice={soldAnimationData.price}
            teamColor={template.accentColor}
            onComplete={() => {
              setShowSoldAnimation(false);
              setSoldAnimationData(null);
            }}
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

          {/* Sponsor Area - Larger for projector */}
          <div
            className="rounded-2xl px-6 py-4 min-w-[180px] text-center"
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`,
              border: `2px solid ${template.accentColor}30`,
              boxShadow: `0 0 30px ${template.accentColor}10`
            }}
          >
            <p
              className="text-xs uppercase tracking-widest font-medium mb-2"
              style={{ color: `${template.accentColor}` }}
            >
              Powered By
            </p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-white/50 text-sm font-medium">Your Logo</span>
            </div>
          </div>
        </div>
      </div>

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
              />
            </div>

            {/* Right Side - Floating Bidding Team Display */}
            {currentTeam && status === 'bidding' && (
              <div className="w-96 flex items-center justify-center pr-12">
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
                            className="w-36 h-36 object-contain"
                          />
                        ) : (
                          <div
                            className="w-36 h-36 rounded-2xl flex items-center justify-center text-4xl font-black text-white"
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
              {/* Left: New Player & Search */}
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

                {showSearch ? (
                  <form onSubmit={handleSearchPlayer} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Jersey #"
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
                    title="Search by jersey number"
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
                  disabled={!currentTeam || status !== 'bidding'}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check size={18} />
                  <span>Sold</span>
                </button>

                <button
                  onClick={handleUnsold}
                  disabled={!currentPlayer || status !== 'bidding'}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X size={18} />
                  <span>Unsold</span>
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
          onComplete={() => {
            setShowPlayerEntry(false);
            setEntryPlayer(null);
          }}
          accentColor={template.accentColor}
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
