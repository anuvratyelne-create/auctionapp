import { useState, useEffect } from 'react';
import { Player } from '../../../types';
import { soundManager } from '../../../utils/soundManager';
import { getRoleLabel } from '../../../config/playerRoles';
import { formatIndianNumber } from '../../../utils/formatters';

interface PremiumPlayerEntryProps {
  player: Player;
  onComplete: () => void;
}

export default function PremiumPlayerEntry({ player, onComplete }: PremiumPlayerEntryProps) {
  const [phase, setPhase] = useState<'intro' | 'photo' | 'name' | 'stats' | 'ready' | 'exit'>('intro');

  useEffect(() => {
    soundManager.play('whoosh');

    const timers = [
      setTimeout(() => setPhase('photo'), 400),
      setTimeout(() => setPhase('name'), 1000),
      setTimeout(() => setPhase('stats'), 1800),
      setTimeout(() => setPhase('ready'), 2800),
      setTimeout(() => setPhase('exit'), 3500),
      setTimeout(() => onComplete(), 4000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] overflow-hidden ${phase === 'exit' ? 'animate-premium-fade-out' : ''}`}>
      {/* Dark cinematic background */}
      <div className="absolute inset-0 bg-[#030308]" />

      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: phase !== 'intro' ? 'perspective(500px) rotateX(60deg) translateY(-50%)' : 'none',
          transition: 'transform 1s ease-out',
        }}
      />

      {/* Sweeping light beams */}
      <div className={`absolute inset-0 overflow-hidden transition-opacity duration-500 ${phase === 'intro' ? 'opacity-100' : 'opacity-40'}`}>
        <div
          className="absolute top-0 left-1/4 w-[200px] h-[200%] bg-gradient-to-b from-blue-500/40 via-blue-500/20 to-transparent rotate-[20deg] animate-sweep-left"
          style={{ filter: 'blur(30px)' }}
        />
        <div
          className="absolute top-0 right-1/4 w-[200px] h-[200%] bg-gradient-to-b from-amber-500/40 via-amber-500/20 to-transparent -rotate-[20deg] animate-sweep-right"
          style={{ filter: 'blur(30px)' }}
        />
      </div>

      {/* "NOW BIDDING" Banner - Top */}
      <div className={`absolute top-0 left-0 right-0 transition-all duration-700 ease-out ${
        phase === 'intro' ? '-translate-y-full' : 'translate-y-0'
      }`}>
        <div className="relative h-20 bg-gradient-to-r from-red-600 via-red-500 to-red-600 flex items-center justify-center overflow-hidden">
          {/* Animated shine */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" />

          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-white text-3xl font-black tracking-[0.3em] uppercase">Now Bidding</span>
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
        </div>
        {/* Bottom accent */}
        <div className="h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center pt-20">
        <div className="flex items-center gap-16">

          {/* Left - Player Photo */}
          <div className={`relative transition-all duration-700 ease-out ${
            phase === 'intro' ? 'translate-x-[-200px] opacity-0 scale-50' :
            phase === 'photo' ? 'translate-x-0 opacity-100 scale-100' :
            'translate-x-0 opacity-100 scale-100'
          }`}>
            {/* Hexagonal frame glow */}
            <div className="absolute -inset-8">
              <svg viewBox="0 0 100 100" className="w-full h-full animate-rotate-slow">
                <polygon
                  points="50,3 97,25 97,75 50,97 3,75 3,25"
                  fill="none"
                  stroke="url(#hexGradient)"
                  strokeWidth="0.5"
                  className="animate-pulse"
                />
                <defs>
                  <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Photo container */}
            <div className="relative w-72 h-72">
              {/* Rotating border */}
              <div
                className="absolute inset-0 rounded-full p-1 animate-spin-slow"
                style={{
                  background: 'conic-gradient(from 0deg, #3b82f6, #f59e0b, #3b82f6)',
                }}
              >
                <div className="w-full h-full rounded-full bg-[#030308]" />
              </div>

              {/* Photo */}
              <div className="absolute inset-2 rounded-full overflow-hidden border-4 border-slate-800">
                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                    <span className="text-8xl">👤</span>
                  </div>
                )}
              </div>

              {/* Jersey number */}
              <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 transition-all duration-500 ${
                phase === 'stats' || phase === 'ready' || phase === 'exit' ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}>
                <div className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-2xl shadow-red-500/50">
                  <span className="text-white font-black text-3xl">#{player.jersey_number || '00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Player Info */}
          <div className="flex flex-col items-start">
            {/* Name */}
            <div className={`transition-all duration-700 ease-out ${
              phase === 'intro' || phase === 'photo' ? 'translate-x-[100px] opacity-0' : 'translate-x-0 opacity-100'
            }`}>
              <h1 className="text-7xl font-black text-white uppercase tracking-tight mb-4"
                  style={{ textShadow: '0 0 60px rgba(59,130,246,0.5), 0 0 120px rgba(59,130,246,0.3)' }}>
                {player.name}
              </h1>
            </div>

            {/* Role badge */}
            <div className={`transition-all duration-500 delay-100 ${
              phase === 'stats' || phase === 'ready' || phase === 'exit' ? 'translate-x-0 opacity-100' : 'translate-x-[50px] opacity-0'
            }`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="px-6 py-3 bg-gradient-to-r from-amber-500/30 to-amber-600/20 rounded-xl border border-amber-500/50">
                  <span className="text-amber-400 text-2xl font-bold uppercase tracking-wider">
                    {getRoleLabel(player.stats?.role || player.role) || 'Player'}
                  </span>
                </div>
                {player.categories?.name && (
                  <div className="px-5 py-2.5 bg-blue-500/20 rounded-xl border border-blue-500/40">
                    <span className="text-blue-400 text-xl font-semibold uppercase">
                      {player.categories.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats bars */}
            <div className={`space-y-3 transition-all duration-500 delay-200 ${
              phase === 'stats' || phase === 'ready' || phase === 'exit' ? 'translate-x-0 opacity-100' : 'translate-x-[50px] opacity-0'
            }`}>
              {player.stats?.battingStyle && (
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 w-24 text-right uppercase text-sm tracking-wider">Batting</span>
                  <div className="h-10 px-6 bg-slate-800/80 rounded-lg flex items-center border-l-4 border-blue-500">
                    <span className="text-white font-semibold">{player.stats.battingStyle}</span>
                  </div>
                </div>
              )}
              {player.stats?.bowlingStyle && (
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 w-24 text-right uppercase text-sm tracking-wider">Bowling</span>
                  <div className="h-10 px-6 bg-slate-800/80 rounded-lg flex items-center border-l-4 border-purple-500">
                    <span className="text-white font-semibold">{player.stats.bowlingStyle}</span>
                  </div>
                </div>
              )}
              {player.stats?.age && (
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 w-24 text-right uppercase text-sm tracking-wider">Age</span>
                  <div className="h-10 px-6 bg-slate-800/80 rounded-lg flex items-center border-l-4 border-emerald-500">
                    <span className="text-white font-semibold">{player.stats.age} Years</span>
                  </div>
                </div>
              )}
            </div>

            {/* Base Price - Big reveal */}
            <div className={`mt-8 transition-all duration-700 delay-300 ${
              phase === 'ready' || phase === 'exit' ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-90'
            }`}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 to-amber-600/30 rounded-2xl blur-xl animate-pulse" />
                <div className="relative px-10 py-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl border-2 border-amber-500/50">
                  <p className="text-amber-400/80 text-sm uppercase tracking-[0.2em] mb-2">Base Price</p>
                  <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400">
                    {formatIndianNumber(player.base_price)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom ticker */}
      <div className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ${
        phase === 'intro' ? 'translate-y-full' : 'translate-y-0'
      }`}>
        <div className="h-1 bg-gradient-to-r from-blue-500 via-amber-500 to-blue-500" />
        <div className="h-16 bg-gradient-to-t from-slate-900 to-slate-900/80 flex items-center justify-center">
          <div className="flex items-center gap-8 text-slate-400">
            <span className="uppercase tracking-widest text-sm">Live Auction</span>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="uppercase tracking-widest text-sm">Premium Broadcast</span>
          </div>
        </div>
      </div>

      {/* Flying particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-400 rounded-full animate-fly-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes premium-fade-out {
          to { opacity: 0; transform: scale(1.05); }
        }
        @keyframes sweep-left {
          0% { transform: translateX(-100%) rotate(20deg); }
          100% { transform: translateX(200%) rotate(20deg); }
        }
        @keyframes sweep-right {
          0% { transform: translateX(100%) rotate(-20deg); }
          100% { transform: translateX(-200%) rotate(-20deg); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fly-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(-200px) translateX(100px); opacity: 0; }
        }
        .animate-premium-fade-out { animation: premium-fade-out 0.5s ease-out forwards; }
        .animate-sweep-left { animation: sweep-left 3s linear infinite; }
        .animate-sweep-right { animation: sweep-right 3s linear infinite; animation-delay: 1.5s; }
        .animate-shine { animation: shine 2s linear infinite; }
        .animate-rotate-slow { animation: rotate-slow 20s linear infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        .animate-fly-particle { animation: fly-particle 3s ease-out infinite; }
      `}</style>
    </div>
  );
}
