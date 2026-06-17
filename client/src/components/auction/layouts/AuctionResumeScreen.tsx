import { memo, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, Play, X, Check, XCircle, ArrowLeft } from 'lucide-react';
import { Player, Team } from '../../../types';
import { formatAmountCompact } from '../../../utils/formatters';
import BroadcasterLogo from '../../common/BroadcasterLogo';

interface AuctionResumeScreenProps {
  tournament: {
    name?: string;
    logo_url?: string;
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  };
  lastPlayer: Player | null;
  lastStatus: 'sold' | 'unsold' | null;
  lastTeam: Team | null;
  lastPrice: number;
  availablePlayers: number;
  onNewPlayer?: () => void;
  onClose?: () => void;
  loading?: boolean;
  theme?: 'classic' | 'fire' | 'city' | 'premium';
}

// Theme configurations (matching BreakScreen)
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

// Floating particles (same as BreakScreen)
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

export default memo(function AuctionResumeScreen({
  tournament,
  lastPlayer,
  lastStatus,
  lastTeam,
  lastPrice,
  availablePlayers,
  onNewPlayer,
  onClose,
  loading,
  theme = 'classic',
}: AuctionResumeScreenProps) {
  const navigate = useNavigate();
  const themeConfig = THEMES[theme];
  const accent = themeConfig.accent;
  const [showLastPlayer, setShowLastPlayer] = useState(false);

  // When no players available, show "Resume Auction" screen first
  // After clicking Resume, show the last sold player
  const noPlayersLeft = availablePlayers === 0;

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

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: themeConfig.bg }}
    >
      {/* Close Button - Top Left */}
      <button
        onClick={handleClose}
        className="absolute top-6 left-6 p-3 rounded-xl bg-slate-800/80 hover:bg-red-600 border border-white/10 hover:border-red-500 text-white transition-all z-[100] backdrop-blur-sm shadow-lg"
        title="Exit to Dashboard"
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CASE 1: Show "We'll Be Back Soon" with Resume Auction button */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {noPlayersLeft && !showLastPlayer && (
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
            className="text-xl md:text-2xl font-semibold tracking-[0.3em] uppercase mb-6"
            style={{
              color: accent,
              textShadow: `0 0 20px ${accent}80`,
            }}
          >
            We'll Be Back Soon
          </p>

          {/* All players auctioned indicator */}
          <div className="flex items-center justify-center gap-2 mb-8 text-lg text-white/70">
            <Check size={20} className="text-green-400" />
            <span>All players have been auctioned</span>
          </div>

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

          {/* Resume Button - Only show if there's lastPlayer data */}
          {lastPlayer && lastStatus ? (
            <div className="flex justify-center">
              <button
                onClick={() => setShowLastPlayer(true)}
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
          ) : (
            /* No lastPlayer data - Show waiting message */
            <p className="text-slate-400 text-lg">
              Waiting for admin to mark auction as complete...
            </p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CASE 2: Show last sold/unsold player after clicking Resume */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {noPlayersLeft && showLastPlayer && (
        <div className="text-center relative z-10 flex flex-col items-center max-w-4xl mx-auto px-6">
          {/* Back Button - Only show if there's player data */}
          {lastPlayer && lastStatus && (
            <button
              onClick={() => setShowLastPlayer(false)}
              className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-sm z-20"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          )}

          {/* Last Player Card */}
          {lastPlayer && lastStatus ? (
            <div
              className="relative p-10 rounded-3xl backdrop-blur-md border mt-16"
              style={{
                background: `linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))`,
                borderColor: `${accent}40`,
                boxShadow: `0 0 60px ${accent}30, inset 0 0 60px rgba(0,0,0,0.3)`,
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: `radial-gradient(ellipse at center, ${accent}15, transparent 70%)`,
                }}
              />

              {/* Status Badge - Large */}
              <div className="flex justify-center mb-8 relative z-10">
                <div
                  className="px-8 py-4 rounded-2xl flex items-center gap-4 font-black text-2xl uppercase tracking-wider"
                  style={{
                    background: lastStatus === 'sold' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: lastStatus === 'sold' ? '#22c55e' : '#ef4444',
                    border: `2px solid ${lastStatus === 'sold' ? '#22c55e' : '#ef4444'}60`,
                    boxShadow: `0 0 30px ${lastStatus === 'sold' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  }}
                >
                  {lastStatus === 'sold' ? <Check size={32} /> : <XCircle size={32} />}
                  {lastStatus === 'sold' ? 'SOLD' : 'UNSOLD'}
                </div>
              </div>

              {/* Player Info - Large */}
              <div className="flex flex-col items-center mb-8 relative z-10">
                {lastPlayer.photo_url ? (
                  <img
                    src={lastPlayer.photo_url}
                    alt={lastPlayer.name}
                    className="w-40 h-40 md:w-48 md:h-48 rounded-full object-cover border-4 mb-6"
                    style={{
                      borderColor: accent,
                      boxShadow: `0 0 40px ${accent}50`,
                    }}
                  />
                ) : (
                  <div
                    className="w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center text-6xl font-bold mb-6"
                    style={{
                      background: `linear-gradient(135deg, ${accent}40, ${accent}20)`,
                      border: `4px solid ${accent}60`,
                      boxShadow: `0 0 40px ${accent}50`,
                    }}
                  >
                    {lastPlayer.name.charAt(0)}
                  </div>
                )}
                <h2
                  className="text-4xl md:text-5xl font-black text-white mb-2"
                  style={{ textShadow: `0 0 20px ${accent}40` }}
                >
                  {lastPlayer.name}
                </h2>
                <p className="text-xl text-slate-400">{lastPlayer.categories?.name || 'Player'}</p>
              </div>

              {/* Sale Details - Large */}
              {lastStatus === 'sold' && lastTeam && (
                <div
                  className="flex items-center justify-center gap-6 p-6 rounded-2xl relative z-10"
                  style={{ background: 'rgba(34, 197, 94, 0.15)' }}
                >
                  {lastTeam.logo_url && (
                    <img
                      src={lastTeam.logo_url}
                      alt={lastTeam.name}
                      className="w-20 h-20 object-contain"
                      style={{ filter: `drop-shadow(0 0 15px ${accent}50)` }}
                    />
                  )}
                  <div className="text-left">
                    <p className="text-white font-bold text-2xl">{lastTeam.name}</p>
                    <p className="text-green-400 font-black text-3xl">{formatAmountCompact(lastPrice)}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No last player data available */
            <div className="text-center mt-16">
              {/* Tournament Logo */}
              <div className="mb-10 relative flex items-center justify-center">
                <div
                  className="absolute inset-0 animate-glow-pulse"
                  style={{
                    background: `radial-gradient(circle, ${accent}40 0%, ${accent}20 40%, transparent 70%)`,
                    filter: 'blur(40px)',
                    transform: 'scale(1.5)',
                  }}
                />
                {tournament?.logo_url ? (
                  <img
                    src={tournament.logo_url}
                    alt={tournament.name || 'Tournament'}
                    className="relative w-48 h-48 md:w-64 md:h-64 object-contain"
                    style={{
                      filter: `drop-shadow(0 0 30px ${accent}60)`,
                    }}
                  />
                ) : (
                  <div
                    className="relative w-48 h-48 md:w-64 md:h-64 rounded-3xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
                      border: `3px solid ${accent}40`,
                    }}
                  >
                    <Trophy size={100} style={{ color: accent }} />
                  </div>
                )}
              </div>

              <h1
                className="text-4xl md:text-5xl font-black text-white mb-4"
                style={{ textShadow: `0 0 30px ${accent}50` }}
              >
                {tournament?.name || 'Player Auction'}
              </h1>

              <div className="flex items-center justify-center gap-2 mb-4 text-lg" style={{ color: accent }}>
                <Check size={20} />
                <span>All players have been auctioned</span>
              </div>

              <p className="text-slate-400 text-lg">
                Waiting for admin to mark auction as complete...
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CASE 3: Players still available - Show normal resume with Next Player */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!noPlayersLeft && (
        <div className="text-center relative z-10 flex flex-col items-center">
          {/* Last Player Card (if available) */}
          {lastPlayer && lastStatus && (
            <div
              className="mb-10 p-8 rounded-2xl backdrop-blur-md border"
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                borderColor: `${accent}40`,
                boxShadow: `0 0 40px ${accent}30`,
              }}
            >
              {/* Status Badge */}
              <div className="flex justify-center mb-4">
                <div
                  className="px-5 py-2 rounded-full flex items-center gap-2 font-bold text-sm uppercase tracking-wider"
                  style={{
                    background: lastStatus === 'sold' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: lastStatus === 'sold' ? '#22c55e' : '#ef4444',
                    border: `1px solid ${lastStatus === 'sold' ? '#22c55e' : '#ef4444'}40`,
                  }}
                >
                  {lastStatus === 'sold' ? <Check size={18} /> : <XCircle size={18} />}
                  {lastStatus === 'sold' ? 'SOLD' : 'UNSOLD'}
                </div>
              </div>

              {/* Player Info */}
              <div className="flex items-center justify-center gap-4 mb-4">
                {lastPlayer.photo_url ? (
                  <img
                    src={lastPlayer.photo_url}
                    alt={lastPlayer.name}
                    className="w-20 h-20 rounded-full object-cover border-2"
                    style={{ borderColor: accent }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${accent}40, ${accent}20)`,
                      border: `2px solid ${accent}60`,
                    }}
                  >
                    {lastPlayer.name.charAt(0)}
                  </div>
                )}
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-white">{lastPlayer.name}</h3>
                  <p className="text-slate-400">{lastPlayer.categories?.name || 'Player'}</p>
                </div>
              </div>

              {/* Sale Details */}
              {lastStatus === 'sold' && lastTeam && (
                <div
                  className="flex items-center justify-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(34, 197, 94, 0.1)' }}
                >
                  {lastTeam.logo_url && (
                    <img src={lastTeam.logo_url} alt={lastTeam.name} className="w-10 h-10 object-contain" />
                  )}
                  <div className="text-left">
                    <p className="text-white font-semibold">{lastTeam.name}</p>
                    <p className="text-green-400 font-bold">{formatAmountCompact(lastPrice)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Large Logo */}
          <div className="mb-8 relative animate-idle-float flex items-center justify-center">
            <div
              className="absolute inset-0 animate-glow-pulse"
              style={{
                background: `radial-gradient(circle, ${accent}40 0%, ${accent}20 40%, transparent 70%)`,
                filter: 'blur(40px)',
                transform: 'scale(1.5)',
              }}
            />
            {tournament?.logo_url ? (
              <img
                src={tournament.logo_url}
                alt={tournament.name || 'Tournament'}
                className="relative w-48 h-48 md:w-64 md:h-64 object-contain"
                style={{
                  filter: `drop-shadow(0 0 30px ${accent}60)`,
                }}
              />
            ) : (
              <div
                className="relative w-48 h-48 md:w-64 md:h-64 rounded-3xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
                  border: `3px solid ${accent}40`,
                }}
              >
                <Trophy size={100} style={{ color: accent }} />
              </div>
            )}
          </div>

          {/* Tournament name */}
          <h1
            className="text-4xl md:text-5xl font-black uppercase tracking-wider mb-4"
            style={{
              color: '#ffffff',
              textShadow: `0 0 30px ${accent}50`,
            }}
          >
            {tournament?.name || 'Player Auction'}
          </h1>

          {/* Available Players Count */}
          <p
            className="text-xl mb-8"
            style={{ color: accent }}
          >
            {availablePlayers} players remaining
          </p>

          {/* Next Player Button */}
          {onNewPlayer && (
            <button
              onClick={onNewPlayer}
              disabled={loading}
              className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                boxShadow: `0 0 30px ${accent}50`,
              }}
            >
              <Play size={24} />
              <span>Next Player</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});
