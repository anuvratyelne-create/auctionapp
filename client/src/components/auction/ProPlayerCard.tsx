import { Player, AuctionState, Team } from '../../types';
import { User, Wallet, Users, ArrowUp } from 'lucide-react';
import { formatIndianNumber } from '../../utils/formatters';
import AnimatedBidAmount from './AnimatedBidAmount';
import { getRoleLabel, getRoleIcon, convertLegacyRole } from '../../config/playerRoles';
import StatusSticker from './StatusSticker';

interface ProPlayerCardProps {
  player: Player | null;
  status: AuctionState['status'];
  currentBid: number;
  currentTeam: Team | null;
  accentColor?: string;
}

// Dynamic bid increment based on current bid amount
function getBidIncrement(currentBid: number): number {
  if (currentBid >= 50000) return 5000;
  if (currentBid >= 30000) return 3000;
  if (currentBid >= 20000) return 2000;
  return 1000;
}

export default function ProPlayerCard({ player, status, currentBid, currentTeam, accentColor = '#f59e0b' }: ProPlayerCardProps) {
  const nextIncrement = getBidIncrement(currentBid);

  if (!player) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-40 h-40 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 mx-auto border-4 border-white/20">
            <User size={80} className="text-white/40" />
          </div>
          <h2 className="text-3xl font-bold text-white/80">No Player Selected</h2>
          <p className="text-white/50 mt-2 text-lg">Click "New Player" to start bidding</p>
        </div>
      </div>
    );
  }

  const categoryColors: Record<string, { bg: string; text: string; glow: string }> = {
    Platinum: { bg: 'bg-gradient-to-r from-slate-200 to-slate-400', text: 'text-slate-900', glow: 'shadow-slate-300/50' },
    Gold: { bg: 'bg-gradient-to-r from-amber-400 to-yellow-500', text: 'text-amber-900', glow: 'shadow-amber-400/50' },
    Silver: { bg: 'bg-gradient-to-r from-slate-300 to-slate-400', text: 'text-slate-800', glow: 'shadow-slate-400/50' },
    Bronze: { bg: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'text-white', glow: 'shadow-orange-500/50' },
  };

  const roleValue = player.stats?.role ? convertLegacyRole(player.stats.role) : null;
  const categoryStyle = categoryColors[player.categories?.name || ''] || { bg: 'bg-slate-700', text: 'text-white', glow: '' };

  return (
    <div className="relative h-full flex items-center justify-center">
      {/* Status Sticker Overlay */}
      {(status === 'sold' || status === 'unsold') && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <StatusSticker status={status} size="lg" showAnimation={true} />
        </div>
      )}

      {/* Main Content Container */}
      <div className="flex items-center gap-8 lg:gap-12">
        {/* Left Side - Player Photo with decorative frame */}
        <div className="relative flex-shrink-0">
          {/* Jersey Number Badge */}
          {player.jersey_number && (
            <div
              className="absolute -top-4 -left-4 z-20 w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                boxShadow: `0 0 30px ${accentColor}60`
              }}
            >
              {player.jersey_number}
            </div>
          )}

          {/* Circular Frame with glow */}
          <div
            className="relative w-56 h-56 lg:w-64 lg:h-64 rounded-full p-1.5"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
              boxShadow: `0 0 60px ${accentColor}40, inset 0 0 30px ${accentColor}20`
            }}
          >
            {/* Inner circle with image */}
            <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden border-4 border-slate-800">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                  <User size={80} className="text-slate-500" />
                </div>
              )}
            </div>
          </div>

          {/* Decorative swoosh/connector line */}
          <svg
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-16 opacity-60"
            viewBox="0 0 100 40"
            fill="none"
          >
            <path
              d="M50 0 C30 0 20 20 0 30 M50 0 C70 0 80 20 100 30"
              stroke={accentColor}
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        {/* Right Side - Player Info */}
        <div className="flex flex-col gap-4">
          {/* Player Name - Styled bar */}
          <div
            className="relative px-8 py-3 rounded-r-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}20, ${accentColor}40)`,
              borderLeft: `4px solid ${accentColor}`
            }}
          >
            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight uppercase">
              {player.name}
            </h2>
          </div>

          {/* Role - Styled bar */}
          {roleValue && (
            <div
              className="relative px-8 py-2.5 rounded-r-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}15, ${accentColor}30)`,
                borderLeft: `4px solid ${accentColor}80`
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getRoleIcon(roleValue)}</span>
                <span className="text-xl lg:text-2xl font-bold text-white/90 uppercase tracking-wide">
                  {getRoleLabel(roleValue)}
                </span>
              </div>
            </div>
          )}

          {/* Category Badge */}
          {player.categories && (
            <div className="px-8 py-2">
              <span className={`inline-block px-6 py-2 rounded-full text-lg font-bold ${categoryStyle.bg} ${categoryStyle.text} shadow-lg ${categoryStyle.glow}`}>
                {player.categories.name}
              </span>
            </div>
          )}

          {/* Bid Info Section */}
          <div className="mt-4 space-y-3">
            {/* Current Bid */}
            <div
              className="relative px-8 py-4 rounded-xl backdrop-blur-sm"
              style={{
                background: `linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))`,
                border: `2px solid ${accentColor}50`
              }}
            >
              <p className="text-sm uppercase tracking-widest mb-1" style={{ color: accentColor }}>
                {currentTeam ? 'Current Bid' : 'Base Price'}
              </p>
              <div className="flex items-baseline gap-3">
                <div className="text-4xl lg:text-5xl font-black text-white">
                  <AnimatedBidAmount value={currentBid} duration={400} />
                </div>
                <span className="text-lg text-white/60">pts</span>
              </div>
              {currentTeam && (
                <div className="mt-2 flex items-center gap-2">
                  <ArrowUp size={14} style={{ color: accentColor }} />
                  <span className="text-sm" style={{ color: accentColor }}>
                    +{formatIndianNumber(nextIncrement)} next bid
                  </span>
                </div>
              )}
            </div>

            {/* Current Team */}
            {currentTeam && (
              <div
                className="flex items-center gap-4 px-6 py-3 rounded-xl backdrop-blur-sm"
                style={{
                  background: `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))`,
                  border: `1px solid ${accentColor}30`
                }}
              >
                {currentTeam.logo_url ? (
                  <img
                    src={currentTeam.logo_url}
                    alt={currentTeam.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{currentTeam.short_name}</span>
                  </div>
                )}
                <div>
                  <p className="text-white font-bold">{currentTeam.name}</p>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span className="flex items-center gap-1">
                      <Wallet size={12} />
                      {formatIndianNumber(currentTeam.remaining_budget)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {currentTeam.player_count || 0} players
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
