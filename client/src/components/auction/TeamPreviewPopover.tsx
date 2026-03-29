import { Team } from '../../types';
import { formatIndianNumber } from '../../utils/formatters';
import { Users, Wallet, TrendingDown, Crown } from 'lucide-react';

interface TeamPreviewPopoverProps {
  team: Team;
  position?: 'top' | 'bottom';
  className?: string;
}

export default function TeamPreviewPopover({
  team,
  position = 'top',
  className = '',
}: TeamPreviewPopoverProps) {
  const budgetPercentUsed = team.total_budget > 0
    ? ((team.spent_points / team.total_budget) * 100).toFixed(0)
    : 0;

  const canAffordMore = team.max_bid > 0;

  return (
    <div
      className={`
        absolute z-50 w-72
        bg-gradient-to-br from-slate-800 to-slate-900
        border border-slate-700/50
        rounded-xl shadow-2xl
        transform transition-all duration-200 ease-out
        animate-in fade-in-0 zoom-in-95
        ${position === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'}
        ${className}
      `}
    >
      {/* Arrow */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2
          w-3 h-3 rotate-45
          bg-slate-800 border-slate-700/50
          ${position === 'top'
            ? 'bottom-0 translate-y-1/2 border-r border-b'
            : 'top-0 -translate-y-1/2 border-l border-t'
          }
        `}
      />

      {/* Content */}
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {team.logo_url ? (
            <img
              src={team.logo_url}
              alt={team.name}
              className="w-12 h-12 object-contain rounded-lg"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-purple-700 rounded-xl flex items-center justify-center">
              <span className="font-bold text-white text-lg">{team.short_name}</span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg leading-tight">{team.name}</h3>
            {team.owner_name && (
              <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-0.5">
                <Crown size={12} className="text-amber-500" />
                <span>{team.owner_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Budget Breakdown */}
        <div className="space-y-3">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Budget Used</span>
              <span className="text-white font-medium">{budgetPercentUsed}%</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, Number(budgetPercentUsed))}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-700/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Wallet size={12} />
                <span>Total Budget</span>
              </div>
              <p className="text-white font-bold">{formatIndianNumber(team.total_budget)}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <TrendingDown size={12} />
                <span>Spent</span>
              </div>
              <p className="text-amber-400 font-bold">{formatIndianNumber(team.spent_points)}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Wallet size={12} className="text-emerald-500" />
                <span>Remaining</span>
              </div>
              <p className="text-emerald-400 font-bold">{formatIndianNumber(team.remaining_budget)}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Users size={12} />
                <span>Squad</span>
              </div>
              <p className="text-white font-bold">{team.player_count} players</p>
            </div>
          </div>

          {/* Max Bid Indicator */}
          <div className={`
            rounded-lg p-3 text-center
            ${canAffordMore
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-red-500/10 border border-red-500/30'
            }
          `}>
            <p className="text-xs text-slate-400 mb-0.5">Max Bid Available</p>
            <p className={`text-lg font-bold ${canAffordMore ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatIndianNumber(team.max_bid)}
            </p>
          </div>

          {/* Keyboard Shortcut */}
          {team.keyboard_key && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-700/50">
              <span className="text-slate-500 text-xs">Press</span>
              <kbd className="px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-amber-400 font-mono font-bold text-sm">
                {team.keyboard_key.toUpperCase()}
              </kbd>
              <span className="text-slate-500 text-xs">to bid</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
