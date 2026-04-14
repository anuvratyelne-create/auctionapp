import { useState, useEffect, useRef } from 'react';
import { Player, Team } from '../../types';
import { formatIndianNumber } from '../../utils/formatters';

interface SoldPlayerAnimationProps {
  player: Player;
  team: Team;
  soldPrice: number;
  onComplete: () => void;
  teamColor?: string;
}

export default function SoldPlayerAnimation({
  player,
  team,
  soldPrice,
  onComplete,
  teamColor = '#22c55e'
}: SoldPlayerAnimationProps) {
  const [phase, setPhase] = useState<'intro' | 'reveal' | 'merge' | 'price' | 'celebrate' | 'exit'>('intro');
  const [displayPrice, setDisplayPrice] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firedRef = useRef(false);

  // Animation phases
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('reveal'), 400),
      setTimeout(() => setPhase('merge'), 1200),
      setTimeout(() => setPhase('price'), 2000),
      setTimeout(() => setPhase('celebrate'), 3000),
      setTimeout(() => setPhase('exit'), 5500),
      setTimeout(() => onComplete(), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Price counter
  useEffect(() => {
    if (phase !== 'price' && phase !== 'celebrate' && phase !== 'exit') return;
    const steps = 25;
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
    }, 25);
    return () => clearInterval(timer);
  }, [phase, soldPrice]);

  // Fireworks celebration
  useEffect(() => {
    if (phase !== 'celebrate' || firedRef.current) return;
    firedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [teamColor, '#ffffff', '#fbbf24', '#f472b6', teamColor];
    let particles: Array<{x: number; y: number; vx: number; vy: number; life: number; color: string; size: number}> = [];

    // Multiple burst points
    const burstPoints = [
      { x: canvas.width * 0.3, y: canvas.height * 0.4 },
      { x: canvas.width * 0.7, y: canvas.height * 0.4 },
      { x: canvas.width * 0.5, y: canvas.height * 0.3 },
    ];

    burstPoints.forEach((point, idx) => {
      setTimeout(() => {
        for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 6 + Math.random() * 10;
          particles.push({
            x: point.x,
            y: point.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            life: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 3 + Math.random() * 5,
          });
        }
      }, idx * 300);
    });

    let animationId: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(3,3,8,0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        if (p.life <= 0) return;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.012;

        // Particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();

        // Glow trail
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      particles = particles.filter(p => p.life > 0);
      if (particles.length > 0 || phase === 'celebrate') {
        animationId = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [phase, teamColor]);

  const multiplier = player.base_price > 0 ? (soldPrice / player.base_price).toFixed(1) : '1.0';

  return (
    <div className={`fixed inset-0 z-[100] overflow-hidden ${phase === 'exit' ? 'animate-sold-fade-out' : ''}`}>
      {/* Dark cinematic background */}
      <div className="absolute inset-0 bg-[#030308]" />

      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(${teamColor}40 1px, transparent 1px),
            linear-gradient(90deg, ${teamColor}40 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: phase !== 'intro' ? 'perspective(500px) rotateX(60deg) translateY(-50%)' : 'none',
          transition: 'transform 1s ease-out',
        }}
      />

      {/* Sweeping light beams */}
      <div className={`absolute inset-0 overflow-hidden transition-opacity duration-500 ${phase === 'intro' ? 'opacity-100' : 'opacity-50'}`}>
        <div
          className="absolute top-0 left-1/4 w-[250px] h-[200%] animate-sweep-sold-left"
          style={{
            background: `linear-gradient(to bottom, ${teamColor}50, ${teamColor}20, transparent)`,
            transform: 'rotate(20deg)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute top-0 right-1/4 w-[250px] h-[200%] animate-sweep-sold-right"
          style={{
            background: 'linear-gradient(to bottom, rgba(251,191,36,0.4), rgba(251,191,36,0.15), transparent)',
            transform: 'rotate(-20deg)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Fireworks canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* "SOLD TO [TEAM]" Banner - Top */}
      <div className={`absolute top-0 left-0 right-0 transition-all duration-700 ease-out ${
        phase === 'intro' ? '-translate-y-full' : 'translate-y-0'
      }`}>
        <div
          className="relative h-24 flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${teamColor}dd, ${teamColor}, ${teamColor}dd)` }}
        >
          {/* Animated shine */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine-sold" />

          <div className="flex items-center gap-6">
            <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
            <span className="text-white text-4xl font-black tracking-[0.2em] uppercase drop-shadow-lg">
              SOLD TO {team.short_name || team.name}
            </span>
            <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
          </div>
        </div>
        {/* Bottom accent */}
        <div className="h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center pt-16 pb-56">
        <div className="flex items-center gap-12 md:gap-20">

          {/* Left - Player Photo */}
          <div className={`relative transition-all duration-700 ease-out ${
            phase === 'intro' ? 'translate-x-[-150px] opacity-0 scale-75' : 'translate-x-0 opacity-100 scale-100'
          }`}>
            {/* SVG Hexagonal frame glow */}
            <div className="absolute -inset-10">
              <svg viewBox="0 0 100 100" className="w-full h-full animate-rotate-sold">
                <polygon
                  points="50,3 97,25 97,75 50,97 3,75 3,25"
                  fill="none"
                  stroke={teamColor}
                  strokeWidth="0.3"
                  opacity="0.6"
                />
              </svg>
            </div>

            {/* Photo container */}
            <div className="relative w-56 h-56 md:w-72 md:h-72">
              {/* Rotating border */}
              <div
                className="absolute inset-0 rounded-full p-1.5 animate-spin-sold"
                style={{
                  background: `conic-gradient(from 0deg, ${teamColor}, #fbbf24, ${teamColor})`,
                }}
              >
                <div className="w-full h-full rounded-full bg-[#030308]" />
              </div>

              {/* Photo */}
              <div className="absolute inset-3 rounded-full overflow-hidden border-4 border-slate-800/50">
                {player.photo_url ? (
                  <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                    <span className="text-7xl">👤</span>
                  </div>
                )}
              </div>

              {/* Jersey badge */}
              {player.jersey_number && (
                <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 transition-all duration-500 ${
                  phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
                    ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}>
                  <div
                    className="px-6 py-2 rounded-lg shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)`,
                      boxShadow: `0 0 30px ${teamColor}80`,
                    }}
                  >
                    <span className="text-white font-black text-2xl">#{player.jersey_number}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Player name below photo */}
            <div className={`text-center mt-6 transition-all duration-500 ${
              phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
                ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight"
                  style={{ textShadow: `0 0 40px ${teamColor}60` }}>
                {player.name}
              </h2>
              {player.categories && (
                <p className="text-sm text-white/50 mt-1 uppercase tracking-wider">{player.categories.name}</p>
              )}
            </div>
          </div>

          {/* Center - Arrow/Connection */}
          <div className={`transition-all duration-500 ${
            phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
              ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}>
            <div className="relative" style={{ filter: `drop-shadow(0 0 20px ${teamColor})` }}>
              <svg width="100" height="80" viewBox="0 0 100 80">
                <defs>
                  <linearGradient id="soldArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={teamColor} stopOpacity="0.3" />
                    <stop offset="50%" stopColor={teamColor} />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
                <path
                  d="M 10 40 L 70 40 M 55 20 L 80 40 L 55 60"
                  fill="none"
                  stroke="url(#soldArrowGrad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Right - Team Logo */}
          <div className={`relative transition-all duration-700 ease-out delay-100 ${
            phase === 'intro' ? 'translate-x-[150px] opacity-0 scale-75' : 'translate-x-0 opacity-100 scale-100'
          }`}>
            {/* Pulsing glow */}
            <div
              className="absolute -inset-8 rounded-full animate-pulse"
              style={{
                background: `radial-gradient(circle, ${teamColor}50 0%, transparent 70%)`,
                filter: 'blur(25px)',
              }}
            />

            {/* Logo container */}
            <div className="relative w-56 h-56 md:w-72 md:h-72">
              {/* Glowing border */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from 90deg, ${teamColor}80, transparent, ${teamColor}80)`,
                  filter: 'blur(3px)',
                }}
              />

              <div
                className="absolute inset-1 rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${teamColor}20 0%, #0a0a12 50%, #050508 100%)`,
                  border: `4px solid ${teamColor}60`,
                  boxShadow: `inset 0 0 50px ${teamColor}20`,
                }}
              >
                {team.logo_url ? (
                  <div className="w-3/4 h-3/4 flex items-center justify-center">
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="max-w-full max-h-full object-contain drop-shadow-2xl"
                      style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.8))' }}
                    />
                  </div>
                ) : (
                  <span className="text-6xl md:text-7xl font-black" style={{ color: teamColor }}>
                    {team.short_name}
                  </span>
                )}
              </div>
            </div>

            {/* Team name below */}
            <div className={`text-center mt-6 transition-all duration-500 delay-100 ${
              phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
                ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight"
                  style={{ textShadow: `0 0 40px ${teamColor}60` }}>
                {team.name}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Price Section - Bottom Center */}
      <div className={`absolute bottom-24 left-0 right-0 flex justify-center transition-all duration-700 ${
        phase === 'price' || phase === 'celebrate' || phase === 'exit'
          ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
      }`}>
        <div className="relative text-center">
          {/* Glow background */}
          <div
            className="absolute -inset-4 rounded-2xl blur-xl animate-pulse"
            style={{ background: `${teamColor}30` }}
          />

          <div
            className="relative px-12 py-5 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(10,10,20,0.95), rgba(20,20,40,0.9))',
              border: `2px solid ${teamColor}50`,
              boxShadow: `0 0 40px ${teamColor}25`,
            }}
          >
            <p className="text-amber-400/80 text-xs uppercase tracking-[0.3em] mb-2">Final Price</p>
            <p
              className="text-5xl md:text-6xl font-black tabular-nums"
              style={{
                background: `linear-gradient(180deg, #ffffff 0%, ${teamColor} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 0 20px ${teamColor}60)`,
              }}
            >
              {formatIndianNumber(displayPrice)}
            </p>

            {/* Stats row */}
            <div className={`flex items-center justify-center gap-6 mt-3 transition-opacity duration-500 ${
              phase === 'celebrate' || phase === 'exit' ? 'opacity-100' : 'opacity-0'
            }`}>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Base</p>
                <p className="text-white/70 text-lg font-bold">{formatIndianNumber(player.base_price)}</p>
              </div>
              {parseFloat(multiplier) > 1 && (
                <div
                  className="px-4 py-1.5 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${teamColor}50, ${teamColor}20)`,
                    border: `2px solid ${teamColor}`,
                  }}
                >
                  <span className="text-xl font-black" style={{ color: teamColor }}>{multiplier}x</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom ticker */}
      <div className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ${
        phase === 'intro' ? 'translate-y-full' : 'translate-y-0'
      }`}>
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${teamColor}, #fbbf24, ${teamColor})` }} />
        <div className="h-14 bg-gradient-to-t from-slate-900 to-slate-900/90 flex items-center justify-center">
          <div className="flex items-center gap-8 text-slate-400">
            <span className="uppercase tracking-widest text-sm">Live Auction</span>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="uppercase tracking-widest text-sm font-semibold" style={{ color: teamColor }}>
              Player Acquired
            </span>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="uppercase tracking-widest text-sm">Premium Broadcast</span>
          </div>
        </div>
      </div>

      {/* Flying particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-fly-sold"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              background: i % 2 === 0 ? teamColor : '#fbbf24',
              boxShadow: `0 0 ${6 + Math.random() * 6}px ${i % 2 === 0 ? teamColor : '#fbbf24'}`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes sold-fade-out {
          to { opacity: 0; transform: scale(1.03); }
        }
        @keyframes sweep-sold-left {
          0% { transform: translateX(-150%) rotate(20deg); }
          100% { transform: translateX(250%) rotate(20deg); }
        }
        @keyframes sweep-sold-right {
          0% { transform: translateX(150%) rotate(-20deg); }
          100% { transform: translateX(-250%) rotate(-20deg); }
        }
        @keyframes shine-sold {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes rotate-sold {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-sold {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fly-sold {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-150px) translateX(80px); opacity: 0; }
        }
        .animate-sold-fade-out { animation: sold-fade-out 0.5s ease-out forwards; }
        .animate-sweep-sold-left { animation: sweep-sold-left 4s linear infinite; }
        .animate-sweep-sold-right { animation: sweep-sold-right 4s linear infinite; animation-delay: 2s; }
        .animate-shine-sold { animation: shine-sold 2.5s linear infinite; }
        .animate-rotate-sold { animation: rotate-sold 25s linear infinite; }
        .animate-spin-sold { animation: spin-sold 10s linear infinite; }
        .animate-fly-sold { animation: fly-sold 4s ease-out infinite; }
      `}</style>
    </div>
  );
}
