import { useState, useEffect } from 'react';
import { Player } from '../../types';
import { User } from 'lucide-react';
import { soundManager } from '../../utils/soundManager';
import { getRoleLabel, getRoleIcon, convertLegacyRole } from '../../config/playerRoles';

interface PlayerEntryAnimationProps {
  player: Player;
  onComplete: () => void;
  accentColor?: string;
}

export default function PlayerEntryAnimation({
  player,
  onComplete,
  accentColor = '#22c55e'
}: PlayerEntryAnimationProps) {
  const [phase, setPhase] = useState<'spotlight' | 'reveal' | 'details' | 'exit'>('spotlight');

  useEffect(() => {
    // Play whoosh sound at start
    soundManager.play('whoosh');

    // Animation sequence
    const timers = [
      setTimeout(() => setPhase('reveal'), 600),
      setTimeout(() => setPhase('details'), 1400),
      setTimeout(() => setPhase('exit'), 3000),
      setTimeout(() => onComplete(), 3500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const roleValue = player.stats?.role ? convertLegacyRole(player.stats.role) : null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden
      ${phase === 'exit' ? 'animate-fade-out' : ''}`}
    >
      {/* Dark overlay with radial spotlight */}
      <div
        className={`absolute inset-0 transition-all duration-700
          ${phase === 'spotlight' ? 'bg-black' : 'bg-black/90'}`}
      />

      {/* Spotlight beams */}
      <div className={`absolute inset-0 transition-opacity duration-500
        ${phase === 'spotlight' ? 'opacity-100' : 'opacity-30'}`}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 left-1/2 w-32 h-[150%] origin-top animate-spotlight-entry"
            style={{
              background: `linear-gradient(180deg, ${accentColor}40 0%, transparent 100%)`,
              transform: `translateX(-50%) rotate(${-30 + i * 12}deg)`,
              animationDelay: `${i * 0.1}s`,
              filter: 'blur(10px)',
            }}
          />
        ))}
      </div>

      {/* Center content container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Player Photo with dramatic entrance */}
        <div
          className={`relative mb-6 transition-all duration-700 ease-out
            ${phase === 'spotlight' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
            ${phase === 'reveal' ? 'animate-photo-slam' : ''}`}
        >
          {/* Glow ring */}
          <div
            className="absolute -inset-4 rounded-full animate-pulse-glow"
            style={{
              background: `radial-gradient(circle, ${accentColor}60, transparent 70%)`,
              filter: 'blur(20px)',
            }}
          />

          {/* Photo frame */}
          <div
            className="relative w-48 h-48 md:w-64 md:h-64 rounded-full p-1.5 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
              boxShadow: `0 0 60px ${accentColor}80, 0 0 120px ${accentColor}40`,
            }}
          >
            <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                  <User size={80} className="text-slate-500" />
                </div>
              )}
            </div>
          </div>

          {/* Jersey number badge */}
          {player.jersey_number && (
            <div
              className={`absolute -top-2 -right-2 w-16 h-16 rounded-full flex items-center justify-center
                text-white font-black text-2xl shadow-2xl transition-all duration-500
                ${phase === 'details' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                boxShadow: `0 0 30px ${accentColor}60`,
              }}
            >
              {player.jersey_number}
            </div>
          )}
        </div>

        {/* Player Name - Dramatic reveal */}
        <div
          className={`text-center transition-all duration-700 ease-out
            ${phase === 'spotlight' || phase === 'reveal' ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}
        >
          <h1
            className="text-4xl md:text-6xl font-black text-white uppercase tracking-wider mb-3 animate-text-glow"
            style={{
              textShadow: `0 0 40px ${accentColor}80, 0 0 80px ${accentColor}40`,
            }}
          >
            {player.name}
          </h1>

          {/* Role with icon */}
          {roleValue && (
            <div
              className={`flex items-center justify-center gap-3 mb-4 transition-all duration-500 delay-200
                ${phase === 'details' ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
            >
              <span className="text-4xl">{getRoleIcon(roleValue)}</span>
              <span className="text-xl md:text-2xl font-bold text-white/80 uppercase tracking-wide">
                {getRoleLabel(roleValue)}
              </span>
            </div>
          )}

          {/* Category Badge */}
          {player.categories && (
            <div
              className={`inline-block transition-all duration-500 delay-300
                ${phase === 'details' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
            >
              <span
                className="px-6 py-2 rounded-full text-lg font-bold text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                  boxShadow: `0 0 20px ${accentColor}50`,
                }}
              >
                {player.categories.name}
              </span>
            </div>
          )}

          {/* Base Price */}
          <div
            className={`mt-6 transition-all duration-500 delay-400
              ${phase === 'details' ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
          >
            <p className="text-white/60 text-sm uppercase tracking-widest mb-1">Base Price</p>
            <p
              className="text-4xl md:text-5xl font-black text-white"
              style={{
                textShadow: `0 0 30px ${accentColor}60`,
              }}
            >
              ₹{player.base_price?.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Particle effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-particle-burst"
            style={{
              left: '50%',
              top: '50%',
              background: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
              animationDelay: `${0.5 + i * 0.05}s`,
              '--angle': `${(i / 30) * 360}deg`,
              '--distance': `${200 + Math.random() * 300}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Bottom flash */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-32 transition-opacity duration-300
          ${phase === 'reveal' ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `linear-gradient(to top, ${accentColor}40, transparent)`,
        }}
      />

      <style>{`
        @keyframes spotlight-entry {
          0% { opacity: 0; transform: translateX(-50%) rotate(var(--rotation, 0deg)) scaleY(0); }
          50% { opacity: 1; transform: translateX(-50%) rotate(var(--rotation, 0deg)) scaleY(1.2); }
          100% { opacity: 0.3; transform: translateX(-50%) rotate(var(--rotation, 0deg)) scaleY(1); }
        }
        @keyframes photo-slam {
          0% { transform: scale(2) translateY(-100px); opacity: 0; }
          60% { transform: scale(1.1) translateY(10px); }
          80% { transform: scale(0.95) translateY(-5px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes text-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes particle-burst {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)) scale(0);
            opacity: 0;
          }
        }
        @keyframes fade-out {
          to { opacity: 0; }
        }
        .animate-spotlight-entry { animation: spotlight-entry 1s ease-out forwards; }
        .animate-photo-slam { animation: photo-slam 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-text-glow { animation: text-glow 2s ease-in-out infinite; }
        .animate-particle-burst { animation: particle-burst 1.5s ease-out forwards; }
        .animate-fade-out { animation: fade-out 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}
