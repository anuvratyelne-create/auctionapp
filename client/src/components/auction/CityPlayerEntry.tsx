import { useState, useEffect, useRef } from 'react';
import { Player } from '../../types';
import { User } from 'lucide-react';
import { formatAmount } from '../../utils/formatters';
import { soundManager } from '../../utils/soundManager';
import { getRoleLabel } from '../../config/playerRoles';
import { useUIStore } from '../../stores/uiStore';

interface CityPlayerEntryProps {
  player: Player;
  onComplete: () => void;
}

const CITY_COLORS = {
  cyan: '#06b6d4',
  cyanLight: '#22d3ee',
  cyanDark: '#0891b2',
  purple: '#8b5cf6',
  magenta: '#c026d3',
  pink: '#ec4899',
  gold: '#fbbf24',
  navy: '#0a1628',
  darkNavy: '#020617',
};

// Digital rain column component
function DigitalRain({ delay, left }: { delay: number; left: string }) {
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  const [columns] = useState(() =>
    Array.from({ length: 15 }, () => chars[Math.floor(Math.random() * chars.length)])
  );

  return (
    <div
      className="absolute top-0 text-xs font-mono animate-digital-rain"
      style={{
        left,
        animationDelay: `${delay}s`,
        color: CITY_COLORS.cyan,
        textShadow: `0 0 10px ${CITY_COLORS.cyan}`,
        writingMode: 'vertical-rl',
        opacity: 0.6,
      }}
    >
      {columns.map((char, i) => (
        <span key={i} style={{ opacity: 1 - i * 0.06 }}>{char}</span>
      ))}
    </div>
  );
}

export default function CityPlayerEntry({ player, onComplete }: CityPlayerEntryProps) {
  const [phase, setPhase] = useState<'blackout' | 'scan' | 'glitch' | 'reveal' | 'name' | 'stats' | 'ready' | 'exit'>('blackout');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { displayMode } = useUIStore();
  const usePoints = displayMode === 'points';

  // Grid animation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;
    let time = 0;

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Perspective grid
      ctx.strokeStyle = `${CITY_COLORS.cyan}30`;
      ctx.lineWidth = 1;

      const horizonY = canvas.height * 0.4;
      const gridLines = 20;

      // Horizontal lines (perspective)
      for (let i = 0; i <= gridLines; i++) {
        const y = horizonY + (i / gridLines) * (canvas.height - horizonY);
        const perspectiveFactor = (y - horizonY) / (canvas.height - horizonY);
        const xOffset = (1 - perspectiveFactor) * canvas.width * 0.4;

        ctx.beginPath();
        ctx.moveTo(xOffset, y);
        ctx.lineTo(canvas.width - xOffset, y);
        ctx.stroke();
      }

      // Vertical lines (perspective)
      for (let i = 0; i <= gridLines; i++) {
        const x = (i / gridLines) * canvas.width;
        const topX = canvas.width / 2 + (x - canvas.width / 2) * 0.2;

        ctx.beginPath();
        ctx.moveTo(topX, horizonY);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Animated scan line
      const scanY = (time * 100) % canvas.height;
      const gradient = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.5, `${CITY_COLORS.cyan}60`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanY - 20, canvas.width, 40);

      time += 0.016;
      animationId = requestAnimationFrame(drawGrid);
    };

    drawGrid();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Animation phases
  useEffect(() => {
    let cancelled = false;

    soundManager.play('whoosh');

    const timers = [
      setTimeout(() => !cancelled && setPhase('scan'), 300),
      setTimeout(() => !cancelled && setPhase('glitch'), 1200),
      setTimeout(() => !cancelled && setPhase('reveal'), 1800),
      setTimeout(() => !cancelled && setPhase('name'), 3000),
      setTimeout(() => !cancelled && setPhase('stats'), 4500),
      setTimeout(() => !cancelled && setPhase('ready'), 6500),
      setTimeout(() => !cancelled && setPhase('exit'), 8500),
      setTimeout(() => {
        if (!cancelled) onComplete();
      }, 9000),
    ];

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden
        ${phase === 'exit' ? 'animate-city-exit' : ''}`}
      style={{ background: CITY_COLORS.darkNavy }}
    >
      {/* Animated grid canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 transition-opacity duration-1000 ${
          phase === 'blackout' ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* City skyline silhouette */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-64 transition-all duration-1000 ${
          phase === 'blackout' ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{
          background: `linear-gradient(to top, ${CITY_COLORS.navy}, transparent)`,
          maskImage: 'url(/images/city-night-bg.png)',
          WebkitMaskImage: 'url(/images/city-night-bg.png)',
          maskSize: 'cover',
          WebkitMaskSize: 'cover',
        }}
      />

      {/* Digital rain effect */}
      <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-500 ${
        phase !== 'blackout' ? 'opacity-100' : 'opacity-0'
      }`}>
        {[...Array(25)].map((_, i) => (
          <DigitalRain key={i} delay={Math.random() * 3} left={`${i * 4}%`} />
        ))}
      </div>

      {/* Horizontal scan lines */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          phase === 'scan' || phase === 'glitch' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            ${CITY_COLORS.cyan}08 2px,
            ${CITY_COLORS.cyan}08 4px
          )`,
        }}
      />

      {/* Glitch overlay */}
      {phase === 'glitch' && (
        <div className="absolute inset-0 pointer-events-none animate-glitch-overlay">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${CITY_COLORS.cyan}20 50%, transparent 100%)`,
              transform: 'translateX(-50%)',
            }}
          />
        </div>
      )}

      {/* Corner brackets - cyberpunk UI */}
      <div className={`absolute inset-8 pointer-events-none transition-all duration-700 ${
        phase !== 'blackout' && phase !== 'scan' ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Top-left */}
        <div className="absolute top-0 left-0 w-24 h-24">
          <div className="absolute top-0 left-0 w-full h-1" style={{ background: CITY_COLORS.cyan }} />
          <div className="absolute top-0 left-0 w-1 h-full" style={{ background: CITY_COLORS.cyan }} />
        </div>
        {/* Top-right */}
        <div className="absolute top-0 right-0 w-24 h-24">
          <div className="absolute top-0 right-0 w-full h-1" style={{ background: CITY_COLORS.purple }} />
          <div className="absolute top-0 right-0 w-1 h-full" style={{ background: CITY_COLORS.purple }} />
        </div>
        {/* Bottom-left */}
        <div className="absolute bottom-0 left-0 w-24 h-24">
          <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: CITY_COLORS.purple }} />
          <div className="absolute bottom-0 left-0 w-1 h-full" style={{ background: CITY_COLORS.purple }} />
        </div>
        {/* Bottom-right */}
        <div className="absolute bottom-0 right-0 w-24 h-24">
          <div className="absolute bottom-0 right-0 w-full h-1" style={{ background: CITY_COLORS.cyan }} />
          <div className="absolute bottom-0 right-0 w-1 h-full" style={{ background: CITY_COLORS.cyan }} />
        </div>
      </div>

      {/* "ENTERING THE ARENA" banner */}
      <div
        className={`absolute top-12 left-0 right-0 flex justify-center transition-all duration-700 ${
          phase === 'scan' || phase === 'glitch' || phase === 'reveal'
            ? 'opacity-100 translate-y-0'
            : phase === 'blackout'
            ? 'opacity-0 -translate-y-8'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div
          className="relative px-16 py-4 overflow-hidden"
          style={{
            background: `linear-gradient(90deg, transparent, ${CITY_COLORS.navy}ee, ${CITY_COLORS.navy}ee, transparent)`,
            borderTop: `2px solid ${CITY_COLORS.cyan}`,
            borderBottom: `2px solid ${CITY_COLORS.cyan}`,
          }}
        >
          {/* Animated shine */}
          <div
            className="absolute inset-0 animate-banner-shine"
            style={{
              background: `linear-gradient(90deg, transparent, ${CITY_COLORS.cyan}40, transparent)`,
            }}
          />
          <h2
            className="text-3xl font-black tracking-[0.5em] uppercase"
            style={{
              color: CITY_COLORS.cyan,
              textShadow: `0 0 20px ${CITY_COLORS.cyan}, 0 0 40px ${CITY_COLORS.cyan}50`,
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            Entering The Arena
          </h2>
        </div>
      </div>

      {/* Floating neon particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-20px',
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: i % 3 === 0 ? CITY_COLORS.cyan : i % 3 === 1 ? CITY_COLORS.purple : CITY_COLORS.gold,
              boxShadow: `0 0 ${8 + Math.random() * 12}px ${i % 3 === 0 ? CITY_COLORS.cyan : i % 3 === 1 ? CITY_COLORS.purple : CITY_COLORS.gold}`,
              animationDuration: `${4 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center mt-16">

        {/* Player Photo with holographic frame */}
        <div
          className={`relative transition-all duration-700 ease-out ${
            phase === 'blackout' || phase === 'scan' || phase === 'glitch'
              ? 'scale-0 opacity-0'
              : 'scale-100 opacity-100'
          } ${phase === 'glitch' ? 'animate-glitch-shake' : ''}`}
        >
          {/* Frame Container */}
          <div style={{ position: 'relative', width: '420px', height: '420px' }}>
            {/* Outer rotating ring */}
            <div
              className="absolute inset-0 animate-spin-slow"
              style={{
                border: `2px dashed ${CITY_COLORS.cyan}40`,
                borderRadius: '50%',
              }}
            />

            {/* Pulsing glow */}
            <div
              className="absolute inset-0 animate-glow-pulse"
              style={{
                background: `radial-gradient(circle, ${CITY_COLORS.cyan}40, transparent 60%)`,
                filter: 'blur(40px)',
              }}
            />

            {/* Data readout circles */}
            <svg className="absolute inset-0 w-full h-full animate-spin-reverse" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke={`${CITY_COLORS.purple}40`}
                strokeWidth="0.3"
                strokeDasharray="10 5"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={`${CITY_COLORS.cyan}30`}
                strokeWidth="0.2"
                strokeDasharray="5 10"
              />
            </svg>

            {/* Photo - centered */}
            <div
              className={`transition-all duration-500 ${
                phase === 'reveal' ? 'animate-hologram-reveal' : ''
              }`}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <div
                className="overflow-hidden rounded-xl"
                style={{
                  width: '60%',
                  height: '60%',
                  boxShadow: `
                    0 0 30px ${CITY_COLORS.cyan}60,
                    inset 0 0 30px ${CITY_COLORS.cyan}20
                  `,
                  border: `3px solid ${CITY_COLORS.cyan}80`,
                }}
              >
                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={player.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: phase === 'reveal' ? 'hue-rotate(180deg) brightness(1.5)' : 'none',
                      transition: 'filter 0.5s ease-out',
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <User size={80} className="text-slate-600" />
                  </div>
                )}
              </div>
            </div>

            {/* PNG Frame overlay */}
            <img
              src="/images/city-frame.png"
              alt=""
              className={`transition-all duration-700 ${
                phase === 'reveal' ? 'animate-frame-spin-in' : ''
              }`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                zIndex: 10,
                filter: `
                  drop-shadow(0 0 15px ${CITY_COLORS.cyan})
                  drop-shadow(0 0 30px ${CITY_COLORS.purple}80)
                  drop-shadow(0 0 45px ${CITY_COLORS.cyan}50)
                `,
              }}
            />

            {/* Scanning line over photo */}
            {(phase === 'reveal' || phase === 'name') && (
              <div
                className="absolute left-[20%] right-[20%] h-1 animate-scan-vertical z-20"
                style={{
                  background: `linear-gradient(90deg, transparent, ${CITY_COLORS.cyan}, transparent)`,
                  boxShadow: `0 0 20px ${CITY_COLORS.cyan}`,
                }}
              />
            )}

            {/* Player UID badge */}
            {player.player_uid && (
              <div
                className={`absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ${
                  phase === 'name' || phase === 'stats' || phase === 'ready' || phase === 'exit'
                    ? 'translate-y-0 opacity-100 scale-100'
                    : 'translate-y-8 opacity-0 scale-50'
                }`}
              >
                <div
                  className="px-8 py-3 font-black text-3xl text-white"
                  style={{
                    background: `linear-gradient(135deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple})`,
                    boxShadow: `0 0 30px ${CITY_COLORS.cyan}80, 0 0 60px ${CITY_COLORS.purple}50`,
                    clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0% 50%)',
                    fontFamily: "'Orbitron', sans-serif",
                  }}
                >
                  {player.player_uid}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player Name with glitch effect */}
        <div
          className={`mt-12 text-center transition-all duration-700 ${
            phase === 'name' || phase === 'stats' || phase === 'ready' || phase === 'exit'
              ? 'translate-y-0 opacity-100'
              : 'translate-y-16 opacity-0'
          }`}
        >
          <div className="relative">
            {/* Glitch layers */}
            <h1
              className="absolute inset-0 text-5xl md:text-7xl font-black uppercase tracking-wider animate-glitch-1"
              style={{
                color: CITY_COLORS.cyan,
                fontFamily: "'Orbitron', sans-serif",
                clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
              }}
            >
              {player.name}
            </h1>
            <h1
              className="absolute inset-0 text-5xl md:text-7xl font-black uppercase tracking-wider animate-glitch-2"
              style={{
                color: CITY_COLORS.purple,
                fontFamily: "'Orbitron', sans-serif",
                clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
              }}
            >
              {player.name}
            </h1>
            <h1
              className="text-5xl md:text-7xl font-black uppercase tracking-wider"
              style={{
                background: `linear-gradient(180deg, #ffffff 0%, ${CITY_COLORS.cyan} 50%, ${CITY_COLORS.purple} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 0 30px ${CITY_COLORS.cyan}80)`,
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              {player.name}
            </h1>
          </div>

          {/* Role badges */}
          <div
            className={`flex items-center justify-center gap-4 mt-6 transition-all duration-500 delay-200 ${
              phase === 'name' || phase === 'stats' || phase === 'ready' || phase === 'exit'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            <span
              className="px-6 py-2.5 text-sm font-bold uppercase tracking-wider"
              style={{
                background: `linear-gradient(135deg, ${CITY_COLORS.purple}50, ${CITY_COLORS.magenta}30)`,
                color: CITY_COLORS.cyanLight,
                border: `2px solid ${CITY_COLORS.purple}60`,
                clipPath: 'polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0% 50%)',
              }}
            >
              {getRoleLabel(player.stats?.role || player.role) || 'Player'}
            </span>
            {player.categories && (
              <span
                className="px-6 py-2.5 text-sm font-bold uppercase tracking-wider"
                style={{
                  background: `linear-gradient(135deg, ${CITY_COLORS.cyan}40, ${CITY_COLORS.purple}20)`,
                  color: CITY_COLORS.gold,
                  border: `2px solid ${CITY_COLORS.cyan}50`,
                  clipPath: 'polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0% 50%)',
                }}
              >
                {player.categories.name}
              </span>
            )}
          </div>
        </div>

        {/* Base Price - holographic display */}
        <div
          className={`mt-10 text-center transition-all duration-700 ${
            phase === 'stats' || phase === 'ready' || phase === 'exit'
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-12 opacity-0 scale-80'
          }`}
        >
          <p
            className="text-sm uppercase tracking-[0.4em] mb-4"
            style={{
              color: `${CITY_COLORS.cyan}`,
              textShadow: `0 0 10px ${CITY_COLORS.cyan}`,
            }}
          >
            ◆ Base Price ◆
          </p>
          <div
            className="relative inline-block px-14 py-5"
            style={{
              background: `linear-gradient(135deg, ${CITY_COLORS.navy}ee, ${CITY_COLORS.purple}20, ${CITY_COLORS.navy}ee)`,
              border: `3px solid ${CITY_COLORS.gold}80`,
              boxShadow: `
                0 0 30px ${CITY_COLORS.gold}40,
                inset 0 0 30px ${CITY_COLORS.gold}10
              `,
              clipPath: 'polygon(5% 0, 95% 0, 100% 25%, 100% 75%, 95% 100%, 5% 100%, 0% 75%, 0% 25%)',
            }}
          >
            {/* Animated border glow */}
            <div
              className="absolute inset-0 animate-border-glow"
              style={{
                background: `conic-gradient(from 0deg, transparent, ${CITY_COLORS.gold}60, transparent, ${CITY_COLORS.cyan}60, transparent)`,
                clipPath: 'polygon(5% 0, 95% 0, 100% 25%, 100% 75%, 95% 100%, 5% 100%, 0% 75%, 0% 25%)',
                filter: 'blur(8px)',
              }}
            />
            <span
              className="relative text-5xl md:text-6xl font-black tabular-nums"
              style={{
                background: `linear-gradient(180deg, ${CITY_COLORS.gold} 0%, #d97706 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: "'Orbitron', sans-serif",
                filter: `drop-shadow(0 0 15px ${CITY_COLORS.gold}80)`,
              }}
            >
              {formatAmount(player.base_price, usePoints)}
            </span>
          </div>
        </div>
      </div>

      {/* "LET THE BIDDING BEGIN" with neon effect */}
      <div
        className={`absolute bottom-20 left-0 right-0 text-center transition-all duration-700 ${
          phase === 'ready' || phase === 'exit'
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="relative inline-block">
          {/* Glow background */}
          <div
            className="absolute -inset-4 animate-pulse"
            style={{
              background: `radial-gradient(ellipse, ${CITY_COLORS.cyan}30, transparent 70%)`,
              filter: 'blur(20px)',
            }}
          />
          <p
            className="relative text-2xl md:text-3xl font-bold uppercase tracking-[0.2em]"
            style={{
              background: `linear-gradient(90deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple}, ${CITY_COLORS.pink}, ${CITY_COLORS.cyan})`,
              backgroundSize: '200% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-flow 3s linear infinite',
              fontFamily: "'Orbitron', sans-serif",
              filter: `drop-shadow(0 0 25px ${CITY_COLORS.cyan})`,
            }}
          >
            ◈ Let The Bidding Begin ◈
          </p>
        </div>
      </div>

      {/* Bottom data ticker */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ${
          phase !== 'blackout' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div
          className="h-1"
          style={{ background: `linear-gradient(90deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple}, ${CITY_COLORS.cyan})` }}
        />
        <div
          className="h-12 flex items-center justify-center gap-8"
          style={{ background: `linear-gradient(to top, ${CITY_COLORS.navy}, transparent)` }}
        >
          <span className="text-xs uppercase tracking-[0.3em]" style={{ color: CITY_COLORS.cyan }}>
            Live Auction
          </span>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: CITY_COLORS.cyan, boxShadow: `0 0 10px ${CITY_COLORS.cyan}` }} />
          <span className="text-xs uppercase tracking-[0.3em]" style={{ color: CITY_COLORS.purple }}>
            City Broadcast
          </span>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: CITY_COLORS.purple, boxShadow: `0 0 10px ${CITY_COLORS.purple}` }} />
          <span className="text-xs uppercase tracking-[0.3em]" style={{ color: CITY_COLORS.gold }}>
            Premium Arena
          </span>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

        @keyframes city-exit {
          to { opacity: 0; transform: scale(1.1); filter: blur(10px); }
        }
        @keyframes digital-rain {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes glitch-overlay {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes glitch-shake {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-5px, 5px); }
          40% { transform: translate(-5px, -5px); }
          60% { transform: translate(5px, 5px); }
          80% { transform: translate(5px, -5px); }
        }
        @keyframes glitch-1 {
          0%, 100% { transform: translate(0); opacity: 0.8; }
          20% { transform: translate(-3px, 0); }
          40% { transform: translate(3px, 0); }
          60% { transform: translate(-3px, 0); }
          80% { transform: translate(3px, 0); }
        }
        @keyframes glitch-2 {
          0%, 100% { transform: translate(0); opacity: 0.8; }
          20% { transform: translate(3px, 0); }
          40% { transform: translate(-3px, 0); }
          60% { transform: translate(3px, 0); }
          80% { transform: translate(-3px, 0); }
        }
        @keyframes banner-shine {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? '' : '-'}50px) scale(0.5); opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes hologram-reveal {
          0% { transform: scaleY(0.1); filter: brightness(3) blur(5px); }
          50% { transform: scaleY(1.1); filter: brightness(2) blur(2px); }
          100% { transform: scaleY(1); filter: brightness(1) blur(0); }
        }
        @keyframes frame-spin-in {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes scan-vertical {
          0% { top: 20%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        @keyframes border-glow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .animate-city-exit { animation: city-exit 0.5s ease-out forwards; }
        .animate-digital-rain { animation: digital-rain 5s linear infinite; }
        .animate-glitch-overlay { animation: glitch-overlay 0.3s ease-out; }
        .animate-glitch-shake { animation: glitch-shake 0.3s ease-out; }
        .animate-glitch-1 { animation: glitch-1 0.5s ease-in-out infinite; }
        .animate-glitch-2 { animation: glitch-2 0.5s ease-in-out infinite; animation-delay: 0.05s; }
        .animate-banner-shine { animation: banner-shine 2s linear infinite; }
        .animate-float-particle { animation: float-particle linear infinite; }
        .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse { animation: spin-reverse 15s linear infinite; }
        .animate-hologram-reveal { animation: hologram-reveal 0.8s ease-out forwards; }
        .animate-frame-spin-in { animation: frame-spin-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-scan-vertical { animation: scan-vertical 1.5s ease-in-out infinite; }
        .animate-border-glow { animation: border-glow 4s linear infinite; }
      `}</style>
    </div>
  );
}
