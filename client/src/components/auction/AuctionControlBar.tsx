import { memo, useState } from 'react';
import { Team, Player } from '../../types';
import TeamButtons from './TeamButtons';
import RoleFilterDropdown from './RoleFilterDropdown';
import { UserPlus, Check, X, Search, Disc, Undo2, Pause, Layout } from 'lucide-react';

export type ControlBarTheme = 'premium' | 'fire' | 'city' | 'classic';

interface AuctionControlBarProps {
  teams: Team[];
  currentTeam: Team | null;
  currentPlayer: Player | null;
  status: 'idle' | 'bidding' | 'sold' | 'unsold';
  loading: boolean;
  lastAction: { player: Player; type: 'sold' | 'unsold' } | null;
  theme: ControlBarTheme;
  onNewPlayer: () => void;
  onTeamBid: (team: Team) => void;
  onSold: () => void;
  onUnsold: () => void;
  onUndo: () => void;
  onOpenFortuneWheel: () => void;
  onSearchPlayer: (uid: string) => void;
  onPause: () => void;
  onLayoutChange: (layout: string) => void;
  targetLayout?: string; // Layout to switch to when clicking layout button
}

// Theme-specific styles
const themeStyles: Record<ControlBarTheme, {
  container: string;
  primaryButton: string;
  secondaryButton: string;
  soldButton: string;
  unsoldButton: string;
  undoButton: string;
  pauseButton: string;
  layoutButton: string;
  input: string;
}> = {
  premium: {
    container: 'bg-gradient-to-t from-black/90 via-black/70 to-transparent',
    primaryButton: 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white',
    secondaryButton: 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 border border-primary-500/30',
    soldButton: 'bg-gradient-to-r from-emerald-600 to-green-600 text-white',
    unsoldButton: 'bg-gradient-to-r from-red-600 to-rose-600 text-white',
    undoButton: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white',
    pauseButton: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30',
    layoutButton: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30',
    input: 'bg-primary-500/10 border-primary-500/40 text-primary-400 focus:border-primary-400',
  },
  fire: {
    container: 'bg-gradient-to-t from-black/90 via-black/70 to-transparent',
    primaryButton: 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white',
    secondaryButton: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30',
    soldButton: 'bg-gradient-to-r from-emerald-600 to-green-600 text-white',
    unsoldButton: 'bg-gradient-to-r from-red-600 to-rose-600 text-white',
    undoButton: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white',
    pauseButton: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30',
    layoutButton: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30',
    input: 'bg-orange-500/10 border-orange-500/40 text-orange-400 focus:border-orange-400',
  },
  city: {
    container: 'bg-gradient-to-t from-black/90 via-black/70 to-transparent',
    primaryButton: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white',
    secondaryButton: 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30',
    soldButton: 'bg-gradient-to-r from-emerald-600 to-green-600 text-white',
    unsoldButton: 'bg-gradient-to-r from-red-600 to-rose-600 text-white',
    undoButton: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white',
    pauseButton: 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30',
    layoutButton: 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30',
    input: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 focus:border-cyan-400',
  },
  classic: {
    container: 'bg-gradient-to-t from-black/90 via-black/70 to-transparent',
    primaryButton: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black',
    secondaryButton: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30',
    soldButton: 'bg-gradient-to-r from-emerald-600 to-green-600 text-white',
    unsoldButton: 'bg-gradient-to-r from-red-600 to-rose-600 text-white',
    undoButton: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white',
    pauseButton: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30',
    layoutButton: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30',
    input: 'bg-amber-500/10 border-amber-500/40 text-amber-400 focus:border-amber-400',
  },
};

function AuctionControlBar({
  teams,
  currentTeam,
  currentPlayer,
  status,
  loading,
  lastAction,
  theme,
  onNewPlayer,
  onTeamBid,
  onSold,
  onUnsold,
  onUndo,
  onOpenFortuneWheel,
  onSearchPlayer,
  onPause,
  onLayoutChange,
  targetLayout = 'classic',
}: AuctionControlBarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');

  const styles = themeStyles[theme];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerSearch.trim()) {
      onSearchPlayer(playerSearch);
      setPlayerSearch('');
      setShowSearch(false);
    }
  };

  return (
    <div className={`absolute bottom-16 left-0 right-0 z-40 ${styles.container} pt-8 pb-4 px-6`}>
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Left: New Player + Role Filter + Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNewPlayer}
            disabled={loading || status === 'bidding'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold ${styles.primaryButton} transition-all disabled:opacity-50`}
          >
            <UserPlus size={18} />
            New Player
          </button>
          <RoleFilterDropdown disabled={status === 'bidding'} theme={theme} />
          <button
            onClick={onOpenFortuneWheel}
            disabled={status === 'bidding'}
            className={`p-2.5 rounded-xl ${styles.secondaryButton} transition-colors disabled:opacity-50`}
            title="Fortune Wheel"
          >
            <Disc size={18} />
          </button>

          {/* Search by Player ID */}
          {showSearch ? (
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value.toUpperCase())}
                placeholder="P001"
                className={`w-20 border rounded-xl px-3 py-2 text-center transition-all font-mono ${styles.input}`}
                autoFocus
              />
              <button
                type="submit"
                className={`p-2.5 rounded-xl ${styles.secondaryButton} transition-colors`}
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
              disabled={status === 'bidding'}
              className={`p-2.5 rounded-xl ${styles.secondaryButton} transition-colors disabled:opacity-50`}
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
            onTeamBid={onTeamBid}
            currentTeamId={currentTeam?.id}
            disabled={status !== 'bidding'}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSold}
            disabled={!currentTeam || status !== 'bidding'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold ${styles.soldButton} transition-all disabled:opacity-40`}
          >
            <Check size={18} />
            Sold
          </button>
          <button
            onClick={onUnsold}
            disabled={!currentPlayer || status !== 'bidding'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold ${styles.unsoldButton} transition-all disabled:opacity-40`}
          >
            <X size={18} />
            Unsold
          </button>
          <button
            onClick={onUndo}
            disabled={!lastAction}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold ${styles.undoButton} transition-all disabled:opacity-40`}
            title={lastAction ? `Undo ${lastAction.type} for ${lastAction.player.name}` : 'No action to undo'}
          >
            <Undo2 size={18} />
            Undo
          </button>
          {/* Pause/Break Button */}
          <button
            onClick={onPause}
            disabled={status === 'bidding'}
            className={`p-2.5 rounded-xl ${styles.pauseButton} transition-colors disabled:opacity-40`}
            title="Take a Break"
          >
            <Pause size={18} />
          </button>
          {/* Layout Toggle */}
          <button
            onClick={() => onLayoutChange(targetLayout)}
            className={`p-2.5 rounded-xl ${styles.layoutButton} transition-colors`}
            title={`Switch to ${targetLayout} Layout`}
          >
            <Layout size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent re-renders
export default memo(AuctionControlBar);
