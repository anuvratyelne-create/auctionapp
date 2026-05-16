import { motion } from 'framer-motion';
import { Player } from '../../types';
import { Trophy, Crown, Medal, Star } from 'lucide-react';
import { formatAmountCompact } from '../../utils/formatters';
import { useUIStore } from '../../stores/uiStore';

interface TopPlayersPreviewProps {
  players: Player[];
  title: string;
  accentColor?: string;
}

export default function TopPlayersPreview({ players, title, accentColor = 'amber' }: TopPlayersPreviewProps) {
  const { displayMode } = useUIStore();
  const usePoints = displayMode === 'points';
  const top5 = players.slice(0, 5);

  if (top5.length === 0) return null;

  const colorMap: Record<string, { gradient: string; border: string; glow: string; text: string }> = {
    amber: {
      gradient: 'from-amber-500 via-yellow-500 to-orange-500',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/30',
      text: 'text-amber-400'
    },
    blue: {
      gradient: 'from-blue-500 via-cyan-500 to-blue-600',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/30',
      text: 'text-blue-400'
    },
    red: {
      gradient: 'from-red-500 via-rose-500 to-red-600',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/30',
      text: 'text-red-400'
    },
    green: {
      gradient: 'from-green-500 via-emerald-500 to-green-600',
      border: 'border-green-500/30',
      glow: 'shadow-green-500/30',
      text: 'text-green-400'
    },
    purple: {
      gradient: 'from-purple-500 via-violet-500 to-purple-600',
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/30',
      text: 'text-purple-400'
    }
  };

  const colors = colorMap[accentColor] || colorMap.amber;

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown size={16} className="text-yellow-400" />;
    if (index === 1) return <Medal size={16} className="text-slate-300" />;
    if (index === 2) return <Medal size={16} className="text-amber-600" />;
    return <Star size={14} className="text-slate-500" />;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600';
    if (index === 1) return 'bg-gradient-to-br from-slate-400 via-slate-300 to-slate-400';
    if (index === 2) return 'bg-gradient-to-br from-amber-700 via-amber-600 to-amber-700';
    return 'bg-slate-700';
  };

  // Top 3 podium style + 2 smaller cards
  const podiumOrder = [1, 0, 2]; // Silver, Gold, Bronze positions

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
          <Trophy size={16} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
      </div>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-3 mb-4">
        {podiumOrder.map((playerIndex, displayIndex) => {
          const player = top5[playerIndex];
          if (!player) return null;

          const isGold = playerIndex === 0;
          const height = isGold ? 'h-48' : playerIndex === 1 ? 'h-40' : 'h-36';

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: displayIndex * 0.15,
                type: 'spring',
                stiffness: 100
              }}
              whileHover={{ scale: 1.05, y: -5 }}
              className={`relative ${isGold ? 'w-36 z-10' : 'w-28'} ${height} group cursor-pointer`}
            >
              {/* Glow effect for gold */}
              {isGold && (
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(251, 191, 36, 0.3)',
                      '0 0 40px rgba(251, 191, 36, 0.5)',
                      '0 0 20px rgba(251, 191, 36, 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-xl"
                />
              )}

              {/* Card */}
              <div className={`relative h-full bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border ${isGold ? 'border-amber-500/50' : 'border-slate-700'} overflow-hidden`}>
                {/* Rank Badge */}
                <div className={`absolute top-2 left-2 w-7 h-7 rounded-full ${getRankBg(playerIndex)} flex items-center justify-center font-bold text-sm shadow-lg z-10`}>
                  {playerIndex + 1}
                </div>

                {/* Crown for #1 */}
                {isGold && (
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
                  >
                    <Crown size={24} className="text-yellow-400 drop-shadow-lg" />
                  </motion.div>
                )}

                {/* Player Image */}
                <div className="absolute inset-0">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-800 flex items-center justify-center">
                      <span className="text-3xl font-bold text-slate-600">{player.name.charAt(0)}</span>
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                </div>

                {/* Player Info */}
                <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
                  <h4 className="text-sm font-bold text-white truncate">{player.name}</h4>
                  <motion.p
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: playerIndex * 0.3 }}
                    className={`text-base font-black ${isGold ? 'text-yellow-400' : 'text-green-400'}`}
                  >
                    {formatAmountCompact(player.sold_price || 0, usePoints)}
                  </motion.p>
                  {player.teams && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {player.teams.logo_url ? (
                        <img src={player.teams.logo_url} alt="" className="w-4 h-4 object-contain" />
                      ) : null}
                      <span className="text-xs text-slate-400">{player.teams.short_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* #4 and #5 smaller cards */}
      {top5.length > 3 && (
        <div className="flex justify-center gap-3">
          {top5.slice(3, 5).map((player, idx) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: idx === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 rounded-xl p-3 w-56 cursor-pointer hover:bg-slate-800 transition-colors"
            >
              {/* Rank */}
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                {idx + 4}
              </div>

              {/* Photo */}
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-10 h-10 object-cover rounded-lg"
                />
              ) : (
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-slate-500">
                  {player.name.charAt(0)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">{player.name}</h4>
                <p className="text-sm font-bold text-green-400">
                  {formatAmountCompact(player.sold_price || 0, usePoints)}
                </p>
              </div>

              {/* Team */}
              {player.teams?.logo_url && (
                <img src={player.teams.logo_url} alt="" className="w-6 h-6 object-contain" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
