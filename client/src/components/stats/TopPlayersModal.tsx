import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../../types';
import { X, Trophy, Crown, Sparkles } from 'lucide-react';
import { formatAmountCompact } from '../../utils/formatters';
import { useUIStore } from '../../stores/uiStore';

interface TopPlayersModalProps {
  players: Player[];
  title: string;
  categoryIcon?: string;
  accentColor: 'amber' | 'blue' | 'red' | 'green' | 'purple';
  onClose: () => void;
}

const colorConfig = {
  amber: {
    gradient: 'from-amber-500 via-yellow-500 to-orange-500',
    bg: 'from-amber-900/40 via-amber-950/60 to-black',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_100px_rgba(251,191,36,0.3)]',
    text: 'text-amber-400',
    ring: 'ring-amber-500/50',
  },
  blue: {
    gradient: 'from-blue-500 via-cyan-500 to-blue-600',
    bg: 'from-blue-900/40 via-blue-950/60 to-black',
    border: 'border-blue-500/30',
    glow: 'shadow-[0_0_100px_rgba(59,130,246,0.3)]',
    text: 'text-blue-400',
    ring: 'ring-blue-500/50',
  },
  red: {
    gradient: 'from-red-500 via-rose-500 to-red-600',
    bg: 'from-red-900/40 via-red-950/60 to-black',
    border: 'border-red-500/30',
    glow: 'shadow-[0_0_100px_rgba(239,68,68,0.3)]',
    text: 'text-red-400',
    ring: 'ring-red-500/50',
  },
  green: {
    gradient: 'from-green-500 via-emerald-500 to-green-600',
    bg: 'from-green-900/40 via-green-950/60 to-black',
    border: 'border-green-500/30',
    glow: 'shadow-[0_0_100px_rgba(34,197,94,0.3)]',
    text: 'text-green-400',
    ring: 'ring-green-500/50',
  },
  purple: {
    gradient: 'from-purple-500 via-violet-500 to-purple-600',
    bg: 'from-purple-900/40 via-purple-950/60 to-black',
    border: 'border-purple-500/30',
    glow: 'shadow-[0_0_100px_rgba(168,85,247,0.3)]',
    text: 'text-purple-400',
    ring: 'ring-purple-500/50',
  },
};

export default function TopPlayersModal({ players, title, categoryIcon, accentColor, onClose }: TopPlayersModalProps) {
  const { displayMode } = useUIStore();
  const usePoints = displayMode === 'points';
  const [phase, setPhase] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);
  const top5 = players.slice(0, 5);
  const colors = colorConfig[accentColor];

  useEffect(() => {
    // Animation sequence
    const timers = [
      setTimeout(() => setPhase(1), 100),   // Show backdrop
      setTimeout(() => setPhase(2), 400),   // Show title
      setTimeout(() => setPhase(3), 700),   // Show #1
      setTimeout(() => setPhase(4), 1000),  // Show #2
      setTimeout(() => setPhase(5), 1300),  // Show #3
      setTimeout(() => setPhase(6), 1600),  // Show #4 & #5
      setTimeout(() => setShowSparkles(true), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleClose = () => {
    setPhase(0);
    setTimeout(onClose, 300);
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600', shadow: 'shadow-[0_0_40px_rgba(251,191,36,0.6)]' };
    if (index === 1) return { bg: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500', shadow: 'shadow-[0_0_30px_rgba(148,163,184,0.4)]' };
    if (index === 2) return { bg: 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800', shadow: 'shadow-[0_0_30px_rgba(180,83,9,0.4)]' };
    return { bg: 'bg-slate-700', shadow: '' };
  };

  // Podium order for display: Silver(1), Gold(0), Bronze(2)
  const podiumOrder = [1, 0, 2];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 1 : 0 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 bg-gradient-to-b ${colors.bg} backdrop-blur-xl`}
        onClick={handleClose}
      >
        {/* Animated background particles */}
        {showSparkles && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: '100vh', x: `${Math.random() * 100}vw` }}
                animate={{
                  opacity: [0, 1, 0],
                  y: '-10vh',
                  x: `${Math.random() * 100}vw`,
                }}
                transition={{
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
                className={`absolute w-1 h-1 rounded-full bg-gradient-to-t ${colors.gradient}`}
              />
            ))}
          </div>
        )}

        {/* Close button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, scale: phase >= 1 ? 1 : 0.5 }}
          onClick={handleClose}
          className="absolute top-6 right-6 z-50 w-12 h-12 rounded-full bg-black/50 border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <X size={24} className="text-white" />
        </motion.button>

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center px-4" onClick={e => e.stopPropagation()}>
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : -50 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center ${colors.glow}`}>
                {categoryIcon ? (
                  <span className="text-3xl">{categoryIcon}</span>
                ) : (
                  <Trophy size={32} className="text-white" />
                )}
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{title}</h1>
            <p className="text-slate-400 mt-2">Most Expensive Players</p>
          </motion.div>

          {/* Podium - Top 3 */}
          <div className="flex items-end justify-center gap-6 lg:gap-10 mb-6">
            {podiumOrder.map((playerIndex, _displayIndex) => {
              const player = top5[playerIndex];
              if (!player) return null;

              const isGold = playerIndex === 0;
              const rankStyle = getRankStyle(playerIndex);
              const showPhase = playerIndex === 0 ? 3 : playerIndex === 1 ? 4 : 5;

              // Heights for podium effect - MUCH BIGGER for big screens
              const heights = {
                0: 'h-80 md:h-96 lg:h-[420px]', // Gold - tallest
                1: 'h-64 md:h-80 lg:h-[340px]', // Silver
                2: 'h-56 md:h-72 lg:h-[300px]', // Bronze
              };

              // Widths - MUCH BIGGER
              const widths = {
                0: 'w-48 md:w-64 lg:w-72', // Gold - widest
                1: 'w-40 md:w-52 lg:w-60', // Silver
                2: 'w-36 md:w-48 lg:w-56', // Bronze
              };

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 100, scale: 0.5 }}
                  animate={{
                    opacity: phase >= showPhase ? 1 : 0,
                    y: phase >= showPhase ? 0 : 100,
                    scale: phase >= showPhase ? 1 : 0.5,
                  }}
                  transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                  className={`relative ${widths[playerIndex as 0 | 1 | 2]} ${heights[playerIndex as 0 | 1 | 2]} group`}
                >
                  {/* Glow effect */}
                  {isGold && showSparkles && (
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 40px rgba(251,191,36,0.4)',
                          '0 0 80px rgba(251,191,36,0.6)',
                          '0 0 40px rgba(251,191,36,0.4)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-3xl"
                    />
                  )}

                  {/* Card */}
                  <div className={`relative h-full rounded-3xl border-2 ${isGold ? 'border-amber-500/60' : 'border-slate-600/50'} overflow-hidden bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-sm shadow-2xl`}>
                    {/* Rank badge */}
                    <div className={`absolute top-4 left-4 w-12 h-12 lg:w-14 lg:h-14 rounded-xl ${rankStyle.bg} ${rankStyle.shadow} flex items-center justify-center font-black text-xl lg:text-2xl z-10`}>
                      <span className={playerIndex < 3 ? 'text-black' : 'text-white'}>{playerIndex + 1}</span>
                    </div>

                    {/* Crown for #1 */}
                    {isGold && (
                      <motion.div
                        animate={{ rotate: [-5, 5, -5], y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
                      >
                        <Crown size={40} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
                      </motion.div>
                    )}

                    {/* Player Image */}
                    <div className="absolute inset-0">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-800 flex items-center justify-center">
                          <span className="text-6xl lg:text-7xl font-bold text-slate-600">{player.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    </div>

                    {/* Player Info - smaller text for silver/bronze */}
                    <div className={`absolute bottom-0 left-0 right-0 text-center ${isGold ? 'p-5 lg:p-6' : 'p-3 lg:p-4'}`}>
                      <h3 className={`font-bold text-white truncate ${isGold ? 'text-xl md:text-2xl lg:text-3xl mb-2' : 'text-base md:text-lg lg:text-xl mb-1'}`}>
                        {player.name}
                      </h3>

                      {/* Animated price */}
                      <motion.div
                        animate={showSparkles ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className={`font-black ${isGold ? 'text-3xl md:text-4xl lg:text-5xl text-yellow-400' : 'text-xl md:text-2xl lg:text-3xl text-green-400'}`}
                      >
                        {formatAmountCompact(player.sold_price || 0, usePoints)}
                      </motion.div>

                      {/* Team */}
                      {player.teams && (
                        <div className={`flex items-center justify-center gap-2 ${isGold ? 'mt-3' : 'mt-2'}`}>
                          {player.teams.logo_url && (
                            <img src={player.teams.logo_url} alt="" className={`object-contain ${isGold ? 'w-8 h-8 lg:w-10 lg:h-10' : 'w-5 h-5 lg:w-6 lg:h-6'}`} />
                          )}
                          <span className={`text-slate-300 ${isGold ? 'text-base lg:text-lg' : 'text-xs lg:text-sm'}`}>{player.teams.short_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* #4 and #5 - Vertical cards matching top 3 style */}
          {top5.length > 3 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: phase >= 6 ? 1 : 0, y: phase >= 6 ? 0 : 50 }}
              transition={{ type: 'spring', stiffness: 100 }}
              className="flex gap-8 lg:gap-12"
            >
              {top5.slice(3, 5).map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 80, scale: 0.7 }}
                  animate={{
                    opacity: phase >= 6 ? 1 : 0,
                    y: phase >= 6 ? 0 : 80,
                    scale: phase >= 6 ? 1 : 0.7
                  }}
                  transition={{ delay: idx * 0.15, type: 'spring', stiffness: 80 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="relative w-44 md:w-52 lg:w-60 h-56 md:h-64 lg:h-72 group"
                >
                  {/* Card */}
                  <div className="relative h-full rounded-2xl border border-slate-600/50 overflow-hidden bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-sm shadow-xl">
                    {/* Rank badge */}
                    <div className="absolute top-3 left-3 w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center font-black text-lg lg:text-xl text-white shadow-lg z-10 border border-slate-500/30">
                      {idx + 4}
                    </div>

                    {/* Player Image */}
                    <div className="absolute inset-0">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-800 flex items-center justify-center">
                          <span className="text-5xl font-bold text-slate-600">{player.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    </div>

                    {/* Player Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                      <h4 className="text-lg md:text-xl lg:text-2xl font-bold text-white truncate mb-1">{player.name}</h4>
                      <motion.p
                        animate={showSparkles ? { scale: [1, 1.03, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.5 }}
                        className="text-2xl md:text-3xl lg:text-4xl font-black text-green-400"
                      >
                        {formatAmountCompact(player.sold_price || 0, usePoints)}
                      </motion.p>
                      {player.teams && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          {player.teams.logo_url && (
                            <img src={player.teams.logo_url} alt="" className="w-6 h-6 lg:w-8 lg:h-8 object-contain" />
                          )}
                          <span className="text-sm lg:text-base text-slate-300">{player.teams.short_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Sparkles decoration */}
          {showSparkles && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-8 flex items-center gap-2 text-slate-500"
            >
              <Sparkles size={16} />
              <span className="text-sm">Click anywhere to close</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
