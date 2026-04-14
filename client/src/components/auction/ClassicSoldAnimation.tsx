import { useState, useEffect } from 'react';
import { Player, Team } from '../../types';
import { User } from 'lucide-react';
import { formatIndianNumber } from '../../utils/formatters';

interface ClassicSoldAnimationProps {
  player: Player;
  team: Team;
  soldPrice: number;
  onComplete: () => void;
  teamColor?: string;
}

export default function ClassicSoldAnimation({
  player,
  team,
  soldPrice,
  onComplete,
  teamColor = '#22c55e'
}: ClassicSoldAnimationProps) {
  const [phase, setPhase] = useState<'spotlight' | 'reveal' | 'merge' | 'price' | 'exit'>('spotlight');
  const [displayPrice, setDisplayPrice] = useState(0);

  // Animation phases
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 500),
      setTimeout(() => setPhase('merge'), 1300),
      setTimeout(() => setPhase('price'), 2100),
      setTimeout(() => setPhase('exit'), 4800),
      setTimeout(() => onComplete(), 5300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Price counter
  useEffect(() => {
    if (phase !== 'price' && phase !== 'exit') return;
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
        ${phase === 'exit' ? 'animate-classic-fade-out' : ''}`}
    >
      {/* Dark overlay */}
      <div
        className={`absolute inset-0 transition-all duration-700
          ${phase === 'spotlight' ? 'bg-black' : 'bg-black/90'}`}
      />

      {/* Spotlight beams */}
      <div className={`absolute inset-0 transition-opacity duration-500
        ${phase === 'spotlight' ? 'opacity-100' : 'opacity-40'}`}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 left-1/2 w-40 h-[150%] origin-top animate-classic-spotlight"
            style={{
              background: `linear-gradient(180deg, ${teamColor}50 0%, transparent 100%)`,
              transform: `translateX(-50%) rotate(${-35 + i * 10}deg)`,
              animationDelay: `${i * 0.08}s`,
              filter: 'blur(15px)',
            }}
          />
        ))}
      </div>

      {/* SOLD! Text - Top */}
      <div
        className={`relative z-10 mb-8 transition-all duration-700 ease-out
          ${phase === 'spotlight' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
          ${phase === 'reveal' ? 'animate-classic-slam' : ''}`}
      >
        <h1
          className="text-6xl md:text-8xl font-black text-white uppercase tracking-[0.2em] animate-classic-text-glow"
          style={{
            textShadow: `0 0 60px ${teamColor}, 0 0 120px ${teamColor}80, 0 0 180px ${teamColor}40`,
          }}
        >
          SOLD!
        </h1>
      </div>

      {/* Player and Team */}
      <div className="relative z-10 flex items-center justify-center gap-8 md:gap-16 mb-8">

        {/* Player */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out
            ${phase === 'spotlight' ? 'translate-x-[-100px] opacity-0 scale-75' : 'translate-x-0 opacity-100 scale-100'}`}
          style={{ transitionDelay: '0.2s' }}
        >
          {/* Glow ring */}
          <div
            className="absolute -inset-6 rounded-full animate-classic-pulse-glow"
            style={{
              background: `radial-gradient(circle, ${teamColor}50, transparent 70%)`,
              filter: 'blur(25px)',
            }}
          />

          {/* Photo */}
          <div
            className="relative w-40 h-40 md:w-56 md:h-56 rounded-full p-1.5 mb-4"
            style={{
              background: `linear-gradient(135deg, ${teamColor}, ${teamColor}80)`,
              boxShadow: `0 0 50px ${teamColor}70, 0 0 100px ${teamColor}40`,
            }}
          >
            <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden">
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                  <User size={70} className="text-slate-500" />
                </div>
              )}
            </div>

            {/* Jersey badge */}
            {player.jersey_number && (
              <div
                className={`absolute -top-1 -right-1 w-14 h-14 rounded-full flex items-center justify-center
                  text-white font-black text-xl shadow-2xl transition-all duration-500
                  ${phase === 'merge' || phase === 'price' || phase === 'exit' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                style={{
                  background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)`,
                  boxShadow: `0 0 25px ${teamColor}80`,
                }}
              >
                #{player.jersey_number}
              </div>
            )}
          </div>

          {/* Player name */}
          <h2
            className={`text-2xl md:text-3xl font-black text-white uppercase tracking-wide text-center transition-all duration-500
              ${phase === 'merge' || phase === 'price' || phase === 'exit' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            style={{ textShadow: `0 0 30px ${teamColor}60` }}
          >
            {player.name}
          </h2>
        </div>

        {/* Arrow */}
        <div
          className={`transition-all duration-500
            ${phase === 'merge' || phase === 'price' || phase === 'exit' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
        >
          <svg width="70" height="50" viewBox="0 0 70 50" style={{ filter: `drop-shadow(0 0 15px ${teamColor})` }}>
            <path
              d="M 5 25 L 50 25 M 40 12 L 58 25 L 40 38"
              fill="none"
              stroke={teamColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Team */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out
            ${phase === 'spotlight' ? 'translate-x-[100px] opacity-0 scale-75' : 'translate-x-0 opacity-100 scale-100'}`}
          style={{ transitionDelay: '0.3s' }}
        >
          {/* Glow */}
          <div
            className="absolute -inset-6 rounded-full animate-classic-pulse-glow"
            style={{
              background: `radial-gradient(circle, ${teamColor}40, transparent 70%)`,
              filter: 'blur(20px)',
              animationDelay: '0.5s',
            }}
          />

          {/* Logo */}
          <div
            className="relative w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center mb-4"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${teamColor}25 0%, #0a0a15 80%)`,
              border: `4px solid ${teamColor}70`,
              boxShadow: `0 0 50px ${teamColor}40, inset 0 0 40px ${teamColor}15`,
            }}
          >
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="w-3/4 h-3/4 object-contain drop-shadow-2xl" />
            ) : (
              <span className="text-5xl md:text-6xl font-black" style={{ color: teamColor }}>
                {team.short_name}
              </span>
            )}
          </div>

          {/* Team name */}
          <h2
            className={`text-2xl md:text-3xl font-black text-white uppercase tracking-wide text-center transition-all duration-500
              ${phase === 'merge' || phase === 'price' || phase === 'exit' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            style={{ textShadow: `0 0 30px ${teamColor}60`, transitionDelay: '0.1s' }}
          >
            {team.name}
          </h2>
        </div>
      </div>

      {/* Price */}
      <div
        className={`relative z-10 text-center transition-all duration-700
          ${phase === 'price' || phase === 'exit' ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-90'}`}
      >
        <p className="text-white/60 text-sm uppercase tracking-[0.3em] mb-2">Sold For</p>
        <p
          className="text-5xl md:text-7xl font-black animate-classic-text-glow"
          style={{
            color: teamColor,
            textShadow: `0 0 50px ${teamColor}80, 0 0 100px ${teamColor}50`,
          }}
        >
          {formatIndianNumber(displayPrice)}
        </p>

        {/* Base and multiplier */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="text-white/50 text-lg">
            Base: {formatIndianNumber(player.base_price)}
          </span>
          {parseFloat(multiplier) > 1 && (
            <span
              className="px-4 py-1.5 rounded-full text-lg font-bold"
              style={{
                background: `${teamColor}30`,
                color: teamColor,
                boxShadow: `0 0 20px ${teamColor}40`,
              }}
            >
              {multiplier}x
            </span>
          )}
        </div>
      </div>

      {/* Particle burst */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-classic-particle"
            style={{
              left: '50%',
              top: '45%',
              background: i % 3 === 0 ? teamColor : i % 3 === 1 ? '#fbbf24' : '#ffffff',
              boxShadow: `0 0 10px ${i % 3 === 0 ? teamColor : i % 3 === 1 ? '#fbbf24' : '#ffffff'}`,
              animationDelay: `${0.8 + i * 0.03}s`,
              '--angle': `${(i / 40) * 360}deg`,
              '--distance': `${250 + Math.random() * 350}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Bottom flash */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-40 transition-opacity duration-500
          ${phase === 'reveal' || phase === 'merge' ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `linear-gradient(to top, ${teamColor}50, transparent)`,
        }}
      />

      {/* Side glows */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-40 h-96 blur-3xl"
        style={{ background: `radial-gradient(ellipse, ${teamColor}30, transparent)` }}
      />
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-40 h-96 blur-3xl"
        style={{ background: `radial-gradient(ellipse, ${teamColor}30, transparent)` }}
      />

      <style>{`
        @keyframes classic-spotlight {
          0% { opacity: 0; transform: translateX(-50%) rotate(var(--rotation, 0deg)) scaleY(0); }
          50% { opacity: 1; transform: translateX(-50%) rotate(var(--rotation, 0deg)) scaleY(1.2); }
          100% { opacity: 0.4; transform: translateX(-50%) rotate(var(--rotation, 0deg)) scaleY(1); }
        }
        @keyframes classic-slam {
          0% { transform: scale(2.5) translateY(-50px); opacity: 0; }
          60% { transform: scale(1.1) translateY(5px); }
          80% { transform: scale(0.95); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes classic-pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes classic-text-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes classic-particle {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)) scale(0);
            opacity: 0;
          }
        }
        @keyframes classic-fade-out {
          to { opacity: 0; }
        }
        .animate-classic-spotlight { animation: classic-spotlight 1.2s ease-out forwards; }
        .animate-classic-slam { animation: classic-slam 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-classic-pulse-glow { animation: classic-pulse-glow 2.5s ease-in-out infinite; }
        .animate-classic-text-glow { animation: classic-text-glow 2s ease-in-out infinite; }
        .animate-classic-particle { animation: classic-particle 1.8s ease-out forwards; }
        .animate-classic-fade-out { animation: classic-fade-out 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}
