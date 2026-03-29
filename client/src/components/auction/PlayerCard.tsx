import { Player, AuctionState } from '../../types';
import { User, Hash, Sparkles } from 'lucide-react';
import { formatIndianNumber } from '../../utils/formatters';
import { getRoleLabel, getRoleShortLabel, getRoleIcon, convertLegacyRole } from '../../config/playerRoles';
import StatusSticker from './StatusSticker';

interface PlayerCardProps {
  player: Player | null;
  status: AuctionState['status'];
}

export default function PlayerCard({ player, status }: PlayerCardProps) {
  if (!player) {
    return (
      <div className="relative h-full min-h-[450px]">
        {/* Outer golden border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-[2px]">
          <div className="h-full w-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mb-6 mx-auto border-2 border-slate-600">
                <User size={64} className="text-slate-500" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-400">No Player Selected</h2>
              <p className="text-slate-500 mt-2">Click "New Player" to start bidding</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    idle: { bg: 'from-slate-600 to-slate-700', label: 'READY', textColor: 'text-white' },
    bidding: { bg: 'from-amber-500 via-yellow-500 to-amber-500', label: 'BIDDING', textColor: 'text-slate-900' },
    sold: { bg: 'from-emerald-500 to-green-600', label: 'SOLD', textColor: 'text-white' },
    unsold: { bg: 'from-red-500 to-rose-600', label: 'UNSOLD', textColor: 'text-white' },
  };

  const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    Platinum: { bg: 'bg-gradient-to-r from-slate-200 to-slate-400', text: 'text-slate-800', border: 'border-slate-300' },
    Gold: { bg: 'bg-gradient-to-r from-amber-400 to-yellow-500', text: 'text-amber-900', border: 'border-amber-300' },
    Silver: { bg: 'bg-gradient-to-r from-slate-300 to-slate-400', text: 'text-slate-800', border: 'border-slate-400' },
    Bronze: { bg: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'text-white', border: 'border-orange-400' },
  };

  const roleValue = player.stats?.role ? convertLegacyRole(player.stats.role) : null;
  const currentStatus = statusConfig[status];
  const categoryStyle = categoryColors[player.categories?.name || ''] || { bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-600' };

  return (
    <div className="relative h-full min-h-[450px]">
      {/* Status Sticker Overlay */}
      {(status === 'sold' || status === 'unsold') && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <StatusSticker
            status={status}
            size="lg"
            showAnimation={true}
          />
        </div>
      )}

      {/* Outer golden border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-[2px] shadow-2xl">
        <div className="h-full w-full rounded-2xl bg-gradient-to-br from-slate-900 via-[#1a1a2e] to-slate-900 overflow-hidden">

          {/* Inner decorative border */}
          <div className="absolute inset-3 rounded-xl border border-amber-500/20 pointer-events-none" />

          {/* Corner decorations */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-500/50 rounded-tl-lg" />
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-500/50 rounded-tr-lg" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-500/50 rounded-bl-lg" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-500/50 rounded-br-lg" />

          {/* Status Banner */}
          <div className="relative">
            <div className={`bg-gradient-to-r ${currentStatus.bg} py-2 text-center relative overflow-hidden`}>
              {/* Shine effect */}
              {status === 'bidding' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
              <div className="flex items-center justify-center gap-2">
                {status === 'bidding' && <Sparkles size={16} className="text-amber-900 animate-pulse" />}
                <span className={`font-black text-sm tracking-[0.3em] ${currentStatus.textColor}`}>
                  {currentStatus.label}
                </span>
                {status === 'bidding' && <Sparkles size={16} className="text-amber-900 animate-pulse" />}
              </div>
            </div>
            {/* Banner shadow */}
            <div className="h-2 bg-gradient-to-b from-black/30 to-transparent" />
          </div>

          {/* Main Content */}
          <div className="flex h-[calc(100%-60px)]">
            {/* Player Photo Section */}
            <div className="w-2/5 relative flex items-end justify-center pb-4">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent" />

              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="relative z-10 max-h-[320px] w-auto object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="relative z-10 w-48 h-64 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center border border-slate-600">
                  <User size={80} className="text-slate-500" />
                </div>
              )}
            </div>

            {/* Player Info Section */}
            <div className="w-3/5 p-6 flex flex-col justify-center">
              {/* Player Name */}
              <h2 className="text-3xl font-black text-white mb-3 tracking-tight leading-tight">
                {player.name}
              </h2>

              {/* Category & Jersey */}
              <div className="flex items-center gap-3 mb-6">
                {player.categories && (
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border} shadow-lg`}>
                    {player.categories.name}
                  </span>
                )}
                {player.jersey_number && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-sm font-medium">
                    <Hash size={14} />
                    {player.jersey_number}
                  </span>
                )}
              </div>

              {/* Base Price Box */}
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/20 to-transparent" />
                <div className="relative bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
                  <p className="text-amber-400/80 text-xs uppercase tracking-widest mb-1">Base Price</p>
                  <p className="text-4xl font-black text-white">
                    {formatIndianNumber(player.base_price)}
                    <span className="text-lg text-slate-400 font-medium ml-2">pts</span>
                  </p>
                </div>
              </div>

              {/* Role Section */}
              {roleValue && (
                <div className="relative">
                  {/* Decorative line */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                    <span className="text-amber-500/60 text-xs uppercase tracking-widest">Role</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getRoleIcon(roleValue)}</span>
                    <div>
                      <p className="text-white font-bold text-lg">{getRoleShortLabel(roleValue)}</p>
                      <p className="text-slate-400 text-sm">{getRoleLabel(roleValue)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
