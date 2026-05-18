import { useState, useEffect } from 'react';
import { Player, Team } from '../../types';
import { User } from 'lucide-react';
import { formatAmountCompact } from '../../utils/formatters';
import { soundManager } from '../../utils/soundManager';
import { useUIStore } from '../../stores/uiStore';
import BroadcasterLogo from '../common/BroadcasterLogo';

interface FireSoldAnimationProps {
  player: Player;
  team: Team;
  soldPrice: number;
  onComplete: () => void;
  tournament?: {
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  };
}

const FIRE_COLORS = {
  orange: '#f97316',
  yellow: '#fbbf24',
  red: '#ef4444',
  darkRed: '#991b1b',
  ember: '#fdba74',
};

export default function FireSoldAnimation({
  player,
  team,
  soldPrice,
  onComplete,
  tournament,
}: FireSoldAnimationProps) {
  const [phase, setPhase] = useState<'blackout' | 'stamp' | 'reveal' | 'merge' | 'price' | 'celebrate' | 'exit'>('blackout');
  const [displayPrice, setDisplayPrice] = useState(0);
  const { displayMode } = useUIStore();
  const usePoints = displayMode === 'points';

  // Animation phases - 10 second total duration
  useEffect(() => {
    let cancelled = false;

    // Play sold sound
    soundManager.play('sold');

    const timers = [
      setTimeout(() => !cancelled && setPhase('stamp'), 400),
      setTimeout(() => !cancelled && setPhase('reveal'), 1800),
      setTimeout(() => !cancelled && setPhase('merge'), 3500),
      setTimeout(() => !cancelled && setPhase('price'), 5500),
      setTimeout(() => !cancelled && setPhase('celebrate'), 7500),
      setTimeout(() => !cancelled && setPhase('exit'), 9500),
      setTimeout(() => {
        if (!cancelled) onComplete();
      }, 10000),
    ];

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Price counter
  useEffect(() => {
    if (phase !== 'price' && phase !== 'celebrate' && phase !== 'exit') return;
    const steps = 20;
    const increment = soldPrice / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayPrice(soldPrice);
        clearInterval(timer);
      } else {
        setDisplayPrice(Math.round(current));
      }
    }, 30);
    return () => clearInterval(timer);
  }, [phase, soldPrice]);

  const multiplier = player.base_price > 0 ? (soldPrice / player.base_price).toFixed(1) : '1.0';

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden
        ${phase === 'exit' ? 'animate-fire-exit' : ''}`}
      style={{ background: '#0a0505' }}
    >
      {/* Dark gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, #1a0a0a 0%, #0a0505 60%, #050202 100%)',
        }}
      />

      {/* Broadcaster Logo - Top Right */}
      {tournament?.broadcaster_logo_url && (
        <BroadcasterLogo
          logoUrl={tournament.broadcaster_logo_url}
          name={tournament.broadcaster_name}
          size="lg"
          position="top-right"
          theme="fire"
          showName={false}
          animate
        />
      )}

      {/* Heat shimmer effect */}
      <div className="absolute inset-0 animate-heat-shimmer opacity-20 pointer-events-none" />

      {/* Rising embers - gentle, like the layout */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-ember-float"
            style={{
              left: `${5 + Math.random() * 90}%`,
              bottom: '-10px',
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: i % 3 === 0 ? FIRE_COLORS.yellow : i % 3 === 1 ? FIRE_COLORS.orange : FIRE_COLORS.ember,
              boxShadow: `0 0 ${4 + Math.random() * 6}px ${i % 3 === 0 ? FIRE_COLORS.yellow : FIRE_COLORS.orange}`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Bottom flames - fire video like the layout */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[5]" style={{ height: '60vh' }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute bottom-0 left-0 w-full object-cover"
          style={{
            mixBlendMode: 'screen',
            height: '65vh',
            opacity: phase === 'blackout' ? 0 : 0.7,
            transition: 'opacity 0.5s ease-out',
          }}
        >
          <source src="/images/fire-bottom.mp4" type="video/mp4" />
        </video>

        {/* Gradient mask */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, #0a0505 0%, #0a0505cc 20%, #0a050540 40%, transparent 70%)',
          }}
        />

        {/* Warm ambient glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40"
          style={{
            background: `radial-gradient(ellipse 120% 100% at center bottom, ${FIRE_COLORS.orange}40 0%, ${FIRE_COLORS.red}25 40%, transparent 100%)`,
            filter: 'blur(30px)',
          }}
        />
      </div>

      {/* Screen flash effect on stamp */}
      <div
        className={`absolute inset-0 z-40 pointer-events-none ${
          phase === 'stamp' ? 'animate-screen-flash' : 'opacity-0'
        }`}
        style={{
          background: `radial-gradient(circle, ${FIRE_COLORS.orange}80, ${FIRE_COLORS.red}40, transparent)`,
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FIRE SOLD STAMP - Slams down dramatically */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`absolute top-12 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          phase !== 'blackout' ? 'opacity-100' : 'opacity-0'
        } ${phase === 'stamp' ? 'animate-stamp-slam' : ''}`}
      >
        <img
          src="/images/fire-sold-stamp.png"
          alt="SOLD"
          className="w-[450px] md:w-[600px] h-auto object-contain"
          style={{
            filter: `drop-shadow(0 0 40px ${FIRE_COLORS.orange}) drop-shadow(0 0 80px ${FIRE_COLORS.red})`,
          }}
          onError={(e) => {
            // Fallback to text if image not found
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = `<h1 class="text-9xl md:text-[10rem] font-black uppercase tracking-wider" style="background: linear-gradient(180deg, #ffffff 0%, ${FIRE_COLORS.yellow} 20%, ${FIRE_COLORS.orange} 50%, ${FIRE_COLORS.red} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 40px ${FIRE_COLORS.orange});">SOLD!</h1>`;
            }
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT - Player and Team with Fire Frames */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 flex items-center justify-center gap-8 md:gap-16 mt-28">

        {/* Player with Fire Frame */}
        <div
          className={`flex flex-col items-center transition-all duration-1000 ease-out ${
            phase === 'blackout' || phase === 'stamp'
              ? 'translate-x-[-200px] opacity-0 scale-50 rotate-[-15deg]'
              : 'translate-x-0 opacity-100 scale-100 rotate-0'
          }`}
        >
          <div className="relative w-80 h-80 md:w-[22rem] md:h-[22rem] flex items-center justify-center">
            {/* Subtle outer glow */}
            <div
              className="absolute rounded-full animate-glow-pulse"
              style={{
                width: '115%',
                height: '115%',
                background: `radial-gradient(circle, transparent 50%, ${FIRE_COLORS.orange}25 70%, ${FIRE_COLORS.red}15 85%, transparent 95%)`,
                filter: 'blur(15px)',
              }}
            />

            {/* Rising embers behind the ring */}
            <div className="absolute inset-0 overflow-visible pointer-events-none">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full animate-ember-float"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    bottom: '15%',
                    width: `${2 + Math.random() * 3}px`,
                    height: `${2 + Math.random() * 3}px`,
                    background: i % 3 === 0 ? FIRE_COLORS.yellow : i % 3 === 1 ? FIRE_COLORS.orange : FIRE_COLORS.ember,
                    boxShadow: `0 0 ${4 + Math.random() * 4}px ${i % 3 === 0 ? FIRE_COLORS.yellow : FIRE_COLORS.orange}`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                    animationDelay: `${Math.random() * 2}s`,
                    zIndex: 1,
                  }}
                />
              ))}
            </div>

            {/* Fire ring PNG */}
            <img
              src="/images/fire-ring.png"
              alt=""
              className="absolute w-full h-full object-contain pointer-events-none z-[5]"
              style={{
                filter: `drop-shadow(0 0 15px ${FIRE_COLORS.orange}90) drop-shadow(0 0 30px ${FIRE_COLORS.red}50)`,
                transform: 'scale(1.1)',
              }}
            />

            {/* Player photo */}
            <div
              className="relative w-52 h-52 md:w-60 md:h-60 rounded-full overflow-hidden z-10"
              style={{
                boxShadow: `0 0 40px ${FIRE_COLORS.orange}50, inset 0 0 30px ${FIRE_COLORS.orange}20`,
              }}
            >
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <User size={70} className="text-slate-600" />
                </div>
              )}
              {/* Subtle flame overlay on photo edges */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, transparent 60%, ${FIRE_COLORS.orange}15 80%, ${FIRE_COLORS.red}25 100%)`,
                }}
              />
            </div>

            {/* Player UID badge */}
            {player.player_uid && (
              <div
                className={`absolute -top-3 -right-3 z-20 transition-all duration-700 ${
                  phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
                    ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                }`}
              >
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-black text-xl md:text-2xl text-white animate-badge-pulse"
                  style={{
                    background: `linear-gradient(135deg, ${FIRE_COLORS.orange}, ${FIRE_COLORS.red})`,
                    boxShadow: `0 0 30px ${FIRE_COLORS.orange}`,
                  }}
                >
                  {player.player_uid}
                </div>
              </div>
            )}
          </div>

          {/* Player name */}
          <h2
            className={`mt-6 text-3xl md:text-4xl font-black uppercase tracking-wide text-center transition-all duration-700 ${
              phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
                ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{
              color: FIRE_COLORS.yellow,
              textShadow: `0 0 30px ${FIRE_COLORS.orange}, 0 0 60px ${FIRE_COLORS.red}50`,
            }}
          >
            {player.name}
          </h2>
        </div>

        {/* Fire Arrow */}
        <div
          className={`transition-all duration-700 ${
            phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
              ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
        >
          <div className="animate-arrow-pulse">
            <svg width="140" height="90" viewBox="0 0 140 90" style={{ filter: `drop-shadow(0 0 25px ${FIRE_COLORS.orange}) drop-shadow(0 0 50px ${FIRE_COLORS.red}60)` }}>
              <defs>
                <linearGradient id="soldFireArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={FIRE_COLORS.red} />
                  <stop offset="50%" stopColor={FIRE_COLORS.orange} />
                  <stop offset="100%" stopColor={FIRE_COLORS.yellow} />
                </linearGradient>
              </defs>
              <path
                d="M 15 45 L 90 45 M 70 22 L 110 45 L 70 68"
                fill="none"
                stroke="url(#soldFireArrow)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Team with Fire Frame */}
        <div
          className={`flex flex-col items-center transition-all duration-1000 ease-out ${
            phase === 'blackout' || phase === 'stamp'
              ? 'translate-x-[200px] opacity-0 scale-50 rotate-[15deg]'
              : 'translate-x-0 opacity-100 scale-100 rotate-0'
          }`}
          style={{ transitionDelay: '0.2s' }}
        >
          <div className="relative w-80 h-80 md:w-[22rem] md:h-[22rem] flex items-center justify-center">
            {/* Subtle outer glow */}
            <div
              className="absolute rounded-full animate-glow-pulse"
              style={{
                width: '115%',
                height: '115%',
                background: `radial-gradient(circle, transparent 50%, ${FIRE_COLORS.orange}25 70%, ${FIRE_COLORS.red}15 85%, transparent 95%)`,
                filter: 'blur(15px)',
                animationDelay: '0.5s',
              }}
            />

            {/* Rising embers behind the ring */}
            <div className="absolute inset-0 overflow-visible pointer-events-none">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full animate-ember-float"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    bottom: '15%',
                    width: `${2 + Math.random() * 3}px`,
                    height: `${2 + Math.random() * 3}px`,
                    background: i % 3 === 0 ? FIRE_COLORS.yellow : i % 3 === 1 ? FIRE_COLORS.orange : FIRE_COLORS.ember,
                    boxShadow: `0 0 ${4 + Math.random() * 4}px ${i % 3 === 0 ? FIRE_COLORS.yellow : FIRE_COLORS.orange}`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                    animationDelay: `${Math.random() * 2}s`,
                    zIndex: 1,
                  }}
                />
              ))}
            </div>

            {/* Fire ring PNG */}
            <img
              src="/images/fire-ring.png"
              alt=""
              className="absolute w-full h-full object-contain pointer-events-none z-[5]"
              style={{
                filter: `drop-shadow(0 0 15px ${FIRE_COLORS.orange}90) drop-shadow(0 0 30px ${FIRE_COLORS.red}50)`,
                transform: 'scale(1.1)',
              }}
            />

            {/* Team logo */}
            <div
              className="relative w-52 h-52 md:w-60 md:h-60 rounded-full overflow-hidden flex items-center justify-center z-10 p-4"
              style={{
                background: `radial-gradient(circle, ${FIRE_COLORS.orange}15, #0a0505)`,
                boxShadow: `0 0 40px ${FIRE_COLORS.orange}40, inset 0 0 30px ${FIRE_COLORS.red}20`,
              }}
            >
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-5xl font-black" style={{ color: FIRE_COLORS.orange }}>
                  {team.short_name}
                </span>
              )}
            </div>
          </div>

          {/* Team name */}
          <h2
            className={`mt-6 text-3xl md:text-4xl font-black uppercase tracking-wide text-center transition-all duration-700 ${
              phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
                ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{
              color: FIRE_COLORS.yellow,
              textShadow: `0 0 30px ${FIRE_COLORS.orange}, 0 0 60px ${FIRE_COLORS.red}50`,
              transitionDelay: '0.15s',
            }}
          >
            {team.name}
          </h2>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PRICE SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`absolute bottom-28 left-0 right-0 z-30 flex flex-col items-center transition-all duration-1000 ${
          phase === 'price' || phase === 'celebrate' || phase === 'exit'
            ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-90'
        }`}
      >
        <p
          className="text-base md:text-lg uppercase tracking-[0.4em] mb-4"
          style={{ color: `${FIRE_COLORS.orange}` }}
        >
          Sold For
        </p>

        <div className="relative">
          {/* Glow background */}
          <div
            className="absolute inset-0 animate-bid-glow rounded-2xl"
            style={{
              background: `radial-gradient(ellipse, ${FIRE_COLORS.orange}40, transparent 70%)`,
              filter: 'blur(25px)',
              transform: 'scale(2)',
            }}
          />
          <p
            className="relative text-7xl md:text-9xl font-black tabular-nums animate-fire-glow"
            style={{
              background: `linear-gradient(180deg, #ffffff 0%, ${FIRE_COLORS.yellow} 20%, ${FIRE_COLORS.orange} 60%, ${FIRE_COLORS.red} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {formatAmountCompact(displayPrice, usePoints)}
          </p>
        </div>

        {/* Base price and multiplier */}
        <div
          className={`flex items-center justify-center gap-8 mt-6 transition-all duration-700 ${
            phase === 'celebrate' || phase === 'exit' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <span className="text-lg" style={{ color: FIRE_COLORS.ember }}>
            Base: {formatAmountCompact(player.base_price, usePoints)}
          </span>
          {parseFloat(multiplier) > 1 && (
            <span
              className="px-6 py-2 rounded-full font-black text-xl animate-multiplier-glow"
              style={{
                background: `linear-gradient(135deg, ${FIRE_COLORS.orange}60, ${FIRE_COLORS.red}40)`,
                color: FIRE_COLORS.yellow,
                boxShadow: `0 0 25px ${FIRE_COLORS.orange}80`,
                border: `2px solid ${FIRE_COLORS.orange}`,
              }}
            >
              {multiplier}x
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fire-exit {
          to { opacity: 0; transform: scale(1.1); }
        }
        @keyframes stamp-slam {
          0% { transform: translateX(-50%) scale(4) rotate(-20deg); opacity: 0; }
          40% { transform: translateX(-50%) scale(1.15) rotate(-12deg); opacity: 1; }
          60% { transform: translateX(-50%) scale(0.9) rotate(-8deg); }
          80% { transform: translateX(-50%) scale(1.05) rotate(-11deg); }
          100% { transform: translateX(-50%) scale(1) rotate(-10deg); opacity: 1; }
        }
        @keyframes screen-flash {
          0% { opacity: 0; }
          20% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        @keyframes ember-float {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? '' : '-'}${20 + Math.random() * 30}px) scale(0);
            opacity: 0;
          }
        }
        @keyframes heat-shimmer {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes fire-glow {
          0%, 100% {
            filter: drop-shadow(0 0 25px ${FIRE_COLORS.orange}80);
          }
          50% {
            filter: drop-shadow(0 0 50px ${FIRE_COLORS.orange}) drop-shadow(0 0 80px ${FIRE_COLORS.red});
          }
        }
        @keyframes bid-glow {
          0%, 100% { opacity: 0.5; transform: scale(1.5); }
          50% { opacity: 1; transform: scale(2); }
        }
        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px ${FIRE_COLORS.orange}; }
          50% { transform: scale(1.1); box-shadow: 0 0 50px ${FIRE_COLORS.orange}, 0 0 80px ${FIRE_COLORS.red}; }
        }
        @keyframes multiplier-glow {
          0%, 100% { box-shadow: 0 0 25px ${FIRE_COLORS.orange}80; }
          50% { box-shadow: 0 0 40px ${FIRE_COLORS.orange}, 0 0 60px ${FIRE_COLORS.red}80; }
        }
        @keyframes arrow-pulse {
          0%, 100% { transform: scale(1) translateX(0); }
          50% { transform: scale(1.1) translateX(5px); }
        }
        .animate-fire-exit { animation: fire-exit 0.5s ease-out forwards; }
        .animate-arrow-pulse { animation: arrow-pulse 1s ease-in-out infinite; }
        .animate-stamp-slam { animation: stamp-slam 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-screen-flash { animation: screen-flash 0.6s ease-out forwards; }
        .animate-ember-float { animation: ember-float linear infinite; }
        .animate-heat-shimmer { animation: heat-shimmer 3s ease-in-out infinite; }
        .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
        .animate-fire-glow { animation: fire-glow 1.5s ease-in-out infinite; }
        .animate-bid-glow { animation: bid-glow 2s ease-in-out infinite; }
        .animate-badge-pulse { animation: badge-pulse 1.5s ease-in-out infinite; }
        .animate-multiplier-glow { animation: multiplier-glow 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
