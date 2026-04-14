import { useState, useEffect, useRef } from 'react';
import { Player, Team } from '../../types';
import { User } from 'lucide-react';
import { formatIndianNumber } from '../../utils/formatters';

interface FireSoldAnimationProps {
  player: Player;
  team: Team;
  soldPrice: number;
  onComplete: () => void;
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
}: FireSoldAnimationProps) {
  const [phase, setPhase] = useState<'ignite' | 'blaze' | 'reveal' | 'price' | 'inferno' | 'exit'>('ignite');
  const [displayPrice, setDisplayPrice] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedRef = useRef(false);

  // Animation phases
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('blaze'), 400),
      setTimeout(() => setPhase('reveal'), 1000),
      setTimeout(() => setPhase('price'), 1800),
      setTimeout(() => setPhase('inferno'), 2800),
      setTimeout(() => setPhase('exit'), 5500),
      setTimeout(() => onComplete(), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Price counter
  useEffect(() => {
    if (phase !== 'price' && phase !== 'inferno' && phase !== 'exit') return;
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

  // Fire explosion canvas
  useEffect(() => {
    if (phase !== 'inferno' || animatedRef.current) return;
    animatedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [FIRE_COLORS.yellow, FIRE_COLORS.orange, FIRE_COLORS.red, FIRE_COLORS.ember];
    let particles: Array<{
      x: number; y: number; vx: number; vy: number;
      life: number; color: string; size: number;
    }> = [];

    // Create fire explosion
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 15;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 5, 5, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Less gravity for floaty fire
        p.vx *= 0.99;
        p.life -= 0.008;

        if (p.life > 0) {
          // Fire particle with glow
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * p.life * 2);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(0.5, p.color + '80');
          gradient.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life * 2, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      });

      particles = particles.filter(p => p.life > 0);
      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [phase]);

  const multiplier = player.base_price > 0 ? (soldPrice / player.base_price).toFixed(1) : '1.0';

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden
        ${phase === 'exit' ? 'animate-fire-fade-out' : ''}`}
      style={{ background: '#0a0505' }}
    >
      {/* Fire explosion canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Background flames */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Rising flames from bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-64 flex justify-around">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="animate-sold-flame"
              style={{
                width: `${50 + Math.random() * 40}px`,
                height: `${120 + Math.random() * 100}px`,
                background: `linear-gradient(to top, ${FIRE_COLORS.darkRed}, ${FIRE_COLORS.red}, ${FIRE_COLORS.orange}, ${FIRE_COLORS.yellow}, transparent)`,
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.6 + Math.random() * 0.4}s`,
                filter: 'blur(2px)',
              }}
            />
          ))}
        </div>

        {/* Side flames */}
        <div className="absolute left-0 top-1/4 bottom-1/4 w-32 flex flex-col justify-around">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="animate-side-flame"
              style={{
                width: `${60 + Math.random() * 40}px`,
                height: `${40 + Math.random() * 30}px`,
                background: `linear-gradient(to right, ${FIRE_COLORS.red}, ${FIRE_COLORS.orange}, transparent)`,
                borderRadius: '50%',
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
        <div className="absolute right-0 top-1/4 bottom-1/4 w-32 flex flex-col justify-around items-end">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="animate-side-flame-right"
              style={{
                width: `${60 + Math.random() * 40}px`,
                height: `${40 + Math.random() * 30}px`,
                background: `linear-gradient(to left, ${FIRE_COLORS.red}, ${FIRE_COLORS.orange}, transparent)`,
                borderRadius: '50%',
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Rising embers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-fire-ember"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-10px',
              width: `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              background: i % 3 === 0 ? FIRE_COLORS.yellow : i % 3 === 1 ? FIRE_COLORS.orange : FIRE_COLORS.ember,
              boxShadow: `0 0 ${6 + Math.random() * 8}px ${i % 3 === 0 ? FIRE_COLORS.yellow : FIRE_COLORS.orange}`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* "SOLD" text with fire effect */}
      <div
        className={`relative z-10 mb-8 transition-all duration-700 ease-out
          ${phase === 'ignite' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
          ${phase === 'blaze' ? 'animate-fire-slam' : ''}`}
      >
        <h1
          className="text-7xl md:text-9xl font-black uppercase tracking-wider animate-fire-text"
          style={{
            background: `linear-gradient(180deg, ${FIRE_COLORS.yellow} 0%, ${FIRE_COLORS.orange} 40%, ${FIRE_COLORS.red} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 0 30px ${FIRE_COLORS.orange}) drop-shadow(0 0 60px ${FIRE_COLORS.red})`,
          }}
        >
          🔥 SOLD! 🔥
        </h1>
      </div>

      {/* Player and Team */}
      <div className="relative z-10 flex items-center justify-center gap-10 md:gap-20 mb-8">

        {/* Player */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out
            ${phase === 'ignite' || phase === 'blaze' ? 'translate-x-[-100px] opacity-0 scale-75' : 'translate-x-0 opacity-100 scale-100'}`}
        >
          {/* Fire ring around photo */}
          <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
            {/* Fire glow behind - subtle */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${FIRE_COLORS.orange}40, ${FIRE_COLORS.red}20, transparent)`,
                filter: 'blur(25px)',
              }}
            />

            {/* Realistic fire ring PNG - static */}
            <img
              src="/images/fire-ring.png"
              alt=""
              className="absolute w-full h-full object-contain pointer-events-none"
              style={{
                filter: `drop-shadow(0 0 20px ${FIRE_COLORS.orange}80)`,
                transform: 'scale(1.1)',
              }}
            />

            {/* Photo - properly sized inside fire ring */}
            <div
              className="relative w-44 h-44 md:w-52 md:h-52 rounded-full overflow-hidden z-10"
              style={{
                boxShadow: `0 0 30px ${FIRE_COLORS.orange}50, inset 0 0 20px ${FIRE_COLORS.orange}20`,
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
          </div>

          {/* Player name */}
          <div className={`mt-6 text-center transition-all duration-500 ${
            phase === 'reveal' || phase === 'price' || phase === 'inferno' || phase === 'exit' ? 'opacity-100' : 'opacity-0'
          }`}>
            <h2
              className="text-2xl md:text-4xl font-black uppercase"
              style={{ color: FIRE_COLORS.yellow, textShadow: `0 0 20px ${FIRE_COLORS.orange}` }}
            >
              {player.name}
            </h2>
          </div>
        </div>

        {/* Fire arrow */}
        <div
          className={`transition-all duration-500 ${
            phase === 'reveal' || phase === 'price' || phase === 'inferno' || phase === 'exit' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
        >
          <svg width="80" height="60" viewBox="0 0 80 60" style={{ filter: `drop-shadow(0 0 15px ${FIRE_COLORS.orange})` }}>
            <defs>
              <linearGradient id="fireArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={FIRE_COLORS.red} />
                <stop offset="50%" stopColor={FIRE_COLORS.orange} />
                <stop offset="100%" stopColor={FIRE_COLORS.yellow} />
              </linearGradient>
            </defs>
            <path
              d="M 5 30 L 55 30 M 45 15 L 65 30 L 45 45"
              fill="none"
              stroke="url(#fireArrowGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Team */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out delay-100
            ${phase === 'ignite' || phase === 'blaze' ? 'translate-x-[100px] opacity-0 scale-75' : 'translate-x-0 opacity-100 scale-100'}`}
        >
          {/* Fire ring around team logo */}
          <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
            {/* Fire glow behind - subtle */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${FIRE_COLORS.orange}40, ${FIRE_COLORS.red}20, transparent)`,
                filter: 'blur(25px)',
              }}
            />

            {/* Realistic fire ring PNG - static */}
            <img
              src="/images/fire-ring.png"
              alt=""
              className="absolute w-full h-full object-contain pointer-events-none"
              style={{
                filter: `drop-shadow(0 0 20px ${FIRE_COLORS.orange}80)`,
                transform: 'scale(1.1)',
              }}
            />

            <div
              className="relative w-44 h-44 md:w-52 md:h-52 rounded-full overflow-hidden flex items-center justify-center z-10"
              style={{
                background: `radial-gradient(circle, ${FIRE_COLORS.orange}15, #0a0505)`,
                boxShadow: `0 0 30px ${FIRE_COLORS.orange}50, inset 0 0 25px ${FIRE_COLORS.red}20`,
              }}
            >
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-3/4 h-3/4 object-contain drop-shadow-2xl" />
              ) : (
                <span className="text-5xl font-black" style={{ color: FIRE_COLORS.orange }}>
                  {team.short_name}
                </span>
              )}
            </div>
          </div>

          {/* Team name */}
          <div className={`mt-6 text-center transition-all duration-500 delay-100 ${
            phase === 'reveal' || phase === 'price' || phase === 'inferno' || phase === 'exit' ? 'opacity-100' : 'opacity-0'
          }`}>
            <h2
              className="text-2xl md:text-4xl font-black uppercase"
              style={{ color: FIRE_COLORS.yellow, textShadow: `0 0 20px ${FIRE_COLORS.orange}` }}
            >
              {team.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Price */}
      <div
        className={`relative z-10 text-center transition-all duration-700 ${
          phase === 'price' || phase === 'inferno' || phase === 'exit' ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-90'
        }`}
      >
        <p style={{ color: `${FIRE_COLORS.orange}99` }} className="text-sm uppercase tracking-[0.3em] mb-2">Sold For</p>
        <p
          className="text-6xl md:text-8xl font-black tabular-nums animate-fire-text"
          style={{
            background: `linear-gradient(180deg, ${FIRE_COLORS.yellow} 0%, ${FIRE_COLORS.orange} 50%, ${FIRE_COLORS.red} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 0 30px ${FIRE_COLORS.orange})`,
          }}
        >
          {formatIndianNumber(displayPrice)}
        </p>

        <div className={`flex items-center justify-center gap-6 mt-4 transition-opacity duration-500 ${
          phase === 'inferno' || phase === 'exit' ? 'opacity-100' : 'opacity-0'
        }`}>
          <span style={{ color: `${FIRE_COLORS.ember}` }}>Base: {formatIndianNumber(player.base_price)}</span>
          {parseFloat(multiplier) > 1 && (
            <span
              className="px-4 py-1.5 rounded-full font-bold"
              style={{
                background: `linear-gradient(135deg, ${FIRE_COLORS.orange}50, ${FIRE_COLORS.red}30)`,
                color: FIRE_COLORS.yellow,
                boxShadow: `0 0 15px ${FIRE_COLORS.orange}60`,
              }}
            >
              {multiplier}x
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fire-fade-out {
          to { opacity: 0; transform: scale(1.05); }
        }
        @keyframes fire-slam {
          0% { transform: scale(3) translateY(-50px); opacity: 0; }
          60% { transform: scale(1.1) translateY(5px); }
          80% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fire-text {
          0%, 100% { filter: drop-shadow(0 0 30px ${FIRE_COLORS.orange}); }
          50% { filter: drop-shadow(0 0 50px ${FIRE_COLORS.orange}) drop-shadow(0 0 80px ${FIRE_COLORS.red}); }
        }
        @keyframes fire-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fire-ring-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes photo-flame {
          0%, 100% { transform: translate(-50%, -50%) rotate(var(--r, 0deg)) translateY(-120px) scaleY(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) rotate(var(--r, 0deg)) translateY(-130px) scaleY(1.4); opacity: 1; }
        }
        @keyframes sold-flame {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          50% { transform: scaleY(1.3) scaleX(0.85); }
        }
        @keyframes side-flame {
          0%, 100% { transform: scaleX(1) translateX(0); opacity: 0.8; }
          50% { transform: scaleX(1.3) translateX(10px); opacity: 1; }
        }
        @keyframes side-flame-right {
          0%, 100% { transform: scaleX(1) translateX(0); opacity: 0.8; }
          50% { transform: scaleX(1.3) translateX(-10px); opacity: 1; }
        }
        @keyframes fire-ember {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? '' : '-'}30px) scale(0); opacity: 0; }
        }
        .animate-fire-fade-out { animation: fire-fade-out 0.5s ease-out forwards; }
        .animate-fire-slam { animation: fire-slam 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-fire-text { animation: fire-text 2s ease-in-out infinite; }
        .animate-fire-ring { animation: fire-ring 4s linear infinite; }
        .animate-fire-ring-reverse { animation: fire-ring-reverse 4s linear infinite; }
        .animate-photo-flame { animation: photo-flame 0.6s ease-in-out infinite; }
        .animate-sold-flame { animation: sold-flame 0.8s ease-in-out infinite; }
        .animate-side-flame { animation: side-flame 0.7s ease-in-out infinite; }
        .animate-side-flame-right { animation: side-flame-right 0.7s ease-in-out infinite; }
        .animate-fire-ember { animation: fire-ember linear infinite; }
        @keyframes fire-glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes fire-flicker {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          25% { transform: scale(1.02) rotate(1deg); opacity: 0.95; }
          50% { transform: scale(0.98) rotate(-1deg); opacity: 1; }
          75% { transform: scale(1.01) rotate(0.5deg); opacity: 0.97; }
        }
        .animate-fire-glow-pulse { animation: fire-glow-pulse 2s ease-in-out infinite; }
        .animate-fire-flicker { animation: fire-flicker 0.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
