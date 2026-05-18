import { memo, ReactNode } from 'react';
import { Tournament, Team, Player } from '../../types';
import { X } from 'lucide-react';
import SoldCelebration from './SoldCelebration';
import SoldPlayerAnimation from './SoldPlayerAnimation';
import FortuneWheel from './FortuneWheel';
import BudgetAlerts from '../common/BudgetAlerts';
import { BreakScreen } from './layouts';
import AuctionControlBar, { ControlBarTheme } from './AuctionControlBar';

interface SoldAnimationData {
  player: Player;
  team: Team;
  price: number;
}

interface AuctionLayoutWrapperProps {
  // Core data
  tournament: Tournament | null;
  teams: Team[];
  currentPlayer: Player | null;
  currentTeam: Team | null;
  currentBid: number;
  status: 'idle' | 'bidding' | 'sold' | 'unsold';
  loading: boolean;

  // UI state
  isAuctionPaused: boolean;
  showFortuneWheel: boolean;
  showCelebration: boolean;
  showSoldAnimation: boolean;
  soldAnimationData: SoldAnimationData | null;
  availablePlayers: Player[];
  lastAction: { player: Player; type: 'sold' | 'unsold' } | null;

  // Theme
  theme: ControlBarTheme;
  accentColor: string;
  targetLayout?: string;

  // Handlers
  onClose?: () => void;
  onNewPlayer: () => void;
  onTeamBid: (team: Team) => void;
  onSold: () => void;
  onUnsold: () => void;
  onUndo: () => void;
  onOpenFortuneWheel: () => void;
  onFortuneWheelSelect: (player: Player) => void;
  onFortuneWheelClose: () => void;
  onSearchPlayer: (uid: string) => void;
  onPause: () => void;
  onResume: () => void;
  onLayoutChange: (layout: string) => void;
  onSoldAnimationComplete: () => void;

  // Custom elements
  children: ReactNode; // The main layout content
  playerEntryAnimation?: ReactNode; // Layout-specific entry animation
}

function AuctionLayoutWrapper({
  tournament,
  teams,
  currentPlayer,
  currentTeam,
  status,
  loading,
  isAuctionPaused,
  showFortuneWheel,
  showCelebration,
  showSoldAnimation,
  soldAnimationData,
  availablePlayers,
  lastAction,
  theme,
  accentColor,
  targetLayout = 'classic',
  onClose,
  onNewPlayer,
  onTeamBid,
  onSold,
  onUnsold,
  onUndo,
  onOpenFortuneWheel,
  onFortuneWheelSelect,
  onFortuneWheelClose,
  onSearchPlayer,
  onPause,
  onResume,
  onLayoutChange,
  onSoldAnimationComplete,
  children,
  playerEntryAnimation,
}: AuctionLayoutWrapperProps) {
  const breakTheme = theme === 'fire' ? 'fire' : theme === 'city' ? 'city' : 'premium';

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
          theme={breakTheme}
          onResume={onResume}
        />
      )}

      {/* Main Layout Content */}
      <div className="flex-1 relative">
        {children}
      </div>

      {/* Control Bar Overlay - positioned above bottom nav (hidden when paused or idle) */}
      {!isAuctionPaused && currentPlayer && (
        <AuctionControlBar
          teams={teams}
          currentTeam={currentTeam}
          currentPlayer={currentPlayer}
          status={status}
          loading={loading}
          lastAction={lastAction}
          theme={theme}
          onNewPlayer={onNewPlayer}
          onTeamBid={onTeamBid}
          onSold={onSold}
          onUnsold={onUnsold}
          onUndo={onUndo}
          onOpenFortuneWheel={onOpenFortuneWheel}
          onSearchPlayer={onSearchPlayer}
          onPause={onPause}
          onLayoutChange={onLayoutChange}
          targetLayout={targetLayout}
        />
      )}

      {/* Fortune Wheel Modal */}
      {showFortuneWheel && (
        <FortuneWheel
          players={availablePlayers}
          onSelect={onFortuneWheelSelect}
          onClose={onFortuneWheelClose}
        />
      )}

      {/* Sold Celebration */}
      {showCelebration && currentTeam && (
        <SoldCelebration isActive={showCelebration} teamColor={accentColor} />
      )}

      {/* Sold Player Animation */}
      {showSoldAnimation && soldAnimationData && (
        <SoldPlayerAnimation
          player={soldAnimationData.player}
          team={soldAnimationData.team}
          soldPrice={soldAnimationData.price}
          teamColor={accentColor}
          onComplete={onSoldAnimationComplete}
        />
      )}

      {/* Budget Alerts */}
      <BudgetAlerts teams={teams} totalBudget={tournament?.total_points || 100000} />

      {/* Player Entry Animation (layout-specific) */}
      {playerEntryAnimation}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(AuctionLayoutWrapper);
