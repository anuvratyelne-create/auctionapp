import { useState, useEffect, useRef } from 'react';
import { Team, Player } from '../../../types';
import { getRoleLabel } from '../../../config/playerRoles';
import { formatIndianNumber } from '../../../utils/formatters';
import { soundManager } from '../../../utils/soundManager';
import { User, Flame } from 'lucide-react';

interface FireBroadcastLayoutProps {
  tournament: any;
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  teams: Team[];
  status: string;
  timerSeconds?: number;
  timerKey?: number;
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
  const sizeClasses = size === 'large' ? 'w-[22rem] h-[22rem] md:w-[28rem] md:h-[28rem]' : 'w-80 h-80 md:w-96 md:h-96';
  // Larger photos to fill more of the ring
  const photoSize = size === 'large' ? 'w-56 h-56 md:w-72 md:h-72' : 'w-48 h-48 md:w-56 md:h-56';
  const emberCount = size === 'large' ? 25 : 15;

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
            className="absolute rounded-full animate-ember-rise"
            style={{
              left: `${20 + Math.random() * 60}%`,
              bottom: '15%',
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              background: i % 3 === 0 ? FIRE_COLORS.yellow : i % 3 === 1 ? FIRE_COLORS.orange : FIRE_COLORS.ember,
              boxShadow: `0 0 ${4 + Math.random() * 4}px ${i % 3 === 0 ? FIRE_COLORS.yellow : FIRE_COLORS.orange}`,
              animationDuration: `${2 + Math.random() * 2}s`,
              animationDelay: `${Math.random() * 3}s`,
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

// Rising embers component
function RisingEmbers() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-ember-rise"
          style={{
            left: `${5 + Math.random() * 90}%`,
            bottom: '-10px',
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            background: i % 3 === 0 ? FIRE_COLORS.yellow : i % 3 === 1 ? FIRE_COLORS.orange : FIRE_COLORS.ember,
            boxShadow: `0 0 ${4 + Math.random() * 6}px ${i % 3 === 0 ? FIRE_COLORS.yellow : FIRE_COLORS.orange}`,
            animationDuration: `${3 + Math.random() * 4}s`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

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
}: FireBroadcastLayoutProps) {

  return (
    <div className="relative w-full h-full min-h-screen overflow-x-hidden" style={{ background: '#0a0505' }}>

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
        <div className="flex items-center justify-center mb-4">
          {/* Tournament Logo + Name together in center */}
          <div className="flex items-center gap-6">
            {tournament?.logo_url && (
              <img
                src={tournament.logo_url}
                alt=""
                className="w-32 h-32 md:w-40 md:h-40 object-contain"
                style={{ filter: `drop-shadow(0 0 25px ${FIRE_COLORS.orange})` }}
              />
            )}

            {/* Tournament Name */}
            <div className="text-left">
              <h1
                className="text-5xl md:text-7xl font-black uppercase tracking-wider"
                style={{
                  background: `linear-gradient(180deg, ${FIRE_COLORS.yellow} 0%, ${FIRE_COLORS.orange} 50%, ${FIRE_COLORS.red} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 0 30px ${FIRE_COLORS.orange})`,
                }}
              >
                {tournament?.name || 'AUCTION'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Flame size={18} className="animate-pulse" style={{ color: FIRE_COLORS.orange }} />
                <span className="text-base uppercase tracking-[0.3em] font-medium" style={{ color: FIRE_COLORS.ember }}>
                  Fire Mode Auction
                </span>
                <Flame size={18} className="animate-pulse" style={{ color: FIRE_COLORS.orange }} />
              </div>
            </div>
          </div>

          {/* Status badge - positioned right */}
          <div
            className="absolute right-6 top-6 px-6 py-2 rounded-full font-bold uppercase tracking-wider"
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
        </div>

        {/* Main auction area */}
        <div className="flex-1 flex items-center justify-center gap-16 pb-48">

          {/* Player Section */}
          {currentPlayer ? (
            <div className="flex flex-col items-center">
              <FireFrame size="large">
                {currentPlayer.photo_url ? (
                  <img src={currentPlayer.photo_url} alt={currentPlayer.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <User size={80} className="text-slate-600" />
                  </div>
                )}
              </FireFrame>

              <div className="mt-5 text-center max-w-md">
                {/* Player Name */}
                <h2
                  className="text-3xl md:text-4xl font-black uppercase tracking-wide"
                  style={{ color: FIRE_COLORS.yellow, textShadow: `0 0 30px ${FIRE_COLORS.orange}` }}
                >
                  {currentPlayer.name}
                </h2>

                {/* Role + Category + Jersey in one row */}
                <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-semibold uppercase"
                    style={{ background: `${FIRE_COLORS.red}30`, color: FIRE_COLORS.ember, border: `1px solid ${FIRE_COLORS.red}50` }}
                  >
                    {getRoleLabel(currentPlayer.stats?.role || currentPlayer.role) || 'Player'}
                  </span>
                  {currentPlayer.categories && (
                    <span
                      className="px-3 py-1 rounded-full text-sm font-bold uppercase"
                      style={{ background: `${FIRE_COLORS.orange}25`, color: FIRE_COLORS.yellow, border: `1px solid ${FIRE_COLORS.orange}50` }}
                    >
                      {currentPlayer.categories.name}
                    </span>
                  )}
                  {currentPlayer.jersey_number && (
                    <span
                      className="px-3 py-1 rounded-full font-black text-white text-sm"
                      style={{ background: `linear-gradient(135deg, ${FIRE_COLORS.orange}, ${FIRE_COLORS.red})` }}
                    >
                      #{currentPlayer.jersey_number}
                    </span>
                  )}
                </div>

                {/* Stats Row - Compact */}
                <div className="flex items-center justify-center gap-3 mt-3">
                  {currentPlayer.stats?.battingStyle && (
                    <span className="text-sm" style={{ color: FIRE_COLORS.ember }}>
                      <span style={{ color: `${FIRE_COLORS.ember}80` }}>Bat:</span> {currentPlayer.stats.battingStyle}
                    </span>
                  )}
                  {currentPlayer.stats?.bowlingStyle && (
                    <>
                      <span style={{ color: `${FIRE_COLORS.orange}50` }}>•</span>
                      <span className="text-sm" style={{ color: FIRE_COLORS.ember }}>
                        <span style={{ color: `${FIRE_COLORS.ember}80` }}>Bowl:</span> {currentPlayer.stats.bowlingStyle}
                      </span>
                    </>
                  )}
                  {currentPlayer.stats?.age && (
                    <>
                      <span style={{ color: `${FIRE_COLORS.orange}50` }}>•</span>
                      <span className="text-sm" style={{ color: FIRE_COLORS.ember }}>
                        <span style={{ color: `${FIRE_COLORS.ember}80` }}>Age:</span> {currentPlayer.stats.age}
                      </span>
                    </>
                  )}
                </div>

                {/* Base Price */}
                <p className="mt-3 text-base" style={{ color: FIRE_COLORS.ember }}>
                  Base: <span className="font-bold text-lg" style={{ color: FIRE_COLORS.yellow }}>{formatIndianNumber(currentPlayer.base_price)}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center opacity-50">
              <FireFrame size="large">
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <User size={80} className="text-slate-600" />
                </div>
              </FireFrame>
              <p className="mt-6 text-xl" style={{ color: FIRE_COLORS.ember }}>No Player Selected</p>
            </div>
          )}

          {/* Center - Timer and Bid */}
          <div className="flex flex-col items-center gap-4">
            {/* Timer */}
            {status === 'bidding' && (
              <FireTimer duration={timerSeconds} isActive={status === 'bidding'} resetKey={timerKey} />
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
                  {formatIndianNumber(currentBid)}
                </p>
              </div>
            </div>
          </div>

          {/* Team Section (when has team) */}
          {currentTeam && (
            <div className="flex flex-col items-center">
              <FireFrame size="medium">
                {currentTeam.logo_url ? (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-hidden">
                    <img src={currentTeam.logo_url} alt={currentTeam.name} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <span className="text-4xl font-black" style={{ color: FIRE_COLORS.orange }}>
                      {currentTeam.short_name}
                    </span>
                  </div>
                )}
              </FireFrame>

              <div className="mt-5 text-center">
                <h2
                  className="text-2xl md:text-3xl font-black uppercase tracking-wide"
                  style={{ color: FIRE_COLORS.yellow, textShadow: `0 0 25px ${FIRE_COLORS.orange}` }}
                >
                  {currentTeam.name}
                </h2>

                {/* Team Stats - Compact */}
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="text-sm" style={{ color: FIRE_COLORS.ember }}>
                    <span style={{ color: `${FIRE_COLORS.ember}80` }}>Budget:</span> {formatIndianNumber(currentTeam.remaining_budget || 0)}
                  </span>
                  <span style={{ color: `${FIRE_COLORS.orange}50` }}>•</span>
                  <span className="text-sm" style={{ color: FIRE_COLORS.ember }}>
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
        .animate-ember-rise { animation: ember-rise linear infinite; }
        .animate-flame-back { animation: flame-back ease-in-out infinite; }
        .animate-flame-front { animation: flame-front ease-in-out infinite; }
        .animate-fire-pulse { animation: fire-pulse 2s ease-in-out infinite; }
        .animate-fire-glow { animation: fire-glow 1.5s ease-in-out infinite; }
        .animate-bid-glow { animation: bid-glow 2s ease-in-out infinite; }
        .animate-heat-shimmer { animation: heat-shimmer 3s ease-in-out infinite; }
        .animate-fire-flicker { animation: fire-flicker 0.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
