import { useState, useEffect, memo, useMemo } from 'react';
import { Team, Player } from '../../../types';
import { getRoleLabel } from '../../../config/playerRoles';
import { formatAmountCompact } from '../../../utils/formatters';
import { api } from '../../../utils/api';
import { useUIStore } from '../../../stores/uiStore';
import { getPremiumBackground } from '../../../config/premiumBackgrounds';
import { Zap, Trophy } from 'lucide-react';
import PremiumIdleScreen from './PremiumIdleScreen';
import AuctionResumeScreen from './AuctionResumeScreen';
import CompletionScreen from './CompletionScreen';

interface PremiumBroadcastLayoutProps {
  tournament: any;
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  teams: Team[];
  status: string;
  timerSeconds?: number;
  timerKey?: number;
  onNewPlayer?: () => void;
  onClose?: () => void;
  loading?: boolean;
  // Auction lifecycle props
  auctionStarted?: boolean;
  lastPlayer?: Player | null;
  lastStatus?: 'sold' | 'unsold' | null;
  lastTeam?: Team | null;
  lastPrice?: number;
  availablePlayersCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// GOLD PARTICLES - Floating champagne/gold particles (memoized for performance)
// ═══════════════════════════════════════════════════════════════════════════
const GoldParticles = memo(function GoldParticles() {
  const particles = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${(i * 8.3) % 100}%`,
    size: 2 + (i % 3),
    delay: i * 0.5,
    duration: 14 + (i % 4) * 2,
    opacity: 0.15 + (i % 3) * 0.1,
    color: ['#FFD700', '#F5C518', '#D4AF37'][i % 3],
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

// ═══════════════════════════════════════════════════════════════════════════
// GOLD FRAME - Ornate frame for photos
// ═══════════════════════════════════════════════════════════════════════════
function GoldFrame({
  children,
  size = 'medium',
  className = '',
}: {
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
}) {
  const sizeClasses = {
    small: 'w-14 h-14',
    medium: 'w-24 h-24',
    large: 'w-64 h-64',
    xlarge: 'w-80 h-80 lg:w-96 lg:h-96',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Outer rotating gold ring */}
      <div
        className="absolute -inset-3 rounded-2xl opacity-30 animate-gold-ring-rotate"
        style={{
          background: 'conic-gradient(from 0deg, transparent, #FFD700, transparent, #D4AF37, transparent)',
        }}
      />

      {/* Multi-layer gold glow */}
      <div
        className="absolute -inset-4 rounded-2xl animate-luxury-glow"
        style={{
          background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />
      <div
        className="absolute -inset-2 rounded-2xl"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 60%)',
          filter: 'blur(6px)',
        }}
      />

      {/* Gold gradient border */}
      <div
        className={`relative ${sizeClasses[size]} rounded-2xl p-[3px] overflow-hidden`}
        style={{
          background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 25%, #F5C518 50%, #CD7F32 75%, #FFD700 100%)',
        }}
      >
        {/* Inner content - transparent to preserve PNG transparency */}
        <div className="w-full h-full rounded-xl overflow-hidden">
          {children}
        </div>
      </div>

      {/* Corner ornaments */}
      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED BID - Smooth counting bid display with gold shimmer
// ═══════════════════════════════════════════════════════════════════════════
function AnimatedBid({ value, className, usePoints = false }: { value: number; className?: string; usePoints?: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value === displayValue) return;
    setIsAnimating(true);
    const duration = 400;
    const steps = 15;
    const stepDuration = duration / steps;
    const increment = (value - displayValue) / steps;
    let current = displayValue;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayValue(value);
        setIsAnimating(false);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, displayValue]);

  return (
    <span className={`relative ${className} ${isAnimating ? 'animate-gold-shimmer' : ''}`}>
      {formatAmountCompact(displayValue, usePoints)}
      {isAnimating && (
        <span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent animate-shimmer-pass"
          style={{ backgroundSize: '200% 100%' }}
        />
      )}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GLASS CARD - Glassmorphism card with optional gold accent
// ═══════════════════════════════════════════════════════════════════════════
function GlassCard({
  children,
  className = '',
  intensity = 'medium',
  goldAccent = false,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  goldAccent?: boolean;
}) {
  const bgOpacity = intensity === 'low' ? 'bg-white/[0.02]' : intensity === 'high' ? 'bg-white/[0.08]' : 'bg-white/[0.04]';
  const borderColor = goldAccent
    ? 'border-amber-500/20'
    : intensity === 'low' ? 'border-white/[0.05]' : intensity === 'high' ? 'border-white/[0.15]' : 'border-white/[0.08]';

  return (
    <div className={`${bgOpacity} backdrop-blur-xl border ${borderColor} ${className}`}>
      {goldAccent && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, transparent 50%, rgba(212,175,55,0.03) 100%)',
          }}
        />
      )}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LAYOUT
// ═══════════════════════════════════════════════════════════════════════════
export default function PremiumBroadcastLayout({
  tournament,
  currentPlayer,
  currentBid,
  currentTeam,
  teams,
  status,
  onNewPlayer,
  onClose,
  loading,
  auctionStarted: _auctionStarted = false,
  lastPlayer = null,
  lastStatus = null,
  lastTeam = null,
  lastPrice = 0,
  availablePlayersCount = 0,
}: PremiumBroadcastLayoutProps) {
  const { showSponsors, sponsorRotationInterval, premiumBackgroundId, displayMode } = useUIStore();
  const usePoints = displayMode === 'points';
  const [sponsors, setSponsors] = useState<Array<{ id: string; name?: string; logo_url: string }>>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);

  const background = getPremiumBackground(premiumBackgroundId) || getPremiumBackground('dark-velvet');

  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const data = await api.getSponsors() as Array<{ id: string; name?: string; logo_url: string; display_order: number }>;
        setSponsors(data.sort((a, b) => a.display_order - b.display_order));
      } catch (error) {
        console.error('Failed to load sponsors:', error);
      }
    };
    loadSponsors();
  }, []);

  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSponsorIndex((prev) => (prev + 1) % sponsors.length);
    }, sponsorRotationInterval * 1000);
    return () => clearInterval(interval);
  }, [sponsors.length, sponsorRotationInterval]);

  const currentSponsor = sponsors[currentSponsorIndex];

  const sortedTeams = [...teams].sort((a, b) => b.spent_points - a.spent_points);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* New Player Screen - Only when players are available */}
      {!currentPlayer && tournament && tournament.status !== 'completed' && availablePlayersCount > 0 && (
        <PremiumIdleScreen
          tournament={tournament}
          backgroundId={premiumBackgroundId}
          onNewPlayer={onNewPlayer}
          onClose={onClose}
          loading={loading}
        />
      )}

      {/* Resume Auction Screen - When no players available but auction not completed */}
      {!currentPlayer && tournament && tournament.status !== 'completed' && availablePlayersCount === 0 && (
        <AuctionResumeScreen
          tournament={tournament}
          lastPlayer={lastPlayer}
          lastStatus={lastStatus}
          lastTeam={lastTeam}
          lastPrice={lastPrice}
          availablePlayers={0}
          onNewPlayer={onNewPlayer}
          onClose={onClose}
          loading={loading}
          theme="premium"
        />
      )}

      {/* Completion Screen - Only when admin marks tournament as completed */}
      {!currentPlayer && tournament && tournament.status === 'completed' && (
        <CompletionScreen
          tournament={tournament}
          stats={{
            totalPlayers: teams.reduce((sum, t) => sum + (t.player_count || 0), 0),
            totalSpent: teams.reduce((sum, t) => sum + (t.spent_points || 0), 0),
            teamsCount: teams.length,
          }}
          theme="premium"
          onClose={onClose}
        />
      )}

      {/* Background - Supports gradient, image, and video */}
      {background?.type === 'image' ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${background.value})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: `brightness(${background.brightness || 0.5})`,
          }}
        />
      ) : background?.type === 'video' ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: `brightness(${background.brightness || 0.5})` }}
        >
          <source src={background.value} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: background?.value || '#0a0a0f' }}
        />
      )}

      {/* Dark overlay for better contrast on images */}
      {background?.type === 'image' && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      )}

      {/* Gold Particles */}
      <GoldParticles />

      {/* Subtle grid pattern with gold tint */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,215,0,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.2) 1px, transparent 1px)`,
          backgroundSize: '100px 100px'
        }}
      />

      {/* ══════════════════════════════════════════════════════════════════════════════════════════ */}
      {/* TOP BAR - Gold accented */}
      {/* ══════════════════════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <GlassCard className="mx-6 mt-4 rounded-2xl relative overflow-hidden" intensity="medium" goldAccent>
          {/* Top gold line */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: 'linear-gradient(90deg, transparent, #FFD700, #D4AF37, #FFD700, transparent)' }}
          />

          <div className="relative flex items-center h-44 px-10">
            {/* Left: Big Logo */}
            <div className="flex items-center gap-5">
              {tournament?.logo_url ? (
                <img
                  src={tournament.logo_url}
                  alt={tournament.name}
                  className="w-auto object-contain"
                  style={{ height: '10rem' }}
                />
              ) : (
                <div
                  className="w-32 rounded-2xl flex items-center justify-center"
                  style={{ height: '10rem', background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(212,175,55,0.1) 100%)' }}
                >
                  <Trophy size={64} className="text-amber-400" />
                </div>
              )}

              {/* Tournament Name */}
              <h1
                className="text-3xl lg:text-4xl font-bold tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFD700 50%, #D4AF37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {tournament?.name || 'Player Auction'}
              </h1>
            </div>

            {/* Center: App Logo */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <img
                src="/logo.png"
                alt="Game Auction"
                className="w-auto object-contain"
                style={{ height: '12rem', filter: 'drop-shadow(0 0 25px rgba(255, 215, 0, 0.5))' }}
              />
            </div>

            {/* Right: LIVE + Sponsor */}
            <div className="flex items-center gap-6 ml-auto">
              {/* LIVE indicator */}
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-red-500/20 border border-red-500/30">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                <span className="text-red-400 font-bold text-base tracking-wide">LIVE</span>
              </div>

              {/* Sponsor */}
              {showSponsors && currentSponsor?.logo_url && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-amber-500/60 uppercase tracking-wider">Powered By</span>
                  <img
                    src={currentSponsor.logo_url}
                    alt={currentSponsor.name || 'Sponsor'}
                    className="max-w-[250px] object-contain"
                    style={{ height: '7rem', filter: 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.4))' }}
                  />
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ══════════════════════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-48 left-0 right-0 bottom-0 flex px-6 py-4 gap-5">

        {/* LEFT: Team Standings */}
        <div className="w-72 flex-shrink-0">
          <GlassCard className="h-full rounded-2xl overflow-hidden" intensity="low" goldAccent>
            <div className="px-5 py-4 border-b border-amber-500/10">
              <h3 className="text-sm font-medium text-amber-400/80 uppercase tracking-wider">Team Standings</h3>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100% - 56px)' }}>
              {sortedTeams.map((team, index) => (
                <div
                  key={team.id}
                  className={`relative p-3 rounded-xl transition-all duration-300 ${
                    currentTeam?.id === team.id
                      ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
                      : 'bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-black' :
                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                    'bg-white/10 text-white/60'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex items-center gap-3 pl-4">
                    <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 border border-amber-500/10">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.short_name} className="w-9 h-9 object-contain" />
                      ) : (
                        <span className="text-amber-400/60 font-bold text-sm">{team.short_name}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 font-medium text-sm truncate">{team.short_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-amber-400 text-xs font-medium">{formatAmountCompact(team.remaining_budget, usePoints)}</span>
                        <span className="text-amber-500/30">•</span>
                        <span className="text-white/40 text-xs">{team.player_count || 0} players</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* CENTER: Player Display */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {currentPlayer ? (
            <div className="w-full max-w-5xl">
              {/* Player Card */}
              <GlassCard className="rounded-3xl overflow-hidden relative" intensity="medium" goldAccent>
                {/* Status accent line */}
                <div className={`h-1.5 ${
                  status === 'sold' ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500' :
                  status === 'unsold' ? 'bg-gradient-to-r from-red-500 via-red-400 to-red-500' :
                  'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600'
                }`} />

                <div className="flex p-10 gap-10">
                  {/* Player Photo with Gold Frame */}
                  <div className="relative flex-shrink-0">
                    {/* Jersey number */}
                    <div
                      className="absolute -top-3 -left-3 z-20 px-4 py-2 rounded-xl border"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(212,175,55,0.1) 100%)',
                        borderColor: 'rgba(255,215,0,0.3)',
                      }}
                    >
                      <span className="text-amber-400 font-bold text-2xl">{currentPlayer.player_uid || 'P000'}</span>
                    </div>

                    {/* Photo with Gold Frame */}
                    <GoldFrame size="xlarge">
                      {currentPlayer.photo_url ? (
                        <div className="w-full h-full">
                          <img
                            src={currentPlayer.photo_url}
                            alt={currentPlayer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, #1a1510 0%, #0d0a08 50%, #1a1510 100%)',
                          }}
                        >
                          <span className="text-8xl text-amber-500/30">👤</span>
                        </div>
                      )}
                    </GoldFrame>

                    {/* SOLD Stamp */}
                    {status === 'sold' && (
                      <img
                        src="/images/premium-sold-stamp.png"
                        alt="SOLD"
                        className="absolute -bottom-8 -right-8 w-40 h-40 object-contain animate-stamp-slam z-30"
                        style={{ transform: 'rotate(-12deg)' }}
                      />
                    )}

                    {/* UNSOLD Stamp */}
                    {status === 'unsold' && (
                      <img
                        src="/images/premium-unsold-stamp.png"
                        alt="UNSOLD"
                        className="absolute -bottom-8 -right-8 w-40 h-40 object-contain animate-stamp-slam z-30"
                        style={{ transform: 'rotate(-12deg)' }}
                      />
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 flex flex-col justify-center">
                    <h2
                      className="text-6xl font-bold tracking-tight mb-5"
                      style={{
                        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFD700 50%, #D4AF37 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {currentPlayer.name}
                    </h2>

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-3 mb-8">
                      <span
                        className="px-5 py-2 rounded-full text-amber-300 text-base font-medium border"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(212,175,55,0.05) 100%)',
                          borderColor: 'rgba(255,215,0,0.2)',
                        }}
                      >
                        {getRoleLabel(currentPlayer.stats?.role || currentPlayer.role) || 'Player'}
                      </span>
                      {currentPlayer.categories?.name && (
                        <span
                          className="px-5 py-2 rounded-full text-amber-200 text-base font-medium border"
                          style={{
                            background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(205,127,50,0.1) 100%)',
                            borderColor: 'rgba(212,175,55,0.3)',
                          }}
                        >
                          {currentPlayer.categories.name}
                        </span>
                      )}
                      {(currentPlayer.city || currentPlayer.stats?.city) && (
                        <span
                          className="px-5 py-2 rounded-full text-amber-100 text-base font-medium border flex items-center gap-1.5"
                          style={{
                            background: 'linear-gradient(135deg, rgba(205,127,50,0.15) 0%, rgba(180,100,40,0.1) 100%)',
                            borderColor: 'rgba(205,127,50,0.3)',
                          }}
                        >
                          📍 {currentPlayer.city || currentPlayer.stats?.city}
                        </span>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="flex flex-wrap gap-4 mb-8">
                      {currentPlayer.stats?.battingStyle && (
                        <div
                          className="px-5 py-3 rounded-xl border"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(20,20,30,0.5) 100%)',
                            borderColor: 'rgba(255,215,0,0.1)',
                          }}
                        >
                          <p className="text-xs text-amber-500/60 uppercase tracking-wider">Batting</p>
                          <p className="text-white/90 font-medium text-base">{currentPlayer.stats.battingStyle}</p>
                        </div>
                      )}
                      {currentPlayer.stats?.bowlingStyle && (
                        <div
                          className="px-5 py-3 rounded-xl border"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(20,20,30,0.5) 100%)',
                            borderColor: 'rgba(255,215,0,0.1)',
                          }}
                        >
                          <p className="text-xs text-amber-500/60 uppercase tracking-wider">Bowling</p>
                          <p className="text-white/90 font-medium text-base">{currentPlayer.stats.bowlingStyle}</p>
                        </div>
                      )}
                      {currentPlayer.stats?.age && (
                        <div
                          className="px-5 py-3 rounded-xl border"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(20,20,30,0.5) 100%)',
                            borderColor: 'rgba(255,215,0,0.1)',
                          }}
                        >
                          <p className="text-xs text-amber-500/60 uppercase tracking-wider">Age</p>
                          <p className="text-white/90 font-medium text-base">{currentPlayer.stats.age} yrs</p>
                        </div>
                      )}
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════ */}
                    {/* CURRENT BID - Clean, simple display */}
                    {/* ═══════════════════════════════════════════════════════════════ */}
                    <div className="flex items-end gap-8">
                      {/* Base Price */}
                      <div>
                        <p className="text-xs text-amber-500/50 uppercase tracking-wider mb-1">Base</p>
                        <p className="text-2xl font-semibold text-amber-400/60">{formatAmountCompact(currentPlayer.base_price, usePoints)}</p>
                      </div>

                      {/* Current Bid - Large & Prominent */}
                      <div className="flex-1">
                        <p className={`text-sm font-medium uppercase tracking-[0.15em] mb-1 ${
                          status === 'sold' ? 'text-emerald-400/80' :
                          status === 'unsold' ? 'text-red-400/80' :
                          'text-amber-400/80'
                        }`}>
                          {status === 'sold' ? 'Sold For' : status === 'unsold' ? 'Unsold' : 'Current Bid'}
                        </p>
                        <div className="flex items-baseline gap-4">
                          <AnimatedBid
                            value={currentBid}
                            usePoints={usePoints}
                            className={`text-7xl font-bold tracking-tight ${
                              status === 'sold' ? 'text-emerald-400' :
                              status === 'unsold' ? 'text-red-400' :
                              'text-amber-400'
                            }`}
                          />
                          {status === 'bidding' && (
                            <span className="text-amber-500/50 text-lg font-medium">
                              +{formatAmountCompact(currentBid >= 50000 ? 5000 : currentBid >= 30000 ? 3000 : currentBid >= 20000 ? 2000 : 1000, usePoints)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          ) : null}
        </div>

        {/* RIGHT: Team & Sponsor Panel */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          {/* Bidding Team */}
          <GlassCard className="flex-1 rounded-2xl overflow-hidden" intensity="low" goldAccent>
            {currentTeam ? (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="flex items-center gap-2 mb-5">
                  <Zap size={18} className="text-amber-400" />
                  <span className="text-sm text-amber-500/60 uppercase tracking-wider font-medium">Highest Bidder</span>
                </div>

                {/* Team Logo with Gold Frame */}
                <GoldFrame size="xlarge" className="mb-5">
                  {currentTeam.logo_url ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img src={currentTeam.logo_url} alt={currentTeam.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #1a1510 0%, #0d0a08 50%, #1a1510 100%)',
                      }}
                    >
                      <span className="text-4xl font-bold text-amber-400">{currentTeam.short_name}</span>
                    </div>
                  )}
                </GoldFrame>

                <h3 className="text-2xl font-semibold text-white text-center mb-5">
                  {currentTeam.name}
                </h3>

                <div className="w-full space-y-3">
                  <div
                    className="flex items-center justify-between px-5 py-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(20,20,30,0.5) 100%)',
                    }}
                  >
                    <span className="text-amber-500/60 text-base">Remaining</span>
                    <span className="text-amber-400 font-bold text-lg">{formatAmountCompact(currentTeam.remaining_budget, usePoints)}</span>
                  </div>
                  <div
                    className="flex items-center justify-between px-5 py-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(20,20,30,0.5) 100%)',
                    }}
                  >
                    <span className="text-amber-500/60 text-base">Max Bid</span>
                    <span className="text-amber-300 font-bold text-lg">{formatAmountCompact(currentTeam.max_bid, usePoints)}</span>
                  </div>
                  <div
                    className="flex items-center justify-between px-5 py-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(20,20,30,0.5) 100%)',
                    }}
                  >
                    <span className="text-amber-500/60 text-base">Squad</span>
                    <span className="text-white/80 font-bold text-lg">{currentTeam.player_count || 0} Players</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div
                  className="w-28 h-28 rounded-2xl border border-dashed flex items-center justify-center mb-5"
                  style={{ borderColor: 'rgba(255,215,0,0.2)' }}
                >
                  <Trophy size={48} className="text-amber-500/30" />
                </div>
                <p className="text-amber-500/60 font-medium text-lg">Awaiting Bid</p>
                <p className="text-amber-500/40 text-base mt-2">Team will appear here</p>
              </div>
            )}
          </GlassCard>

          {/* Status Badge */}
          <div
            className={`py-4 rounded-xl text-center font-bold text-base uppercase tracking-wider border ${
              status === 'bidding' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
              status === 'sold' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              status === 'unsold' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
              'bg-white/5 text-amber-500/50 border-amber-500/10'
            }`}
          >
            {status === 'bidding' ? 'Bidding Active' :
             status === 'sold' ? 'Player Sold' :
             status === 'unsold' ? 'Unsold' :
             'Ready'}
          </div>
        </div>
      </div>
    </div>
  );
}
