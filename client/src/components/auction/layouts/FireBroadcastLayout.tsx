import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Team, Player } from '../../../types';
import { getRoleLabel } from '../../../config/playerRoles';
import { formatAmountCompact } from '../../../utils/formatters';
import { soundManager } from '../../../utils/soundManager';
import { api } from '../../../utils/api';
import { useUIStore } from '../../../stores/uiStore';
import { User, Flame } from 'lucide-react';
import FireIdleScreen from './FireIdleScreen';

interface Sponsor {
  id: string;
  name?: string;
  logo_url: string;
  display_order: number;
}

interface FireBroadcastLayoutProps {
  tournament: any;
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  teams: Team[];
  status: string;
  timerSeconds?: number;
  timerKey?: number;
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

// Animated Fire Timer
function FireTimer({ duration = 15, isActive = true, resetKey = 0 }: { duration?: number; isActive?: boolean; resetKey?: number }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const hasPlayedBuzzer = useRef(false);

  useEffect(() => {
    setTimeLeft(duration);
    hasPlayedBuzzer.current = false;
  }, [resetKey, duration]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);
        if (newTime <= 5 && newTime > 0) soundManager.play('tick');
        if (newTime === 0 && !hasPlayedBuzzer.current) {
          hasPlayedBuzzer.current = true;
          soundManager.play('buzzer');
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, resetKey, timeLeft]);

  const progress = (timeLeft / duration) * 100;
  const isLow = timeLeft <= 5;

  return (
    <div className="relative w-32 h-32">
      {/* Fire glow */}
      <div
        className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${isLow ? 'animate-pulse' : ''}`}
        style={{ background: `radial-gradient(circle, ${isLow ? FIRE_COLORS.red : FIRE_COLORS.orange}60, transparent)` }}
      />

      {/* Flame ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="64" cy="64" r="54" fill="none"
          stroke={`url(#fireGradient)`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 54}`}
          strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
          style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 10px ${FIRE_COLORS.orange})` }}
        />
        <defs>
          <linearGradient id="fireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={FIRE_COLORS.yellow} />
            <stop offset="50%" stopColor={FIRE_COLORS.orange} />
            <stop offset="100%" stopColor={FIRE_COLORS.red} />
          </linearGradient>
        </defs>
      </svg>

      {/* Time display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`text-4xl font-black ${isLow ? 'animate-pulse' : ''}`}
          style={{
            color: isLow ? FIRE_COLORS.red : FIRE_COLORS.yellow,
            textShadow: `0 0 20px ${isLow ? FIRE_COLORS.red : FIRE_COLORS.orange}, 0 0 40px ${isLow ? FIRE_COLORS.red : FIRE_COLORS.orange}80`,
          }}
        >
          {timeLeft}
        </span>
      </div>
    </div>
  );
}

// Fire Frame component for photos - Using realistic PNG fire ring
// Sized for LED screens and big projectors
function FireFrame({ children, size = 'large' }: { children: React.ReactNode; size?: 'large' | 'medium' }) {
  // Extra large frames for projector/LED display visibility
  const sizeClasses = size === 'large' ? 'w-[26rem] h-[26rem] md:w-[32rem] md:h-[32rem]' : 'w-[22rem] h-[22rem] md:w-[26rem] md:h-[26rem]';
  // Larger photos to fill more of the ring
  const photoSize = size === 'large' ? 'w-64 h-64 md:w-80 md:h-80' : 'w-56 h-56 md:w-72 md:h-72';
  const emberCount = size === 'large' ? 10 : 6;

  return (
    <div className={`relative ${sizeClasses} flex items-center justify-center`}>
      {/* Subtle outer glow - just a soft fire ambiance */}
      <div
        className="absolute rounded-full"
        style={{
          width: '115%',
          height: '115%',
          background: `radial-gradient(circle, transparent 50%, ${FIRE_COLORS.orange}25 70%, ${FIRE_COLORS.red}15 85%, transparent 95%)`,
          filter: 'blur(15px)',
        }}
      />

      {/* Rising embers behind the ring */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        {[...Array(emberCount)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-ember-rise will-change-transform"
            style={{
              left: `${20 + (i * 6) % 60}%`,
              bottom: '15%',
              width: `${2 + (i % 2)}px`,
              height: `${2 + (i % 2)}px`,
              background: i % 3 === 0 ? FIRE_COLORS.yellow : i % 3 === 1 ? FIRE_COLORS.orange : FIRE_COLORS.ember,
              animationDuration: `${3 + (i % 2)}s`,
              animationDelay: `${i * 0.2}s`,
              zIndex: 1,
            }}
          />
        ))}
      </div>

      {/* Realistic fire ring PNG */}
      <img
        src="/images/fire-ring.png"
        alt=""
        className="absolute w-full h-full object-contain pointer-events-none z-[5]"
        style={{
          filter: `drop-shadow(0 0 15px ${FIRE_COLORS.orange}90) drop-shadow(0 0 30px ${FIRE_COLORS.red}50)`,
          transform: 'scale(1.1)',
        }}
      />

      {/* Content (player/team photo) - clean, no inner ring */}
      <div
        className={`relative ${photoSize} rounded-full overflow-hidden z-10`}
      >
        {children}
        {/* Subtle flame overlay on photo edges */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, transparent 60%, ${FIRE_COLORS.orange}15 80%, ${FIRE_COLORS.red}25 100%)`,
          }}
        />
      </div>
    </div>
  );
}

// Rising embers component (memoized for performance)
const RisingEmbers = memo(function RisingEmbers() {
  const embers = useMemo(() => [...Array(15)].map((_, i) => ({
    id: i,
    left: `${5 + (i * 6) % 90}%`,
    size: `${2 + (i % 2)}px`,
    color: i % 3 === 0 ? FIRE_COLORS.yellow : i % 3 === 1 ? FIRE_COLORS.orange : FIRE_COLORS.ember,
    duration: `${4 + (i % 3)}s`,
    delay: `${i * 0.25}s`,
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
            animationDuration: e.duration,
            animationDelay: e.delay,
          }}
        />
      ))}
    </div>
  );
});

// Bottom flames component - Real fire video flowing freely up to player level
function BottomFlames() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[5]" style={{ height: '70vh' }}>
      {/* Real fire video - tall and transparent, flowing up */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute bottom-0 left-0 w-full object-cover"
        style={{
          mixBlendMode: 'screen',
          height: '75vh',
          opacity: 0.6,
        }}
      >
        <source src="/images/fire-bottom.mp4" type="video/mp4" />
      </video>

      {/* Gradient mask - transparent at bottom, fading to dark at top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, #0a0505 0%, #0a0505cc 15%, #0a050560 35%, transparent 60%)`,
        }}
      />

      {/* Warm ambient glow from flames */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: `radial-gradient(ellipse 120% 100% at center bottom, ${FIRE_COLORS.orange}35 0%, ${FIRE_COLORS.red}20 40%, transparent 100%)`,
          filter: 'blur(25px)',
        }}
      />
    </div>
  );
}

export default function FireBroadcastLayout({
  tournament,
  currentPlayer,
  currentBid,
  currentTeam,
  status,
  timerSeconds = 15,
  timerKey = 0,
  onNewPlayer,
  loading,
}: FireBroadcastLayoutProps) {
  const { showSponsors, sponsorRotationInterval, displayMode } = useUIStore();
  const usePoints = displayMode === 'points';
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);

  // Fetch sponsors
  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const data = await api.getSponsors() as Sponsor[];
        setSponsors(data.sort((a, b) => a.display_order - b.display_order));
      } catch (error) {
        console.error('Failed to load sponsors:', error);
      }
    };
    loadSponsors();
  }, []);

  // Rotate sponsors based on custom interval
  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSponsorIndex((prev) => (prev + 1) % sponsors.length);
    }, sponsorRotationInterval * 1000);
    return () => clearInterval(interval);
  }, [sponsors.length, sponsorRotationInterval]);

  const currentSponsor = sponsors[currentSponsorIndex];

  return (
    <div className="relative w-full h-full min-h-screen overflow-x-hidden" style={{ background: '#0a0505' }}>
      {/* Full Screen Idle Welcome Screen when no player selected */}
      {!currentPlayer && tournament && (
        <FireIdleScreen
          tournament={tournament}
          onNewPlayer={onNewPlayer}
          loading={loading}
        />
      )}

      {/* Dark gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center top, #1a0a0a 0%, #0a0505 50%, #050202 100%)',
        }}
      />

      {/* Heat shimmer effect */}
      <div className="absolute inset-0 animate-heat-shimmer opacity-30 pointer-events-none" />

      {/* Rising embers */}
      <RisingEmbers />

      {/* Bottom flames */}
      <BottomFlames />

      {/* Main content */}
      <div className="relative z-10 flex flex-col h-full p-6">

        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          {/* Tournament Logo + Name together in center */}
          <div className="flex items-center gap-8">
            {tournament?.logo_url && (
              <img
                src={tournament.logo_url}
                alt=""
                className="w-40 h-40 md:w-52 md:h-52 object-contain"
                style={{ filter: `drop-shadow(0 0 30px ${FIRE_COLORS.orange})` }}
              />
            )}

            {/* Tournament Name */}
            <div className="text-left">
              <h1
                className="text-6xl md:text-8xl font-black uppercase tracking-wider"
                style={{
                  background: `linear-gradient(180deg, ${FIRE_COLORS.yellow} 0%, ${FIRE_COLORS.orange} 50%, ${FIRE_COLORS.red} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 0 30px ${FIRE_COLORS.orange})`,
                }}
              >
                {tournament?.name || 'AUCTION'}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <Flame size={24} className="animate-pulse" style={{ color: FIRE_COLORS.orange }} />
                <span className="text-lg uppercase tracking-[0.3em] font-medium" style={{ color: FIRE_COLORS.ember }}>
                  Fire Mode Auction
                </span>
                <Flame size={24} className="animate-pulse" style={{ color: FIRE_COLORS.orange }} />
              </div>
            </div>
          </div>

          {/* Right side - Status + Sponsor */}
          <div className="absolute right-6 top-6 flex flex-col items-end gap-3">
            {/* Status badge */}
            <div
              className="px-6 py-2 rounded-full font-bold uppercase tracking-wider"
              style={{
                background: status === 'bidding'
                  ? `linear-gradient(135deg, ${FIRE_COLORS.orange}, ${FIRE_COLORS.red})`
                  : status === 'sold'
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, #64748b, #475569)',
                boxShadow: status === 'bidding' ? `0 0 30px ${FIRE_COLORS.orange}80` : 'none',
              }}
            >
              {status === 'bidding' ? '🔥 LIVE BIDDING' : status === 'sold' ? '✓ SOLD' : status.toUpperCase()}
            </div>

            {/* Sponsor - Large Logo (Fire themed, no border) */}
            {showSponsors && (
              <div className="flex flex-col items-center">
                <p
                  className="text-xs uppercase tracking-[0.3em] mb-3 font-semibold"
                  style={{ color: FIRE_COLORS.ember }}
                >
                  Powered By
                </p>

                <div className="flex items-center justify-center">
                  {currentSponsor?.logo_url ? (
                    <img
                      src={currentSponsor.logo_url}
                      alt={currentSponsor.name || 'Sponsor'}
                      className="h-24 md:h-32 max-w-[280px] object-contain transition-all duration-500"
                      style={{ filter: `drop-shadow(0 0 20px ${FIRE_COLORS.orange}80)` }}
                    />
                  ) : (
                    <span style={{ color: FIRE_COLORS.ember }} className="text-lg">Your Sponsor</span>
                  )}
                </div>

                {currentSponsor?.name && (
                  <p
                    className="mt-2 text-sm font-bold uppercase tracking-wider"
                    style={{
                      color: FIRE_COLORS.yellow,
                      textShadow: `0 0 15px ${FIRE_COLORS.orange}`,
                    }}
                  >
                    {currentSponsor.name}
                  </p>
                )}

                {sponsors.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {sponsors.map((_, idx) => (
                      <div
                        key={idx}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{
                          background: idx === currentSponsorIndex ? FIRE_COLORS.orange : `${FIRE_COLORS.ember}40`,
                          boxShadow: idx === currentSponsorIndex ? `0 0 8px ${FIRE_COLORS.orange}` : 'none',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main auction area */}
        <div className="flex-1 flex items-center justify-center gap-16 pb-48">

          {/* Player Section */}
          {currentPlayer ? (
            <div className="flex flex-col items-center">
              <FireFrame size="large">
                {currentPlayer.photo_url ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <img src={currentPlayer.photo_url} alt={currentPlayer.name} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: 'radial-gradient(circle at center, #2d1810 0%, #1a0c08 50%, #0d0503 100%)',
                    }}
                  >
                    <User size={100} style={{ color: FIRE_COLORS.ember }} />
                  </div>
                )}
              </FireFrame>

              <div className="mt-6 text-center max-w-lg">
                {/* Player Name */}
                <h2
                  className="text-4xl md:text-5xl font-black uppercase tracking-wide"
                  style={{ color: FIRE_COLORS.yellow, textShadow: `0 0 30px ${FIRE_COLORS.orange}` }}
                >
                  {currentPlayer.name}
                </h2>

                {/* Role + Category + Jersey + City in one row */}
                <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                  <span
                    className="px-4 py-1.5 rounded-full text-base font-semibold uppercase"
                    style={{ background: `${FIRE_COLORS.red}30`, color: FIRE_COLORS.ember, border: `1px solid ${FIRE_COLORS.red}50` }}
                  >
                    {getRoleLabel(currentPlayer.stats?.role || currentPlayer.role) || 'Player'}
                  </span>
                  {currentPlayer.categories && (
                    <span
                      className="px-4 py-1.5 rounded-full text-base font-bold uppercase"
                      style={{ background: `${FIRE_COLORS.orange}25`, color: FIRE_COLORS.yellow, border: `1px solid ${FIRE_COLORS.orange}50` }}
                    >
                      {currentPlayer.categories.name}
                    </span>
                  )}
                  {currentPlayer.player_uid && (
                    <span
                      className="px-4 py-1.5 rounded-full font-black text-white text-base"
                      style={{ background: `linear-gradient(135deg, ${FIRE_COLORS.orange}, ${FIRE_COLORS.red})` }}
                    >
                      {currentPlayer.player_uid}
                    </span>
                  )}
                  {(currentPlayer.city || currentPlayer.stats?.city) && (
                    <span
                      className="px-4 py-1.5 rounded-full text-base font-bold uppercase flex items-center gap-1"
                      style={{ background: `${FIRE_COLORS.darkRed}40`, color: FIRE_COLORS.ember, border: `1px solid ${FIRE_COLORS.red}50` }}
                    >
                      📍 {currentPlayer.city || currentPlayer.stats?.city}
                    </span>
                  )}
                </div>

                {/* Stats Row - Compact (only if stats exist) */}
                {(currentPlayer.stats?.battingStyle || currentPlayer.stats?.bowlingStyle || currentPlayer.stats?.age) && (
                  <div className="flex items-center justify-center gap-4 mt-4">
                    {currentPlayer.stats?.battingStyle && (
                      <span className="text-base" style={{ color: FIRE_COLORS.ember }}>
                        <span style={{ color: `${FIRE_COLORS.ember}80` }}>Bat:</span> {currentPlayer.stats.battingStyle}
                      </span>
                    )}
                    {currentPlayer.stats?.bowlingStyle && (
                      <>
                        <span style={{ color: `${FIRE_COLORS.orange}50` }}>•</span>
                        <span className="text-base" style={{ color: FIRE_COLORS.ember }}>
                          <span style={{ color: `${FIRE_COLORS.ember}80` }}>Bowl:</span> {currentPlayer.stats.bowlingStyle}
                        </span>
                      </>
                    )}
                    {currentPlayer.stats?.age && (
                      <>
                        <span style={{ color: `${FIRE_COLORS.orange}50` }}>•</span>
                        <span className="text-base" style={{ color: FIRE_COLORS.ember }}>
                          <span style={{ color: `${FIRE_COLORS.ember}80` }}>Age:</span> {currentPlayer.stats.age}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Base Price */}
                <p className="mt-4 text-lg" style={{ color: FIRE_COLORS.ember }}>
                  Base: <span className="font-bold text-xl" style={{ color: FIRE_COLORS.yellow }}>{formatAmountCompact(currentPlayer.base_price, usePoints)}</span>
                </p>
              </div>
            </div>
          ) : null}

          {/* Center - Timer/Stamp and Bid */}
          <div className="flex flex-col items-center gap-4">
            {/* Timer - only when bidding */}
            {status === 'bidding' && (
              <FireTimer duration={timerSeconds} isActive={status === 'bidding'} resetKey={timerKey} />
            )}

            {/* Fire SOLD stamp - appears when status is sold */}
            {status === 'sold' && (
              <div className="mb-4">
                <img
                  src="/images/fire-sold-stamp.png"
                  alt="SOLD"
                  className="w-80 md:w-[420px] h-auto object-contain animate-stamp-slam"
                  style={{
                    filter: `drop-shadow(0 0 25px ${FIRE_COLORS.orange}) drop-shadow(0 0 50px ${FIRE_COLORS.red}80)`,
                  }}
                />
              </div>
            )}

            {/* Current Bid - with pulsing glow */}
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.2em] mb-2" style={{ color: `${FIRE_COLORS.orange}90` }}>
                {status === 'sold' ? 'Sold For' : 'Current Bid'}
              </p>
              <div className="relative">
                {/* Glow background */}
                <div
                  className="absolute inset-0 animate-bid-glow rounded-2xl"
                  style={{
                    background: `radial-gradient(ellipse, ${FIRE_COLORS.orange}30, transparent 70%)`,
                    filter: 'blur(20px)',
                    transform: 'scale(1.5)',
                  }}
                />
                <p
                  className="relative text-6xl md:text-8xl font-black tabular-nums animate-fire-glow"
                  style={{
                    background: `linear-gradient(180deg, ${FIRE_COLORS.yellow} 0%, ${FIRE_COLORS.orange} 50%, ${FIRE_COLORS.red} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {formatAmountCompact(currentBid, usePoints)}
                </p>
              </div>
            </div>
          </div>

          {/* Team Section (when has team) */}
          {currentTeam && (
            <div className="flex flex-col items-center">
              <FireFrame size="large">
                {currentTeam.logo_url ? (
                  <div className="w-full h-full flex items-center justify-center p-6 overflow-hidden">
                    <img src={currentTeam.logo_url} alt={currentTeam.name} className="w-4/5 h-4/5 object-contain" />
                  </div>
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background: 'radial-gradient(circle at center, #2d1810 0%, #1a0c08 50%, #0d0503 100%)',
                    }}
                  >
                    <span className="text-6xl font-black" style={{ color: FIRE_COLORS.orange }}>
                      {currentTeam.short_name}
                    </span>
                  </div>
                )}
              </FireFrame>

              <div className="mt-6 text-center">
                <h2
                  className="text-3xl md:text-4xl font-black uppercase tracking-wide"
                  style={{ color: FIRE_COLORS.yellow, textShadow: `0 0 25px ${FIRE_COLORS.orange}` }}
                >
                  {currentTeam.name}
                </h2>

                {/* Team Stats - Compact */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <span className="text-base" style={{ color: FIRE_COLORS.ember }}>
                    <span style={{ color: `${FIRE_COLORS.ember}80` }}>Budget:</span> {formatAmountCompact(currentTeam.remaining_budget || 0, usePoints)}
                  </span>
                  <span style={{ color: `${FIRE_COLORS.orange}50` }}>•</span>
                  <span className="text-base" style={{ color: FIRE_COLORS.ember }}>
                    <span style={{ color: `${FIRE_COLORS.ember}80` }}>Players:</span> {currentTeam.player_count || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom padding for control bar */}
        <div className="mt-auto" />
      </div>

      <style>{`
        @keyframes ember-rise {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? '' : '-'}${20 + Math.random() * 40}px) scale(0);
            opacity: 0;
          }
        }
        @keyframes flame-back {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          50% { transform: scaleY(1.2) scaleX(0.9); }
        }
        @keyframes flame-front {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          25% { transform: scaleY(1.3) scaleX(0.85); }
          75% { transform: scaleY(0.9) scaleX(1.1); }
        }
        @keyframes flame-tip {
          0%, 100% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(var(--distance)) scaleY(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(calc(var(--distance) - 10px)) scaleY(1.3); opacity: 1; }
        }
        @keyframes fire-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        @keyframes fire-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fire-dash {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 100; }
        }
        @keyframes fire-glow {
          0%, 100% {
            filter: drop-shadow(0 0 20px ${FIRE_COLORS.orange}80);
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 40px ${FIRE_COLORS.orange}) drop-shadow(0 0 80px ${FIRE_COLORS.red}90);
            transform: scale(1.02);
          }
        }
        @keyframes heat-shimmer {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes fire-flicker {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          25% { transform: scale(1.02) rotate(1deg); opacity: 0.95; }
          50% { transform: scale(0.98) rotate(-1deg); opacity: 1; }
          75% { transform: scale(1.01) rotate(0.5deg); opacity: 0.97; }
        }
        @keyframes bid-glow {
          0%, 100% { opacity: 0.4; transform: scale(1.3); }
          50% { opacity: 0.8; transform: scale(1.6); }
        }
        @keyframes stamp-slam {
          0% { transform: scale(3) rotate(-15deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(-12deg); opacity: 1; }
          70% { transform: scale(0.95) rotate(-10deg); }
          100% { transform: scale(1) rotate(-12deg); opacity: 1; }
        }
        .animate-ember-rise { animation: ember-rise linear infinite; }
        .animate-flame-back { animation: flame-back ease-in-out infinite; }
        .animate-flame-front { animation: flame-front ease-in-out infinite; }
        .animate-fire-pulse { animation: fire-pulse 2s ease-in-out infinite; }
        .animate-fire-glow { animation: fire-glow 1.5s ease-in-out infinite; }
        .animate-bid-glow { animation: bid-glow 2s ease-in-out infinite; }
        .animate-heat-shimmer { animation: heat-shimmer 3s ease-in-out infinite; }
        .animate-fire-flicker { animation: fire-flicker 0.5s ease-in-out infinite; }
        .animate-stamp-slam { animation: stamp-slam 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
}
