import { memo, useMemo } from 'react';
import { Flame, UserPlus, Trophy } from 'lucide-react';

interface FireIdleScreenProps {
  tournament: {
    name?: string;
    logo_url?: string;
  };
  onNewPlayer?: () => void;
  loading?: boolean;
}

// Fire colors
const FIRE_COLORS = {
  orange: '#f97316',
  yellow: '#fbbf24',
  red: '#ef4444',
  darkRed: '#991b1b',
  ember: '#fdba74',
};

// Rising embers (memoized for performance)
const RisingEmbers = memo(function RisingEmbers() {
  const embers = useMemo(() => [...Array(30)].map((_, i) => ({
    id: i,
    left: `${2 + (i * 3.3) % 96}%`,
    size: `${2 + (i % 3)}px`,
    color: i % 4 === 0 ? FIRE_COLORS.yellow : i % 4 === 1 ? FIRE_COLORS.orange : i % 4 === 2 ? FIRE_COLORS.ember : FIRE_COLORS.red,
    duration: `${3 + (i % 4)}s`,
    delay: `${i * 0.15}s`,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {embers.map((e) => (
        <div
          key={e.id}
          className="absolute rounded-full animate-ember-rise will-change-transform"
          style={{
            left: e.left,
            bottom: '-10px',
            width: e.size,
            height: e.size,
            background: e.color,
            boxShadow: `0 0 6px ${e.color}`,
            animationDuration: e.duration,
            animationDelay: e.delay,
          }}
        />
      ))}
    </div>
  );
});

// Bottom warm glow (no video - clean like Classic/Premium)
const BottomGlow = memo(function BottomGlow() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '30vh' }}>
      {/* Warm ambient glow at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-full"
        style={{
          background: `radial-gradient(ellipse 100% 80% at center bottom, ${FIRE_COLORS.orange}25 0%, ${FIRE_COLORS.red}12 40%, transparent 80%)`,
          filter: 'blur(40px)',
        }}
      />
    </div>
  );
});

export default memo(function FireIdleScreen({ tournament, onNewPlayer, loading }: FireIdleScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50">
      {/* Solid dark fire-themed background - fully opaque */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0505 0%, #120808 30%, #150a0a 50%, #120808 70%, #0a0505 100%)',
        }}
      />

      {/* Radial warm glow in center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at center, ${FIRE_COLORS.orange}12 0%, ${FIRE_COLORS.red}06 40%, transparent 65%)`,
        }}
      />

      {/* Rising embers */}
      <RisingEmbers />

      {/* Bottom warm glow */}
      <BottomGlow />

      {/* Main content - centered vertically */}
      <div className="text-center relative z-10 flex flex-col items-center justify-center">
        {/* Logo with fire glow */}
        <div className="mb-6 relative animate-idle-float">
          {/* Fire glow behind logo */}
          <div
            className="absolute inset-0 animate-fire-pulse"
            style={{
              background: `radial-gradient(circle, ${FIRE_COLORS.orange}40 0%, ${FIRE_COLORS.red}20 40%, transparent 70%)`,
              filter: 'blur(30px)',
              transform: 'scale(1.3)',
            }}
          />

          {/* Logo */}
          {tournament?.logo_url ? (
            <img
              src={tournament.logo_url}
              alt={tournament.name || 'Tournament'}
              className="relative w-44 h-44 md:w-52 md:h-52 lg:w-60 lg:h-60 object-contain"
              style={{
                filter: `drop-shadow(0 0 25px ${FIRE_COLORS.orange}) drop-shadow(0 0 50px ${FIRE_COLORS.red}60)`,
              }}
            />
          ) : (
            <div
              className="relative w-44 h-44 md:w-52 md:h-52 lg:w-60 lg:h-60 rounded-3xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${FIRE_COLORS.orange}20, ${FIRE_COLORS.red}10)`,
                border: `3px solid ${FIRE_COLORS.orange}40`,
                boxShadow: `0 0 40px ${FIRE_COLORS.orange}30`,
              }}
            >
              <Trophy size={100} style={{ color: FIRE_COLORS.orange }} />
            </div>
          )}

          {/* Fire sparkles around logo */}
          <Flame
            size={20}
            className="absolute -top-2 -right-2 animate-fire-flicker"
            style={{ color: FIRE_COLORS.yellow, animationDelay: '0s' }}
          />
          <Flame
            size={16}
            className="absolute -bottom-1 -left-4 animate-fire-flicker"
            style={{ color: FIRE_COLORS.orange, animationDelay: '0.3s' }}
          />
        </div>

        {/* Tournament name with fire gradient */}
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-wider mb-3 animate-idle-reveal"
          style={{
            background: `linear-gradient(180deg, ${FIRE_COLORS.yellow} 0%, ${FIRE_COLORS.orange} 40%, ${FIRE_COLORS.red} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: `0 0 60px ${FIRE_COLORS.orange}`,
          }}
        >
          {tournament?.name || 'Player Auction'}
        </h1>

        {/* Fire Mode subtitle */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Flame
            size={20}
            className="animate-fire-flicker"
            style={{ color: FIRE_COLORS.orange, filter: `drop-shadow(0 0 8px ${FIRE_COLORS.orange})` }}
          />
          <p
            className="text-lg md:text-xl font-bold tracking-[0.3em] uppercase"
            style={{ color: FIRE_COLORS.ember, textShadow: `0 0 15px ${FIRE_COLORS.orange}80` }}
          >
            Fire Mode Auction
          </p>
          <Flame
            size={20}
            className="animate-fire-flicker"
            style={{ color: FIRE_COLORS.orange, filter: `drop-shadow(0 0 8px ${FIRE_COLORS.orange})`, animationDelay: '0.2s' }}
          />
        </div>

        {/* Season */}
        <p
          className="text-sm md:text-base tracking-[0.2em] uppercase mb-6"
          style={{ color: FIRE_COLORS.ember }}
        >
          Season {new Date().getFullYear()}
        </p>

        {/* Fire divider */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className="w-24 h-0.5"
            style={{ background: `linear-gradient(90deg, transparent, ${FIRE_COLORS.orange})` }}
          />
          <Flame
            size={20}
            className="animate-fire-flicker"
            style={{ color: FIRE_COLORS.yellow, filter: `drop-shadow(0 0 10px ${FIRE_COLORS.orange})` }}
          />
          <div
            className="w-24 h-0.5"
            style={{ background: `linear-gradient(90deg, ${FIRE_COLORS.orange}, transparent)` }}
          />
        </div>

        {/* New Player Button - Centered, Fire themed */}
        {onNewPlayer && (
          <div className="flex justify-center">
            <button
              onClick={onNewPlayer}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-base text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${FIRE_COLORS.orange}, ${FIRE_COLORS.red})`,
                boxShadow: `0 0 25px ${FIRE_COLORS.orange}50, 0 0 50px ${FIRE_COLORS.red}30`,
              }}
            >
              <UserPlus size={20} />
              <span>New Player</span>
              <Flame size={18} className="animate-fire-flicker" />
            </button>
          </div>
        )}

        {/* Hint text (fallback if no button) */}
        {!onNewPlayer && (
          <p
            className="text-base animate-idle-hint flex items-center justify-center gap-3"
            style={{ color: `${FIRE_COLORS.ember}90` }}
          >
            🔥 Press New Player to Begin 🔥
          </p>
        )}
      </div>

      {/* Inline styles for fire-specific animations */}
      <style>{`
        @keyframes ember-rise {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
        }
        @keyframes fire-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.7; }
        }
        @keyframes fire-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-ember-rise { animation: ember-rise linear infinite; }
        .animate-fire-pulse { animation: fire-pulse 3s ease-in-out infinite; }
        .animate-fire-flicker { animation: fire-flicker 0.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
});
