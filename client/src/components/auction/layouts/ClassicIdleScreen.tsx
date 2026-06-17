import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, UserPlus, X } from 'lucide-react';
import BroadcasterLogo from '../../common/BroadcasterLogo';

interface ClassicIdleScreenProps {
  tournament: {
    name?: string;
    logo_url?: string;
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  };
  accentColor?: string;
  onNewPlayer?: () => void;
  onClose?: () => void;
  loading?: boolean;
}

// Floating particles with accent color
const FloatingParticles = memo(function FloatingParticles({ accentColor }: { accentColor: string }) {
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
            backgroundColor: accentColor,
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

export default memo(function ClassicIdleScreen({ tournament, accentColor = '#fbbf24', onNewPlayer, onClose, loading }: ClassicIdleScreenProps) {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        // Solid dark background to completely cover everything
        background: 'linear-gradient(180deg, rgba(15,23,42,1) 0%, rgba(15,23,42,0.98) 50%, rgba(15,23,42,1) 100%)',
      }}
    >
      {/* Close Button - Top Left - Always visible */}
      <button
        onClick={() => {
          if (onClose) {
            onClose();
          } else {
            // Fallback: exit fullscreen and go to dashboard
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
            navigate('/manage');
          }
        }}
        className="absolute top-6 left-6 p-3 rounded-xl bg-slate-800/90 hover:bg-red-600 border border-slate-600 hover:border-red-500 text-white transition-all z-[100] backdrop-blur-sm shadow-lg"
        title="Exit to Dashboard (or press ESC)"
      >
        <X size={24} />
      </button>

      {/* Broadcaster Logo - Top Right */}
      {tournament?.broadcaster_logo_url && (
        <BroadcasterLogo
          logoUrl={tournament.broadcaster_logo_url}
          name={tournament.broadcaster_name}
          size="xxl"
          position="top-right"
          theme="classic"
          showName={false}
        />
      )}

      {/* Floating particles */}
      <FloatingParticles accentColor={accentColor} />

      {/* Radial glow in center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at center, ${accentColor}15 0%, transparent 60%)`,
        }}
      />

      {/* Main content */}
      <div className="text-center relative z-10">
        {/* Large Logo - No frame, just glow */}
        <div className="mb-10 relative animate-idle-float">
          {/* Glow behind logo */}
          <div
            className="absolute inset-0 animate-glow-pulse"
            style={{
              background: `radial-gradient(circle, ${accentColor}40 0%, ${accentColor}20 40%, transparent 70%)`,
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
                filter: `drop-shadow(0 0 30px ${accentColor}60) drop-shadow(0 0 60px ${accentColor}30)`,
              }}
            />
          ) : (
            <div
              className="relative w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-3xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
                border: `3px solid ${accentColor}40`,
                boxShadow: `0 0 40px ${accentColor}30`,
              }}
            >
              <Trophy size={120} style={{ color: accentColor }} />
            </div>
          )}

          {/* Sparkles around logo */}
          <Sparkles
            size={24}
            className="absolute -top-4 -right-4 animate-diamond-sparkle"
            style={{ color: accentColor, animationDelay: '0s' }}
          />
          <Sparkles
            size={20}
            className="absolute -bottom-2 -left-6 animate-diamond-sparkle"
            style={{ color: accentColor, animationDelay: '0.5s' }}
          />
          <Sparkles
            size={18}
            className="absolute top-1/3 -right-8 animate-diamond-sparkle"
            style={{ color: accentColor, animationDelay: '1s' }}
          />
        </div>

        {/* Tournament name - Large */}
        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-wider mb-4 animate-idle-reveal"
          style={{
            color: '#ffffff',
            textShadow: `0 0 40px ${accentColor}60, 0 0 80px ${accentColor}30`,
          }}
        >
          {tournament?.name || 'Player Auction'}
        </h1>

        {/* Subtitle */}
        <p
          className="text-xl md:text-2xl font-semibold tracking-[0.4em] uppercase mb-4"
          style={{
            color: accentColor,
            textShadow: `0 0 20px ${accentColor}80`,
          }}
        >
          Players Auction
        </p>

        {/* Season */}
        <p
          className="text-base md:text-lg tracking-[0.25em] uppercase mb-10"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Season {new Date().getFullYear()}
        </p>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div
            className="w-24 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor})` }}
          />
          <div
            className="w-3 h-3 rotate-45 animate-diamond-sparkle"
            style={{ background: accentColor, boxShadow: `0 0 15px ${accentColor}` }}
          />
          <div
            className="w-24 h-px"
            style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
          />
        </div>

        {/* New Player Button - Centered */}
        {onNewPlayer && (
          <div className="flex justify-center">
            <button
              onClick={onNewPlayer}
              disabled={loading}
              className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed animate-idle-hint"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow: `0 0 30px ${accentColor}50, 0 0 60px ${accentColor}30`,
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
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <Sparkles size={16} style={{ color: accentColor }} className="animate-diamond-sparkle" />
            Press New Player to Begin
            <Sparkles size={16} className="animate-diamond-sparkle" style={{ color: accentColor, animationDelay: '0.5s' }} />
          </p>
        )}
      </div>
    </div>
  );
});
