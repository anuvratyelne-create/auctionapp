import { useState, useEffect } from 'react';
import { Player } from '../../../types';
import { soundManager } from '../../../utils/soundManager';
import { getRoleLabel } from '../../../config/playerRoles';
import { formatAmountCompact } from '../../../utils/formatters';
import { useUIStore } from '../../../stores/uiStore';
import BroadcasterLogo from '../../common/BroadcasterLogo';

interface PremiumPlayerEntryProps {
  player: Player;
  onComplete: () => void;
  tournament?: {
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  };
}

export default function PremiumPlayerEntry({ player, onComplete, tournament }: PremiumPlayerEntryProps) {
  // Add 'broadcasterIntro' phase for broadcaster logo display
  const [phase, setPhase] = useState<'broadcasterIntro' | 'intro' | 'photo' | 'name' | 'stats' | 'ready' | 'exit'>('broadcasterIntro');
  const { displayMode } = useUIStore();
  const usePoints = displayMode === 'points';

  // Check if we have a broadcaster logo
  const hasBroadcasterLogo = !!tournament?.broadcaster_logo_url;
  // Intro duration - skip if no logo
  const introDuration = hasBroadcasterLogo ? 2500 : 0;

  useEffect(() => {
    // Play sound after broadcaster intro
    if (hasBroadcasterLogo) {
      setTimeout(() => soundManager.play('whoosh'), introDuration);
    } else {
      soundManager.play('whoosh');
    }

    const timers = [
      setTimeout(() => setPhase('intro'), introDuration),
      setTimeout(() => setPhase('photo'), introDuration + 400),
      setTimeout(() => setPhase('name'), introDuration + 1000),
      setTimeout(() => setPhase('stats'), introDuration + 1800),
      setTimeout(() => setPhase('ready'), introDuration + 2800),
      setTimeout(() => setPhase('exit'), introDuration + 3500),
      setTimeout(() => onComplete(), introDuration + 4000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, hasBroadcasterLogo, introDuration]);

  return (
    <div className={`fixed inset-0 z-[100] overflow-hidden ${phase === 'exit' ? 'animate-premium-fade-out' : ''}`}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BROADCASTER INTRO - Big centered logo like football broadcasts */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {phase === 'broadcasterIntro' && tournament?.broadcaster_logo_url && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#030308]">
          {/* Premium gradient background */}
          <div
            className="absolute inset-0 animate-premium-entry-intro-bg"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.2) 0%, #030308 60%)',
            }}
          />

          {/* Sweeping light beams */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute top-0 left-1/4 w-[250px] h-[200%] animate-premium-entry-intro-beam-left"
              style={{
                background: 'linear-gradient(to bottom, rgba(59,130,246,0.4), rgba(59,130,246,0.15), transparent)',
                transform: 'rotate(20deg)',
                filter: 'blur(40px)',
              }}
            />
            <div
              className="absolute top-0 right-1/4 w-[250px] h-[200%] animate-premium-entry-intro-beam-right"
              style={{
                background: 'linear-gradient(to bottom, rgba(251,191,36,0.3), rgba(251,191,36,0.1), transparent)',
                transform: 'rotate(-20deg)',
                filter: 'blur(40px)',
              }}
            />
          </div>

          {/* Circular glow behind logo */}
          <div
            className="absolute w-[500px] h-[500px] animate-premium-entry-intro-glow"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(59,130,246,0.2) 40%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          {/* Main logo container */}
          <div className="relative flex flex-col items-center animate-premium-entry-intro-logo">
            {/* Logo with premium glow */}
            <div
              className="relative"
              style={{
                filter: 'drop-shadow(0 0 40px rgba(59,130,246,0.8)) drop-shadow(0 0 80px rgba(59,130,246,0.5))',
              }}
            >
              <img
                src={tournament.broadcaster_logo_url}
                alt={tournament.broadcaster_name || 'Broadcaster'}
                className="h-48 md:h-64 max-w-[400px] object-contain animate-premium-entry-intro-pulse"
              />
            </div>

            {/* Broadcaster name */}
            {tournament.broadcaster_name && (
              <h3
                className="mt-8 text-2xl md:text-3xl font-bold tracking-[0.3em] uppercase animate-premium-entry-intro-text"
                style={{
                  background: 'linear-gradient(180deg, #ffffff, #3b82f6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.8))',
                }}
              >
                {tournament.broadcaster_name}
              </h3>
            )}

            {/* "PRESENTS" text */}
            <p
              className="mt-4 text-lg tracking-[0.5em] uppercase text-amber-400 animate-premium-entry-intro-presents"
              style={{
                textShadow: '0 0 15px #fbbf24',
              }}
            >
              PRESENTS
            </p>
          </div>

          {/* Flying particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(25)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-premium-entry-intro-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${2 + Math.random() * 3}px`,
                  height: `${2 + Math.random() * 3}px`,
                  background: i % 2 === 0 ? '#3b82f6' : '#fbbf24',
                  boxShadow: `0 0 ${6 + Math.random() * 6}px ${i % 2 === 0 ? '#3b82f6' : '#fbbf24'}`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dark cinematic background */}
      <div className="absolute inset-0 bg-[#030308]" />

      {/* Broadcaster Logo - Top Right (shown after intro) */}
      {phase !== 'broadcasterIntro' && tournament?.broadcaster_logo_url && (
        <BroadcasterLogo
          logoUrl={tournament.broadcaster_logo_url}
          name={tournament.broadcaster_name}
          size="lg"
          position="top-right"
          theme="premium"
          showName={false}
          animate
        />
      )}

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

              {/* Player UID */}
              <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 transition-all duration-500 ${
                phase === 'stats' || phase === 'ready' || phase === 'exit' ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}>
                <div className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-2xl shadow-red-500/50">
                  <span className="text-white font-black text-3xl">{player.player_uid || 'P000'}</span>
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
              {(player.city || player.stats?.city) && (
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 w-24 text-right uppercase text-sm tracking-wider">City</span>
                  <div className="h-10 px-6 bg-slate-800/80 rounded-lg flex items-center border-l-4 border-amber-500">
                    <span className="text-white font-semibold">📍 {player.city || player.stats?.city}</span>
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
                    {formatAmountCompact(player.base_price, usePoints)}
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
        /* BROADCASTER INTRO ANIMATIONS */
        @keyframes premium-entry-intro-bg {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes premium-entry-intro-beam-left {
          0% { transform: translateX(-200%) rotate(20deg); opacity: 0; }
          30% { transform: translateX(0%) rotate(20deg); opacity: 0.5; }
          70% { transform: translateX(0%) rotate(20deg); opacity: 0.5; }
          100% { transform: translateX(200%) rotate(20deg); opacity: 0; }
        }
        @keyframes premium-entry-intro-beam-right {
          0% { transform: translateX(200%) rotate(-20deg); opacity: 0; }
          30% { transform: translateX(0%) rotate(-20deg); opacity: 0.5; }
          70% { transform: translateX(0%) rotate(-20deg); opacity: 0.5; }
          100% { transform: translateX(-200%) rotate(-20deg); opacity: 0; }
        }
        @keyframes premium-entry-intro-glow {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1); }
          70% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes premium-entry-intro-logo {
          0% { opacity: 0; transform: scale(0.3); }
          20% { opacity: 1; transform: scale(1.1); }
          30% { transform: scale(1); }
          70% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes premium-entry-intro-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
        @keyframes premium-entry-intro-text {
          0% { opacity: 0; transform: translateY(20px); }
          30% { opacity: 1; transform: translateY(0); }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes premium-entry-intro-presents {
          0% { opacity: 0; transform: scaleX(0); }
          40% { opacity: 1; transform: scaleX(1); }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes premium-entry-intro-particle {
          0%, 100% { opacity: 0; transform: scale(0) translateY(0); }
          20% { opacity: 1; transform: scale(1) translateY(0); }
          80% { opacity: 1; transform: scale(1) translateY(-30px); }
        }

        .animate-premium-entry-intro-bg { animation: premium-entry-intro-bg 2.5s ease-in-out forwards; }
        .animate-premium-entry-intro-beam-left { animation: premium-entry-intro-beam-left 2.5s ease-out forwards; }
        .animate-premium-entry-intro-beam-right { animation: premium-entry-intro-beam-right 2.5s ease-out forwards; }
        .animate-premium-entry-intro-glow { animation: premium-entry-intro-glow 2.5s ease-out forwards; }
        .animate-premium-entry-intro-logo { animation: premium-entry-intro-logo 2.5s ease-out forwards; }
        .animate-premium-entry-intro-pulse { animation: premium-entry-intro-pulse 0.8s ease-in-out infinite; }
        .animate-premium-entry-intro-text { animation: premium-entry-intro-text 2.5s ease-out forwards; }
        .animate-premium-entry-intro-presents { animation: premium-entry-intro-presents 2.5s ease-out forwards; }
        .animate-premium-entry-intro-particle { animation: premium-entry-intro-particle 2.5s ease-in-out forwards; }

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
