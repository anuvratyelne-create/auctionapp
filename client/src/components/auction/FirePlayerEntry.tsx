import { useState, useEffect } from 'react';
import { Player } from '../../types';
import { User } from 'lucide-react';
import { formatIndianNumber } from '../../utils/formatters';
import { soundManager } from '../../utils/soundManager';

interface FirePlayerEntryProps {
  player: Player;
  onComplete: () => void;
}

const FIRE_COLORS = {
  orange: '#f97316',
  yellow: '#fbbf24',
  red: '#ef4444',
  darkRed: '#991b1b',
  ember: '#fdba74',
};

export default function FirePlayerEntry({ player, onComplete }: FirePlayerEntryProps) {
  const [phase, setPhase] = useState<'blackout' | 'ignite' | 'reveal' | 'name' | 'stats' | 'ready' | 'exit'>('blackout');

  useEffect(() => {
    soundManager.play('whoosh');

    const timers = [
      setTimeout(() => setPhase('ignite'), 400),
      setTimeout(() => setPhase('reveal'), 1200),
      setTimeout(() => setPhase('name'), 3000),
      setTimeout(() => setPhase('stats'), 5000),
      setTimeout(() => setPhase('ready'), 7000),
      setTimeout(() => setPhase('exit'), 9000),
      setTimeout(() => onComplete(), 10000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden
        ${phase === 'exit' ? 'animate-entry-fade-out' : ''}`}
      style={{ background: '#050202' }}
    >
      {/* Real fire video background - full screen */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: phase === 'blackout' ? 0 : 0.4,
          transition: 'opacity 0.5s ease-out',
          filter: 'blur(2px)',
        }}
      >
        <source src="/images/fire-bottom.mp4" type="video/mp4" />
      </video>

      {/* Dark vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, #050202 70%)',
        }}
      />

      {/* Dramatic light rays */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          phase !== 'blackout' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 origin-center animate-ray-sweep"
            style={{
              width: '4px',
              height: '150vh',
              background: `linear-gradient(to bottom, transparent, ${FIRE_COLORS.orange}40, ${FIRE_COLORS.yellow}20, transparent)`,
              transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
              animationDelay: `${i * 0.1}s`,
              filter: 'blur(3px)',
            }}
          />
        ))}
      </div>

      {/* Rising embers - subtle particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-entry-ember"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-10px',
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: i % 3 === 0 ? FIRE_COLORS.yellow : i % 3 === 1 ? FIRE_COLORS.orange : FIRE_COLORS.ember,
              boxShadow: `0 0 ${4 + Math.random() * 6}px ${i % 3 === 0 ? FIRE_COLORS.yellow : FIRE_COLORS.orange}`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Center content container */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Player Photo with fire ring */}
        <div
          className={`relative transition-all duration-700 ease-out ${
            phase === 'blackout' || phase === 'ignite'
              ? 'scale-0 opacity-0'
              : 'scale-100 opacity-100'
          }`}
          style={{
            transform: phase === 'reveal' ? 'scale(1.1)' : undefined,
          }}
        >
          <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
            {/* Outer glow pulse */}
            <div
              className="absolute inset-0 rounded-full animate-glow-pulse"
              style={{
                background: `radial-gradient(circle, ${FIRE_COLORS.orange}50, transparent 60%)`,
                filter: 'blur(40px)',
              }}
            />

            {/* Fire ring PNG */}
            <img
              src="/images/fire-ring.png"
              alt=""
              className={`absolute w-full h-full object-contain pointer-events-none transition-all duration-500 ${
                phase === 'reveal' ? 'animate-ring-entrance' : ''
              }`}
              style={{
                filter: `drop-shadow(0 0 30px ${FIRE_COLORS.orange})`,
                transform: 'scale(1.15)',
              }}
            />

            {/* Photo container */}
            <div
              className={`relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden z-10 transition-all duration-500 ${
                phase === 'reveal' ? 'animate-photo-slam' : ''
              }`}
              style={{
                boxShadow: `0 0 40px ${FIRE_COLORS.orange}60, inset 0 0 30px ${FIRE_COLORS.orange}30`,
              }}
            >
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <User size={80} className="text-slate-600" />
                </div>
              )}
            </div>

            {/* Jersey number badge */}
            {player.jersey_number && (
              <div
                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 transition-all duration-500 ${
                  phase === 'name' || phase === 'stats' || phase === 'ready' || phase === 'exit'
                    ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-75'
                }`}
              >
                <div
                  className="px-6 py-2 rounded-full font-black text-2xl text-white"
                  style={{
                    background: `linear-gradient(135deg, ${FIRE_COLORS.orange}, ${FIRE_COLORS.red})`,
                    boxShadow: `0 0 30px ${FIRE_COLORS.orange}80`,
                  }}
                >
                  #{player.jersey_number}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player Name */}
        <div
          className={`mt-8 text-center transition-all duration-700 ${
            phase === 'name' || phase === 'stats' || phase === 'ready' || phase === 'exit'
              ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`}
        >
          <h1
            className="text-5xl md:text-7xl font-black uppercase tracking-wider"
            style={{
              background: `linear-gradient(180deg, #fff 0%, ${FIRE_COLORS.yellow} 30%, ${FIRE_COLORS.orange} 70%, ${FIRE_COLORS.red} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: `drop-shadow(0 0 20px ${FIRE_COLORS.orange})`,
            }}
          >
            {player.name}
          </h1>

          {/* Role & Category */}
          <div className={`flex items-center justify-center gap-3 mt-4 transition-all duration-500 delay-100 ${
            phase === 'name' || phase === 'stats' || phase === 'ready' || phase === 'exit'
              ? 'opacity-100' : 'opacity-0'
          }`}>
            {player.categories && (
              <span
                className="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider"
                style={{
                  background: `linear-gradient(135deg, ${FIRE_COLORS.orange}40, ${FIRE_COLORS.red}30)`,
                  color: FIRE_COLORS.yellow,
                  border: `1px solid ${FIRE_COLORS.orange}60`,
                }}
              >
                {player.categories.name}
              </span>
            )}
          </div>
        </div>

        {/* Base Price */}
        <div
          className={`mt-8 text-center transition-all duration-700 ${
            phase === 'stats' || phase === 'ready' || phase === 'exit'
              ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-90'
          }`}
        >
          <p className="text-sm uppercase tracking-[0.3em] mb-3" style={{ color: `${FIRE_COLORS.ember}` }}>
            Base Price
          </p>
          <div
            className="inline-block px-10 py-4 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${FIRE_COLORS.orange}25, ${FIRE_COLORS.red}15)`,
              border: `2px solid ${FIRE_COLORS.orange}80`,
              boxShadow: `0 0 50px ${FIRE_COLORS.orange}40`,
            }}
          >
            <span
              className="text-5xl md:text-6xl font-black tabular-nums"
              style={{
                background: `linear-gradient(180deg, ${FIRE_COLORS.yellow} 0%, ${FIRE_COLORS.orange} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {formatIndianNumber(player.base_price)}
            </span>
          </div>
        </div>
      </div>

      {/* "LET THE BIDDING BEGIN" text */}
      <div
        className={`absolute bottom-20 left-0 right-0 text-center transition-all duration-700 ${
          phase === 'ready' || phase === 'exit' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <p
          className="text-2xl md:text-3xl font-bold uppercase tracking-[0.2em]"
          style={{
            color: FIRE_COLORS.yellow,
            textShadow: `0 0 30px ${FIRE_COLORS.orange}, 0 0 60px ${FIRE_COLORS.red}80`,
          }}
        >
          🔥 Let The Bidding Begin! 🔥
        </p>
      </div>

      <style>{`
        @keyframes entry-fade-out {
          to { opacity: 0; transform: scale(1.1); }
        }
        @keyframes entry-ember {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? '30' : '-30'}px) scale(0); opacity: 0; }
        }
        @keyframes ray-sweep {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        @keyframes ring-entrance {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(10deg); opacity: 1; }
          100% { transform: scale(1.15) rotate(0deg); opacity: 1; }
        }
        @keyframes photo-slam {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-entry-fade-out { animation: entry-fade-out 0.5s ease-out forwards; }
        .animate-entry-ember { animation: entry-ember linear infinite; }
        .animate-ray-sweep { animation: ray-sweep 2s ease-in-out infinite; }
        .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
        .animate-ring-entrance { animation: ring-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-photo-slam { animation: photo-slam 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
}
