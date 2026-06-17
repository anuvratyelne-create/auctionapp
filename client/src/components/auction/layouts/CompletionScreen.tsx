import { Trophy, Crown, Users, TrendingUp, Award, X, Sparkles, Star } from 'lucide-react';
import { useEffect, useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import BroadcasterLogo from '../../common/BroadcasterLogo';
import { formatAmountCompact } from '../../../utils/formatters';

interface CompletionScreenProps {
  tournament: {
    name: string;
    logo_url?: string;
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  };
  stats?: {
    totalTeams?: number;
    totalPlayers?: number;
    soldPlayers?: number;
    totalSpent?: number;
    teamsCount?: number;
  };
  theme?: 'classic' | 'premium' | 'fire' | 'city';
  onClose?: () => void;
}

// Theme configurations
const THEMES = {
  classic: {
    bg: 'linear-gradient(135deg, #0a1628 0%, #1a0a28 30%, #0a1628 60%, #0a2818 100%)',
    accent: '#22c55e',
    accentSecondary: '#10b981',
    glow: 'rgba(34, 197, 94, 0.6)',
  },
  premium: {
    bg: 'linear-gradient(135deg, #1a1a0a 0%, #2a1a0a 30%, #1a1a0a 60%, #0a1a1a 100%)',
    accent: '#fbbf24',
    accentSecondary: '#f59e0b',
    glow: 'rgba(251, 191, 36, 0.6)',
  },
  fire: {
    bg: 'linear-gradient(135deg, #1a0a0a 0%, #2a0a0a 30%, #1a0505 60%, #0a0505 100%)',
    accent: '#f97316',
    accentSecondary: '#ef4444',
    glow: 'rgba(249, 115, 22, 0.6)',
  },
  city: {
    bg: 'linear-gradient(135deg, #0a1628 0%, #0a1a2a 30%, #1a0a28 60%, #0a1628 100%)',
    accent: '#06b6d4',
    accentSecondary: '#8b5cf6',
    glow: 'rgba(6, 182, 212, 0.6)',
  },
};

// Confetti piece component
const ConfettiPiece = memo(function ConfettiPiece({
  delay,
  left,
  color,
  size,
  duration
}: {
  delay: number;
  left: number;
  color: string;
  size: number;
  duration: number;
}) {
  return (
    <div
      className="absolute animate-confetti-fall"
      style={{
        left: `${left}%`,
        top: '-5%',
        width: size,
        height: size * 2,
        backgroundColor: color,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
      }}
    />
  );
});

// Floating sparkle component
const FloatingSparkle = memo(function FloatingSparkle({
  x,
  y,
  delay,
  color,
  size,
}: {
  x: number;
  y: number;
  delay: number;
  color: string;
  size: number;
}) {
  return (
    <div
      className="absolute animate-sparkle-float"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}s`,
      }}
    >
      <Star size={size} fill={color} color={color} className="opacity-60" />
    </div>
  );
});

export default function CompletionScreen({ tournament, stats, theme = 'classic', onClose }: CompletionScreenProps) {
  const navigate = useNavigate();
  const themeConfig = THEMES[theme];
  const [showContent, setShowContent] = useState(false);

  // Generate confetti pieces
  const confettiPieces = useMemo(() => {
    const colors = [themeConfig.accent, themeConfig.accentSecondary, '#ffffff', '#fbbf24', '#ec4899', '#8b5cf6'];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 5,
      size: 6 + Math.random() * 8,
      duration: 4 + Math.random() * 3,
    }));
  }, [themeConfig]);

  // Generate floating sparkles
  const sparkles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 4,
      size: 8 + Math.random() * 12,
    }));
  }, []);

  useEffect(() => {
    // Trigger content animation after mount
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      navigate('/manage');
    }
  };

  // Get stats values
  const teamsCount = stats?.teamsCount ?? stats?.totalTeams ?? 0;
  const playersCount = stats?.totalPlayers ?? 0;
  const soldCount = stats?.soldPlayers ?? 0;
  const totalSpent = stats?.totalSpent ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: themeConfig.bg }}
    >
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-6 left-6 p-3 rounded-xl bg-slate-800/80 hover:bg-red-600 border border-white/10 hover:border-red-500 text-white transition-all z-[100] backdrop-blur-sm shadow-lg"
        title="Exit to Dashboard"
      >
        <X size={24} />
      </button>

      {/* Broadcaster Logo - Top Right */}
      {tournament.broadcaster_logo_url && (
        <BroadcasterLogo
          logoUrl={tournament.broadcaster_logo_url}
          name={tournament.broadcaster_name}
          size="xxl"
          position="top-right"
          theme={theme}
          showName={false}
        />
      )}

      {/* Confetti rain */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((piece) => (
          <ConfettiPiece
            key={piece.id}
            left={piece.left}
            color={piece.color}
            delay={piece.delay}
            size={piece.size}
            duration={piece.duration}
          />
        ))}
      </div>

      {/* Floating sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {sparkles.map((sparkle) => (
          <FloatingSparkle
            key={sparkle.id}
            x={sparkle.x}
            y={sparkle.y}
            delay={sparkle.delay}
            color={themeConfig.accent}
            size={sparkle.size}
          />
        ))}
      </div>

      {/* Radial glow behind content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at center, ${themeConfig.glow} 0%, transparent 60%)`,
        }}
      />

      {/* Main content */}
      <div
        className={`text-center relative z-10 max-w-5xl mx-auto px-6 transition-all duration-1000 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Crown icon */}
        <div className="flex justify-center mb-6 animate-bounce-slow">
          <div
            className="relative p-4"
            style={{ filter: `drop-shadow(0 0 30px ${themeConfig.accent})` }}
          >
            <Crown size={60} style={{ color: themeConfig.accent }} fill={themeConfig.accent} />
          </div>
        </div>

        {/* Trophy with glow */}
        <div className="flex justify-center mb-8">
          <div
            className="relative w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center animate-pulse-glow"
            style={{
              background: `linear-gradient(135deg, ${themeConfig.accent}, ${themeConfig.accentSecondary})`,
              boxShadow: `0 0 60px ${themeConfig.glow}, 0 0 120px ${themeConfig.glow}`,
            }}
          >
            <Trophy size={80} className="text-white" />

            {/* Rotating ring */}
            <div
              className="absolute inset-[-10px] rounded-full border-2 border-dashed animate-spin-slow"
              style={{ borderColor: `${themeConfig.accent}50` }}
            />
            <div
              className="absolute inset-[-20px] rounded-full border animate-spin-reverse"
              style={{ borderColor: `${themeConfig.accentSecondary}30` }}
            />
          </div>
        </div>

        {/* Tournament Logo - Large */}
        {tournament.logo_url && (
          <div className="flex justify-center mb-8">
            <img
              src={tournament.logo_url}
              alt={tournament.name}
              className="h-32 md:h-40 w-auto object-contain animate-float"
              style={{
                filter: `drop-shadow(0 0 40px ${themeConfig.glow})`,
              }}
            />
          </div>
        )}

        {/* Tournament name */}
        <h1
          className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-wider mb-4"
          style={{
            background: `linear-gradient(135deg, #ffffff, ${themeConfig.accent}, ${themeConfig.accentSecondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 0 30px ${themeConfig.glow})`,
          }}
        >
          {tournament.name}
        </h1>

        {/* Auction Completed text */}
        <div className="mb-8">
          <h2
            className="text-3xl md:text-5xl font-black text-white mb-3 flex items-center justify-center gap-4"
            style={{ textShadow: `0 0 40px ${themeConfig.glow}` }}
          >
            <Sparkles size={36} style={{ color: themeConfig.accent }} className="animate-spin-slow" />
            AUCTION COMPLETED!
            <Sparkles size={36} style={{ color: themeConfig.accent }} className="animate-spin-slow" />
          </h2>
          <p className="text-xl md:text-2xl text-white/70">
            Thank you for participating in this auction
          </p>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div
            className="w-32 h-1 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${themeConfig.accent})` }}
          />
          <div
            className="w-4 h-4 rotate-45 animate-pulse"
            style={{ background: themeConfig.accent, boxShadow: `0 0 20px ${themeConfig.accent}` }}
          />
          <div
            className="w-32 h-1 rounded-full"
            style={{ background: `linear-gradient(90deg, ${themeConfig.accent}, transparent)` }}
          />
        </div>

        {/* Stats cards - Large and impressive */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          {/* Teams */}
          <div
            className="relative p-6 rounded-2xl backdrop-blur-md overflow-hidden group hover:scale-105 transition-transform"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${themeConfig.accent}40`,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: `radial-gradient(circle at center, ${themeConfig.accent}20, transparent 70%)` }}
            />
            <Users size={36} style={{ color: themeConfig.accent }} className="mx-auto mb-3" />
            <div className="text-4xl md:text-5xl font-black text-white mb-1">{teamsCount}</div>
            <div className="text-sm text-white/60 uppercase tracking-wider">Teams</div>
          </div>

          {/* Players */}
          <div
            className="relative p-6 rounded-2xl backdrop-blur-md overflow-hidden group hover:scale-105 transition-transform"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${themeConfig.accent}40`,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: `radial-gradient(circle at center, ${themeConfig.accent}20, transparent 70%)` }}
            />
            <Users size={36} style={{ color: themeConfig.accentSecondary }} className="mx-auto mb-3" />
            <div className="text-4xl md:text-5xl font-black text-white mb-1">{playersCount}</div>
            <div className="text-sm text-white/60 uppercase tracking-wider">Players</div>
          </div>

          {/* Players Sold */}
          <div
            className="relative p-6 rounded-2xl backdrop-blur-md overflow-hidden group hover:scale-105 transition-transform"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${themeConfig.accent}40`,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: `radial-gradient(circle at center, ${themeConfig.accent}20, transparent 70%)` }}
            />
            <Award size={36} style={{ color: '#22c55e' }} className="mx-auto mb-3" />
            <div className="text-4xl md:text-5xl font-black text-white mb-1">{soldCount}</div>
            <div className="text-sm text-white/60 uppercase tracking-wider">Players Sold</div>
          </div>

          {/* Total Spent */}
          <div
            className="relative p-6 rounded-2xl backdrop-blur-md overflow-hidden group hover:scale-105 transition-transform"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${themeConfig.accent}40`,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: `radial-gradient(circle at center, ${themeConfig.accent}20, transparent 70%)` }}
            />
            <TrendingUp size={36} style={{ color: '#fbbf24' }} className="mx-auto mb-3" />
            <div className="text-4xl md:text-5xl font-black text-white mb-1">
              {formatAmountCompact(totalSpent)}
            </div>
            <div className="text-sm text-white/60 uppercase tracking-wider">Total Spent</div>
          </div>
        </div>

        {/* Footer message */}
        <p className="text-white/40 text-sm">
          Contact the tournament admin for results and team sheets
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes sparkle-float {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) scale(1.2);
            opacity: 0.8;
          }
        }
        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.05);
            filter: brightness(1.2);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear infinite;
        }
        .animate-sparkle-float {
          animation: sparkle-float 3s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse 8s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
