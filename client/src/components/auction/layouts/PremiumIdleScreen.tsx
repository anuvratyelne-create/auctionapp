import { memo, useMemo } from 'react';
import { Trophy, Sparkles, UserPlus } from 'lucide-react';
import { getPremiumBackground } from '../../../config/premiumBackgrounds';
import BroadcasterLogo from '../../common/BroadcasterLogo';

interface PremiumIdleScreenProps {
  tournament: {
    name?: string;
    logo_url?: string;
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  };
  backgroundId?: string;
  onNewPlayer?: () => void;
  loading?: boolean;
}

// Gold Particles (memoized for performance)
const GoldParticles = memo(function GoldParticles() {
  const particles = useMemo(() => Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: `${(i * 4) % 100}%`,
    size: 2 + (i % 4),
    delay: i * 0.3,
    duration: 12 + (i % 5) * 2,
    opacity: 0.2 + (i % 4) * 0.1,
    color: ['#FFD700', '#F5C518', '#D4AF37', '#F7E7CE'][i % 4],
    isDiamond: i % 3 === 0,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-champagne-float will-change-transform"
          style={{
            left: p.left,
            bottom: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isDiamond ? '2px' : '50%',
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: p.isDiamond ? 'rotate(45deg)' : 'none',
          }}
        />
      ))}
    </div>
  );
});

// Spotlight Beams
const SpotlightBeams = memo(function SpotlightBeams() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Left spotlight */}
      <div
        className="absolute top-0 left-1/4 w-64 h-full animate-idle-spotlight-1"
        style={{
          background: 'linear-gradient(180deg, rgba(255,215,0,0.1) 0%, transparent 70%)',
          transform: 'rotate(-15deg)',
          transformOrigin: 'top center',
        }}
      />
      {/* Right spotlight */}
      <div
        className="absolute top-0 right-1/4 w-64 h-full animate-idle-spotlight-2"
        style={{
          background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, transparent 70%)',
          transform: 'rotate(15deg)',
          transformOrigin: 'top center',
        }}
      />
    </div>
  );
});

export default memo(function PremiumIdleScreen({ tournament, backgroundId, onNewPlayer, loading }: PremiumIdleScreenProps) {
  const background = backgroundId ? getPremiumBackground(backgroundId) : null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50">
      {/* Background - Use selected premium background */}
      {background?.type === 'image' ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${background.value})`,
              filter: `brightness(${background.brightness || 0.5})`,
            }}
          />
          {/* Dark overlay for better text visibility */}
          <div className="absolute inset-0 bg-black/40" />
        </>
      ) : background?.type === 'gradient' ? (
        <div
          className="absolute inset-0"
          style={{ background: background.value }}
        />
      ) : (
        /* Default dark gradient if no background selected */
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 50%, #050508 100%)',
          }}
        />
      )}

      {/* Broadcaster Logo - Top Right */}
      {tournament?.broadcaster_logo_url && (
        <BroadcasterLogo
          logoUrl={tournament.broadcaster_logo_url}
          name={tournament.broadcaster_name}
          size="xxl"
          position="top-right"
          theme="premium"
          showName={false}
        />
      )}

      {/* Floating gold particles */}
      <GoldParticles />

      {/* Spotlight beams */}
      <SpotlightBeams />

      {/* Radial gold glow in center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at center, rgba(255,215,0,0.15) 0%, transparent 60%)',
        }}
      />

      {/* Main content */}
      <div className="text-center relative z-10">
        {/* Logo with gold glow - Large, no frame */}
        <div className="mb-10 relative animate-idle-float">
          {/* Glow behind logo */}
          <div
            className="absolute inset-0 animate-luxury-glow"
            style={{
              background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, rgba(212,175,55,0.2) 40%, transparent 70%)',
              filter: 'blur(40px)',
              transform: 'scale(1.5)',
            }}
          />

          {/* Logo - 3x large */}
          {tournament?.logo_url ? (
            <img
              src={tournament.logo_url}
              alt={tournament.name || 'Tournament'}
              className="relative w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 object-contain"
              style={{
                filter: 'drop-shadow(0 0 30px rgba(255,215,0,0.5)) drop-shadow(0 0 60px rgba(212,175,55,0.3))',
              }}
            />
          ) : (
            <div
              className="relative w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(212,175,55,0.1))',
                border: '3px solid rgba(255,215,0,0.4)',
                boxShadow: '0 0 40px rgba(255,215,0,0.3)',
              }}
            >
              <Trophy size={120} className="text-amber-400" />
            </div>
          )}

          {/* Sparkles around logo */}
          <Sparkles
            size={24}
            className="absolute -top-4 -right-4 text-amber-400 animate-diamond-sparkle"
            style={{ animationDelay: '0s' }}
          />
          <Sparkles
            size={20}
            className="absolute -bottom-2 -left-6 text-amber-300 animate-diamond-sparkle"
            style={{ animationDelay: '0.5s' }}
          />
          <Sparkles
            size={18}
            className="absolute top-1/3 -right-8 text-amber-200 animate-diamond-sparkle"
            style={{ animationDelay: '1s' }}
          />
        </div>

        {/* Tournament name with gold gradient */}
        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-wider mb-4 animate-idle-reveal"
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFD700 40%, #D4AF37 60%, #F5C518 80%, #FFFFFF 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 60px rgba(255,215,0,0.5)',
          }}
        >
          {tournament?.name || 'Player Auction'}
        </h1>

        {/* Subtitle */}
        <p
          className="text-xl md:text-2xl font-semibold tracking-[0.4em] uppercase mb-4"
          style={{
            color: '#D4AF37',
            textShadow: '0 0 20px rgba(212,175,55,0.6)',
          }}
        >
          Player Auction
        </p>

        {/* Season */}
        <p
          className="text-base md:text-lg tracking-[0.25em] uppercase mb-10"
          style={{ color: '#F7E7CE' }}
        >
          Season {new Date().getFullYear()}
        </p>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div
            className="w-24 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #FFD700)' }}
          />
          <div
            className="w-3 h-3 rotate-45 animate-diamond-sparkle"
            style={{ background: '#FFD700', boxShadow: '0 0 15px #FFD700' }}
          />
          <div
            className="w-24 h-px"
            style={{ background: 'linear-gradient(90deg, #FFD700, transparent)' }}
          />
        </div>

        {/* New Player Button - Centered, Gold themed */}
        {onNewPlayer && (
          <div className="flex justify-center">
            <button
              onClick={onNewPlayer}
              disabled={loading}
              className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-slate-900 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed animate-idle-hint"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #D4AF37, #F5C518)',
                boxShadow: '0 0 30px rgba(255,215,0,0.5), 0 0 60px rgba(212,175,55,0.3)',
              }}
            >
              <UserPlus size={24} />
              <span>New Player</span>
              <Sparkles size={20} className="animate-diamond-sparkle" />
            </button>
          </div>
        )}

        {/* Hint text (fallback if no button) */}
        {!onNewPlayer && (
          <p
            className="text-base animate-idle-hint flex items-center justify-center gap-3"
            style={{ color: 'rgba(255,215,0,0.6)' }}
          >
            <Sparkles size={16} className="animate-diamond-sparkle" />
            Press New Player to Begin
            <Sparkles size={16} className="animate-diamond-sparkle" style={{ animationDelay: '0.5s' }} />
          </p>
        )}
      </div>
    </div>
  );
});
