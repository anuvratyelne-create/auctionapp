import { memo, useMemo, useEffect, useState } from 'react';
import { Zap, UserPlus, Trophy } from 'lucide-react';
import BroadcasterLogo from '../../common/BroadcasterLogo';

interface CityIdleScreenProps {
  tournament: {
    name?: string;
    logo_url?: string;
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  };
  onNewPlayer?: () => void;
  loading?: boolean;
}

// City theme colors
const CITY_COLORS = {
  cyan: '#06b6d4',
  cyanLight: '#22d3ee',
  purple: '#8b5cf6',
  magenta: '#c026d3',
  pink: '#ec4899',
  gold: '#fbbf24',
};

// Floating neon particles (memoized)
const NeonParticles = memo(function NeonParticles() {
  const particles = useMemo(() => [...Array(20)].map((_, i) => ({
    id: i,
    left: `${3 + (i * 5) % 94}%`,
    size: `${2 + (i % 3)}px`,
    color: i % 4 === 0 ? CITY_COLORS.cyan : i % 4 === 1 ? CITY_COLORS.purple : i % 4 === 2 ? CITY_COLORS.pink : CITY_COLORS.gold,
    duration: `${5 + (i % 4)}s`,
    delay: `${i * 0.2}s`,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-neon-float will-change-transform"
          style={{
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 6px ${p.color}, 0 0 12px ${p.color}60`,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
});

// Data ticker at bottom
const DataTicker = memo(function DataTicker() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const tickerText = '◆ LIVE AUCTION ◆ PLAYER DRAFT ◆ BIDDING OPEN ◆ ';

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden z-30"
      style={{
        background: `linear-gradient(90deg, ${CITY_COLORS.cyan}15, ${CITY_COLORS.purple}15, ${CITY_COLORS.cyan}15)`,
        borderTop: `1px solid ${CITY_COLORS.cyan}30`,
      }}
    >
      <div
        className="whitespace-nowrap text-sm font-bold tracking-wider h-full flex items-center"
        style={{
          color: CITY_COLORS.cyan,
          textShadow: `0 0 10px ${CITY_COLORS.cyan}`,
          transform: `translateX(-${offset}%)`,
        }}
      >
        {tickerText.repeat(10)}
      </div>
    </div>
  );
});

export default memo(function CityIdleScreen({ tournament, onNewPlayer, loading }: CityIdleScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50">
      {/* Solid dark city-themed background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a1628 0%, #0f172a 30%, #1e293b 60%, #0f172a 100%)',
        }}
      />

      {/* Radial neon glow in center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 50% at center, ${CITY_COLORS.cyan}10 0%, ${CITY_COLORS.purple}05 40%, transparent 70%)`,
        }}
      />

      {/* Broadcaster Logo - Top Right */}
      {tournament?.broadcaster_logo_url && (
        <BroadcasterLogo
          logoUrl={tournament.broadcaster_logo_url}
          name={tournament.broadcaster_name}
          size="lg"
          position="top-right"
          theme="city"
          showName={false}
        />
      )}

      {/* Floating neon particles */}
      <NeonParticles />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(${CITY_COLORS.cyan} 1px, transparent 1px),
            linear-gradient(90deg, ${CITY_COLORS.cyan} 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content */}
      <div className="text-center relative z-10 flex flex-col items-center">
        {/* Logo with neon glow */}
        <div className="mb-6 relative animate-idle-float">
          {/* Neon glow behind logo */}
          <div
            className="absolute inset-0 animate-city-glow"
            style={{
              background: `radial-gradient(circle, ${CITY_COLORS.cyan}30 0%, ${CITY_COLORS.purple}15 40%, transparent 70%)`,
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
                filter: `drop-shadow(0 0 20px ${CITY_COLORS.cyan}) drop-shadow(0 0 40px ${CITY_COLORS.purple}60)`,
              }}
            />
          ) : (
            <div
              className="relative w-44 h-44 md:w-52 md:h-52 lg:w-60 lg:h-60 rounded-3xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${CITY_COLORS.cyan}15, ${CITY_COLORS.purple}10)`,
                border: `2px solid ${CITY_COLORS.cyan}30`,
                boxShadow: `0 0 30px ${CITY_COLORS.cyan}20`,
              }}
            >
              <Trophy size={100} style={{ color: CITY_COLORS.cyan }} />
            </div>
          )}

          {/* Neon sparkles */}
          <Zap
            size={20}
            className="absolute -top-2 -right-2"
            style={{ color: CITY_COLORS.cyan, filter: `drop-shadow(0 0 8px ${CITY_COLORS.cyan})` }}
          />
          <Zap
            size={16}
            className="absolute -bottom-1 -left-4"
            style={{ color: CITY_COLORS.purple, filter: `drop-shadow(0 0 8px ${CITY_COLORS.purple})` }}
          />
        </div>

        {/* Tournament name with neon gradient */}
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-wider mb-3 animate-idle-reveal"
          style={{
            background: `linear-gradient(90deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple}, ${CITY_COLORS.pink})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: `0 0 40px ${CITY_COLORS.cyan}`,
          }}
        >
          {tournament?.name || 'Player Auction'}
        </h1>

        {/* Subtitle */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap
            size={18}
            style={{ color: CITY_COLORS.cyan, filter: `drop-shadow(0 0 8px ${CITY_COLORS.cyan})` }}
          />
          <p
            className="text-lg md:text-xl font-bold tracking-[0.3em] uppercase"
            style={{
              color: CITY_COLORS.gold,
              textShadow: `0 0 15px ${CITY_COLORS.gold}80`,
            }}
          >
            Player Auction
          </p>
          <Zap
            size={18}
            style={{ color: CITY_COLORS.purple, filter: `drop-shadow(0 0 8px ${CITY_COLORS.purple})` }}
          />
        </div>

        {/* Season */}
        <p
          className="text-sm md:text-base tracking-[0.2em] uppercase mb-6"
          style={{ color: CITY_COLORS.pink, textShadow: `0 0 10px ${CITY_COLORS.pink}60` }}
        >
          Season {new Date().getFullYear()}
        </p>

        {/* Neon divider */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className="w-20 h-0.5"
            style={{
              background: `linear-gradient(90deg, transparent, ${CITY_COLORS.cyan})`,
              boxShadow: `0 0 8px ${CITY_COLORS.cyan}`,
            }}
          />
          <div
            className="w-2.5 h-2.5 rotate-45"
            style={{
              background: `linear-gradient(135deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple})`,
              boxShadow: `0 0 12px ${CITY_COLORS.cyan}`,
            }}
          />
          <div
            className="w-20 h-0.5"
            style={{
              background: `linear-gradient(90deg, ${CITY_COLORS.purple}, transparent)`,
              boxShadow: `0 0 8px ${CITY_COLORS.purple}`,
            }}
          />
        </div>

        {/* New Player Button - Neon themed */}
        {onNewPlayer && (
          <div className="flex justify-center">
            <button
              onClick={onNewPlayer}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-base text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple})`,
                boxShadow: `0 0 25px ${CITY_COLORS.cyan}50, 0 0 50px ${CITY_COLORS.purple}30`,
              }}
            >
              <UserPlus size={20} />
              <span>New Player</span>
              <Zap size={18} />
            </button>
          </div>
        )}

        {/* Hint text (fallback) */}
        {!onNewPlayer && (
          <p
            className="text-base animate-idle-hint flex items-center justify-center gap-2"
            style={{ color: `${CITY_COLORS.cyan}80`, textShadow: `0 0 10px ${CITY_COLORS.cyan}50` }}
          >
            ⚡ Press New Player to Begin ⚡
          </p>
        )}
      </div>

      {/* Data ticker at bottom */}
      <DataTicker />

      {/* Inline styles */}
      <style>{`
        @keyframes city-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes neon-float {
          0% { transform: translateY(0); opacity: 0.7; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        .animate-city-glow { animation: city-glow 3s ease-in-out infinite; }
        .animate-neon-float { animation: neon-float linear infinite; }
      `}</style>
    </div>
  );
});
