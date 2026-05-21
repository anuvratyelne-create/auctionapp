import { memo, useMemo } from 'react';
import { Trophy, Sparkles, Play } from 'lucide-react';
import BroadcasterLogo from '../../common/BroadcasterLogo';

interface BreakScreenProps {
  tournament: {
    name?: string;
    logo_url?: string;
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  };
  theme?: 'classic' | 'premium' | 'fire' | 'city';
  accentColor?: string;
  onResume?: () => void;
}

// Theme configurations
const THEMES = {
  classic: {
    bg: 'linear-gradient(180deg, rgba(15,23,42,1) 0%, rgba(15,23,42,0.98) 50%, rgba(15,23,42,1) 100%)',
    accent: '#fbbf24',
  },
  premium: {
    bg: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 30%, #0a0a0f 100%)',
    accent: '#FFD700',
  },
  fire: {
    bg: 'linear-gradient(180deg, #0a0505 0%, #120808 30%, #150a0a 50%, #0a0505 100%)',
    accent: '#f97316',
  },
  city: {
    bg: 'linear-gradient(180deg, #0a1628 0%, #0f172a 30%, #1e293b 60%, #0f172a 100%)',
    accent: '#06b6d4',
  },
};

// Floating particles
const FloatingParticles = memo(function FloatingParticles({ color }: { color: string }) {
  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${(i * 5) % 100}%`,
    size: 2 + (i % 3),
    delay: i * 0.25,
    duration: 8 + (i % 5) * 2,
    opacity: 0.15 + (i % 4) * 0.1,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-float-particle will-change-transform"
          style={{
            left: p.left,
            bottom: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: color,
            borderRadius: '50%',
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
});

export default memo(function BreakScreen({ tournament, theme = 'classic', accentColor, onResume }: BreakScreenProps) {
  const themeConfig = THEMES[theme];
  const accent = accentColor || themeConfig.accent;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: themeConfig.bg }}
    >
      {/* Broadcaster Logo - Top Right */}
      {tournament?.broadcaster_logo_url && (
        <BroadcasterLogo
          logoUrl={tournament.broadcaster_logo_url}
          name={tournament.broadcaster_name}
          size="xxl"
          position="top-right"
          theme={theme}
          showName={false}
        />
      )}

      {/* Floating particles */}
      <FloatingParticles color={accent} />

      {/* Radial glow in center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at center, ${accent}15 0%, transparent 60%)`,
        }}
      />

      {/* Main content */}
      <div className="text-center relative z-10 flex flex-col items-center">
        {/* Large Logo - No frame, just glow */}
        <div className="mb-10 relative animate-idle-float flex items-center justify-center">
          {/* Glow behind logo */}
          <div
            className="absolute inset-0 animate-glow-pulse"
            style={{
              background: `radial-gradient(circle, ${accent}40 0%, ${accent}20 40%, transparent 70%)`,
              filter: 'blur(40px)',
              transform: 'scale(1.5)',
            }}
          />

          {/* Logo - Extra Large and Centered */}
          {tournament?.logo_url ? (
            <img
              src={tournament.logo_url}
              alt={tournament.name || 'Tournament'}
              className="relative w-72 h-72 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] object-contain"
              style={{
                filter: `drop-shadow(0 0 30px ${accent}60) drop-shadow(0 0 60px ${accent}30)`,
              }}
            />
          ) : (
            <div
              className="relative w-72 h-72 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] rounded-3xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
                border: `3px solid ${accent}40`,
                boxShadow: `0 0 40px ${accent}30`,
              }}
            >
              <Trophy size={160} style={{ color: accent }} />
            </div>
          )}

          {/* Sparkles around logo */}
          <Sparkles
            size={28}
            className="absolute -top-6 -right-6 animate-diamond-sparkle"
            style={{ color: accent, animationDelay: '0s' }}
          />
          <Sparkles
            size={24}
            className="absolute -bottom-4 -left-8 animate-diamond-sparkle"
            style={{ color: accent, animationDelay: '0.5s' }}
          />
          <Sparkles
            size={20}
            className="absolute top-1/3 -right-10 animate-diamond-sparkle"
            style={{ color: accent, animationDelay: '1s' }}
          />
        </div>

        {/* Tournament name - Large */}
        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-wider mb-4 animate-idle-reveal"
          style={{
            color: '#ffffff',
            textShadow: `0 0 40px ${accent}60, 0 0 80px ${accent}30`,
          }}
        >
          {tournament?.name || 'Player Auction'}
        </h1>

        {/* "We'll be back soon" subtitle */}
        <p
          className="text-xl md:text-2xl font-semibold tracking-[0.3em] uppercase mb-10"
          style={{
            color: accent,
            textShadow: `0 0 20px ${accent}80`,
          }}
        >
          We'll Be Back Soon
        </p>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div
            className="w-24 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${accent})` }}
          />
          <div
            className="w-3 h-3 rotate-45 animate-diamond-sparkle"
            style={{ background: accent, boxShadow: `0 0 15px ${accent}` }}
          />
          <div
            className="w-24 h-px"
            style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
          />
        </div>

        {/* Resume Button */}
        {onResume && (
          <div className="flex justify-center">
            <button
              onClick={onResume}
              className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-105 animate-idle-hint"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                boxShadow: `0 0 30px ${accent}50, 0 0 60px ${accent}30`,
              }}
            >
              <Play size={24} />
              <span>Resume Auction</span>
              <Sparkles size={20} className="animate-diamond-sparkle" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
