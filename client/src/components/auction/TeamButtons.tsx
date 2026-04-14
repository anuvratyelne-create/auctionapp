import { useState, useRef } from 'react';
import { Team } from '../../types';
import { formatIndianNumber } from '../../utils/formatters';
import TeamPreviewPopover from './TeamPreviewPopover';

interface TeamButtonsProps {
  teams: Team[];
  onTeamBid: (team: Team) => void;
  currentTeamId?: string;
  disabled?: boolean;
  theme?: 'default' | 'fire' | 'premium';
}

export default function TeamButtons({
  teams,
  onTeamBid,
  currentTeamId,
  disabled,
  theme = 'default',
}: TeamButtonsProps) {
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (teamId: string) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Delay showing popover slightly to prevent flickering
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTeamId(teamId);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredTeamId(null);
  };

  if (teams.length === 0) {
    return (
      <p className="text-slate-500 text-sm">
        No teams available. Add teams in the Manage panel.
      </p>
    );
  }

  // Split teams into two rows for better visual balance
  const midPoint = Math.ceil(teams.length / 2);
  const topRow = teams.slice(0, midPoint);
  const bottomRow = teams.slice(midPoint);

  const renderTeamButton = (team: Team, isTopRow: boolean) => {
    const isCurrentBidder = currentTeamId === team.id;
    const isButtonDisabled = disabled || isCurrentBidder;
    const capacityColor = (team.max_bid || 0) > 10000
      ? 'bg-emerald-500'
      : (team.max_bid || 0) > 5000
      ? 'bg-amber-500'
      : 'bg-red-500';

    const isHovered = hoveredTeamId === team.id;

    // Theme-specific styles
    const getButtonStyles = () => {
      if (theme === 'fire') {
        return isCurrentBidder
          ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white ring-2 ring-orange-400/50 ring-offset-2 ring-offset-black scale-105'
          : 'bg-gradient-to-r from-orange-900/60 to-red-900/40 text-orange-100 hover:from-orange-800/80 hover:to-red-800/60 hover:scale-105 border border-orange-500/30 hover:border-orange-400/50';
      }
      if (theme === 'premium') {
        return isCurrentBidder
          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-slate-900 scale-105'
          : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:scale-105 border border-cyan-500/30 hover:border-cyan-400/50';
      }
      // Default theme
      return isCurrentBidder
        ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white ring-2 ring-primary-400/50 ring-offset-2 ring-offset-slate-900 scale-105 shadow-glow-sm'
        : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:scale-105 border border-slate-700/50 hover:border-slate-600';
    };

    return (
      <div
        key={team.id}
        className="relative"
        onMouseEnter={() => handleMouseEnter(team.id)}
        onMouseLeave={handleMouseLeave}
      >
        <button
          onClick={() => {
            if (!isCurrentBidder) {
              onTeamBid(team);
            }
          }}
          disabled={isButtonDisabled}
          className={`
            group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200
            ${getButtonStyles()}
            ${isButtonDisabled && !isCurrentBidder ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={theme === 'fire' && isCurrentBidder ? { boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)' } : undefined}
          title={
            isCurrentBidder
              ? `${team.name} - Current bidder`
              : `${team.name} - Max: ${formatIndianNumber(team.max_bid)}`
          }
        >
        {/* Team Logo */}
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt={team.short_name}
            className="w-7 h-7 object-contain"
          />
        ) : (
          <div className="w-7 h-7 bg-slate-600 rounded-lg flex items-center justify-center text-xs font-bold">
            {team.short_name.charAt(0)}
          </div>
        )}

        {/* Team Name */}
        <span className="font-bold">{team.short_name}</span>

        {/* Capacity Indicator Dot */}
        <span
          className={`w-2.5 h-2.5 rounded-full ${capacityColor} shadow-lg`}
          title={`Max bid: ${formatIndianNumber(team.max_bid)}`}
        />

        {/* Keyboard Shortcut - Shows on hover */}
        {team.keyboard_key && (
          <span className={`absolute -top-2 -right-2 min-w-[22px] h-[22px] text-xs font-mono font-bold rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border ${
            theme === 'fire'
              ? 'bg-black/80 text-orange-400 border-orange-500/50'
              : 'bg-slate-900 text-amber-400 border-slate-700'
          }`}>
            {team.keyboard_key.toUpperCase()}
          </span>
        )}

        {/* Active indicator glow */}
        {isCurrentBidder && (
          <div className={`absolute inset-0 rounded-xl animate-pulse pointer-events-none ${
            theme === 'fire' ? 'bg-orange-500/20' : 'bg-primary-500/20'
          }`} />
        )}
      </button>

        {/* Team Preview Popover */}
        {isHovered && (
          <TeamPreviewPopover
            team={team}
            position={isTopRow ? 'top' : 'bottom'}
            className="left-1/2 -translate-x-1/2"
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Top Row */}
      <div className="flex flex-wrap justify-center gap-2">
        {topRow.map((team) => renderTeamButton(team, true))}
      </div>
      {/* Bottom Row */}
      {bottomRow.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {bottomRow.map((team) => renderTeamButton(team, false))}
        </div>
      )}
    </div>
  );
}
