import { useState, useEffect, useRef } from 'react';
import { Player, Team } from '../../types';
import { User } from 'lucide-react';
import { formatAmountCompact } from '../../utils/formatters';
import { soundManager } from '../../utils/soundManager';
import { useUIStore } from '../../stores/uiStore';
import BroadcasterLogo from '../common/BroadcasterLogo';

interface CitySoldAnimationProps {
  player: Player;
  team: Team;
  soldPrice: number;
  onComplete: () => void;
  tournament?: {
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  };
}

const CITY_COLORS = {
  cyan: '#06b6d4',
  cyanLight: '#22d3ee',
  cyanDark: '#0891b2',
  purple: '#8b5cf6',
  magenta: '#c026d3',
  pink: '#ec4899',
  gold: '#fbbf24',
  goldLight: '#fcd34d',
  green: '#22c55e',
  greenLight: '#4ade80',
  navy: '#0a1628',
  darkNavy: '#020617',
};

// Holographic grid pattern component
function HoloGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-20"
      style={{
        backgroundImage: `
          linear-gradient(${CITY_COLORS.cyan}20 1px, transparent 1px),
          linear-gradient(90deg, ${CITY_COLORS.cyan}20 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        transform: 'perspective(500px) rotateX(60deg) translateY(-30%)',
      }}
    />
  );
}

// Data stream component
function DataStream({ side }: { side: 'left' | 'right' }) {
  const chars = '01アイウエオカキクケコ';
  return (
    <div
      className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-4' : 'right-4'} w-8 overflow-hidden pointer-events-none opacity-40`}
    >
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="text-xs font-mono animate-data-scroll"
          style={{
            color: CITY_COLORS.cyan,
            textShadow: `0 0 5px ${CITY_COLORS.cyan}`,
            animationDelay: `${i * 0.2}s`,
          }}
        >
          {Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}
        </div>
      ))}
    </div>
  );
}

export default function CitySoldAnimation({
  player,
  team,
  soldPrice,
  onComplete,
  tournament,
}: CitySoldAnimationProps) {
  // Add 'intro' phase for broadcaster logo display
  const [phase, setPhase] = useState<'intro' | 'blackout' | 'scan' | 'banner' | 'reveal' | 'merge' | 'price' | 'celebrate' | 'exit'>('intro');
  const [displayPrice, setDisplayPrice] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firedRef = useRef(false);
  const { displayMode } = useUIStore();
  const usePoints = displayMode === 'points';

  // Check if we have a broadcaster logo
  const hasBroadcasterLogo = !!tournament?.broadcaster_logo_url;
  // Intro duration - skip if no logo
  const introDuration = hasBroadcasterLogo ? 2500 : 0;

  useEffect(() => {
    let cancelled = false;

    // Play sound after intro phase
    if (hasBroadcasterLogo) {
      setTimeout(() => soundManager.play('sold'), introDuration);
    } else {
      soundManager.play('sold');
    }

    const timers = [
      // If no broadcaster logo, skip intro phase immediately
      setTimeout(() => !cancelled && setPhase('blackout'), introDuration),
      setTimeout(() => !cancelled && setPhase('scan'), introDuration + 200),
      setTimeout(() => !cancelled && setPhase('banner'), introDuration + 800),
      setTimeout(() => !cancelled && setPhase('reveal'), introDuration + 2000),
      setTimeout(() => !cancelled && setPhase('merge'), introDuration + 3500),
      setTimeout(() => !cancelled && setPhase('price'), introDuration + 5000),
      setTimeout(() => !cancelled && setPhase('celebrate'), introDuration + 7000),
      setTimeout(() => !cancelled && setPhase('exit'), introDuration + 9500),
      setTimeout(() => {
        if (!cancelled) onComplete();
      }, introDuration + 10000),
    ];

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Price counter with glitch effect
  useEffect(() => {
    if (phase !== 'price' && phase !== 'celebrate' && phase !== 'exit') return;
    const steps = 30;
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
        // Add slight randomness for glitch effect
        const glitch = Math.random() > 0.8 ? (Math.random() - 0.5) * soldPrice * 0.1 : 0;
        setDisplayPrice(Math.round(current + glitch));
      }
    }, 40);
    return () => clearInterval(timer);
  }, [phase, soldPrice]);

  // Neon fireworks celebration - OPTIMIZED
  useEffect(() => {
    if (phase !== 'celebrate' || firedRef.current) return;
    firedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [CITY_COLORS.cyan, CITY_COLORS.purple, CITY_COLORS.gold, CITY_COLORS.pink, CITY_COLORS.green];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
      size: number;
    }

    let particles: Particle[] = [];

    // Create burst - reduced particle count
    const createBurst = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 3 + Math.random() * 5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 2,
        });
      }
    };

    // Fewer burst points, fewer particles per burst
    const burstPoints = [
      { x: canvas.width * 0.2, y: canvas.height * 0.2, delay: 0 },
      { x: canvas.width * 0.5, y: canvas.height * 0.15, delay: 400 },
      { x: canvas.width * 0.8, y: canvas.height * 0.2, delay: 800 },
    ];

    burstPoints.forEach(({ x, y, delay }) => {
      setTimeout(() => createBurst(x, y, 25), delay); // Reduced from 60 to 25
    });

    let animationId: number;
    const animate = () => {
      // Faster fade for performance
      ctx.fillStyle = 'rgba(2, 6, 23, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Batch similar operations
      ctx.globalAlpha = 1;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= 0.018;

        // Draw particle (simple circle, no trail)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

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
        ${phase === 'exit' ? 'animate-city-sold-exit' : ''}`}
      style={{ background: CITY_COLORS.darkNavy }}
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BROADCASTER INTRO - Big centered logo like football broadcasts */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {phase === 'intro' && tournament?.broadcaster_logo_url && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center overflow-hidden">
          {/* Dark background with gradient */}
          <div
            className="absolute inset-0 animate-intro-bg"
            style={{
              background: `radial-gradient(ellipse at center, ${CITY_COLORS.navy} 0%, ${CITY_COLORS.darkNavy} 70%)`,
            }}
          />

          {/* Animated light rays */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute h-[200%] w-1 animate-intro-rays"
                style={{
                  background: `linear-gradient(to top, transparent, ${CITY_COLORS.cyan}40, transparent)`,
                  transform: `rotate(${i * 30}deg)`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Circular glow behind logo */}
          <div
            className="absolute w-[500px] h-[500px] animate-intro-glow"
            style={{
              background: `radial-gradient(circle, ${CITY_COLORS.cyan}60 0%, ${CITY_COLORS.purple}30 40%, transparent 70%)`,
              filter: 'blur(40px)',
            }}
          />

          {/* Rotating ring */}
          <div
            className="absolute w-[450px] h-[450px] animate-spin-slow"
            style={{
              border: `3px solid ${CITY_COLORS.cyan}40`,
              borderRadius: '50%',
              borderTopColor: CITY_COLORS.cyan,
              borderRightColor: CITY_COLORS.purple,
            }}
          />

          {/* Inner rotating ring */}
          <div
            className="absolute w-[380px] h-[380px] animate-spin-reverse"
            style={{
              border: `2px dashed ${CITY_COLORS.purple}30`,
              borderRadius: '50%',
            }}
          />

          {/* Main logo container */}
          <div className="relative flex flex-col items-center animate-intro-logo">
            {/* Logo with glow */}
            <div
              className="relative"
              style={{
                filter: `drop-shadow(0 0 40px ${CITY_COLORS.cyan}) drop-shadow(0 0 80px ${CITY_COLORS.purple})`,
              }}
            >
              <img
                src={tournament.broadcaster_logo_url}
                alt={tournament.broadcaster_name || 'Broadcaster'}
                className="h-48 md:h-64 max-w-[400px] object-contain animate-intro-logo-pulse"
              />
            </div>

            {/* Broadcaster name */}
            {tournament.broadcaster_name && (
              <h3
                className="mt-8 text-2xl md:text-3xl font-bold tracking-[0.3em] uppercase animate-intro-text"
                style={{
                  color: CITY_COLORS.cyan,
                  textShadow: `0 0 20px ${CITY_COLORS.cyan}, 0 0 40px ${CITY_COLORS.purple}`,
                  fontFamily: "'Orbitron', sans-serif",
                }}
              >
                {tournament.broadcaster_name}
              </h3>
            )}

            {/* "PRESENTS" text */}
            <p
              className="mt-4 text-lg tracking-[0.5em] uppercase animate-intro-presents"
              style={{
                color: CITY_COLORS.gold,
                textShadow: `0 0 15px ${CITY_COLORS.gold}`,
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              PRESENTS
            </p>
          </div>

          {/* Corner decorations */}
          <div className="absolute top-8 left-8 animate-intro-corner">
            <div className="w-16 h-1" style={{ background: CITY_COLORS.cyan }} />
            <div className="w-1 h-16" style={{ background: CITY_COLORS.cyan }} />
          </div>
          <div className="absolute top-8 right-8 animate-intro-corner" style={{ animationDelay: '0.1s' }}>
            <div className="w-16 h-1 ml-auto" style={{ background: CITY_COLORS.purple }} />
            <div className="w-1 h-16 ml-auto" style={{ background: CITY_COLORS.purple }} />
          </div>
          <div className="absolute bottom-8 left-8 animate-intro-corner" style={{ animationDelay: '0.2s' }}>
            <div className="w-1 h-16" style={{ background: CITY_COLORS.gold }} />
            <div className="w-16 h-1" style={{ background: CITY_COLORS.gold }} />
          </div>
          <div className="absolute bottom-8 right-8 animate-intro-corner" style={{ animationDelay: '0.3s' }}>
            <div className="w-1 h-16 ml-auto" style={{ background: CITY_COLORS.green }} />
            <div className="w-16 h-1 ml-auto" style={{ background: CITY_COLORS.green }} />
          </div>

          {/* Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-intro-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${3 + Math.random() * 5}px`,
                  height: `${3 + Math.random() * 5}px`,
                  background: i % 3 === 0 ? CITY_COLORS.cyan : i % 3 === 1 ? CITY_COLORS.purple : CITY_COLORS.gold,
                  boxShadow: `0 0 10px currentColor`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Holographic grid background */}
      <HoloGrid />

      {/* Broadcaster Logo - Top Right (shown after intro) */}
      {phase !== 'intro' && tournament?.broadcaster_logo_url && (
        <BroadcasterLogo
          logoUrl={tournament.broadcaster_logo_url}
          name={tournament.broadcaster_name}
          size="lg"
          position="top-right"
          theme="city"
          showName={false}
          animate
        />
      )}

      {/* City background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{
          backgroundImage: 'url(/images/city-night-bg.png)',
          filter: phase === 'blackout' ? 'brightness(0)' : phase === 'scan' ? 'brightness(0.2)' : 'brightness(0.4)',
        }}
      />

      {/* Data streams on sides */}
      {phase !== 'blackout' && (
        <>
          <DataStream side="left" />
          <DataStream side="right" />
        </>
      )}

      {/* Horizontal scan lines */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          phase !== 'blackout' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            ${CITY_COLORS.cyan}05 2px,
            ${CITY_COLORS.cyan}05 4px
          )`,
        }}
      />

      {/* Scanning beam */}
      {phase === 'scan' && (
        <div
          className="absolute left-0 right-0 h-2 animate-scan-beam z-50"
          style={{
            background: `linear-gradient(90deg, transparent, ${CITY_COLORS.cyan}, ${CITY_COLORS.cyan}, transparent)`,
            boxShadow: `0 0 30px ${CITY_COLORS.cyan}, 0 0 60px ${CITY_COLORS.cyan}50`,
          }}
        />
      )}

      {/* Fireworks canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-30" />

      {/* Screen flash on sold */}
      <div
        className={`absolute inset-0 z-40 pointer-events-none ${
          phase === 'banner' ? 'animate-neon-flash' : 'opacity-0'
        }`}
        style={{
          background: `radial-gradient(circle, ${CITY_COLORS.green}60, transparent)`,
        }}
      />

      {/* Corner UI elements */}
      <div className={`absolute inset-6 pointer-events-none transition-opacity duration-700 ${
        phase !== 'blackout' && phase !== 'scan' ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Top-left */}
        <div className="absolute top-0 left-0">
          <div className="w-20 h-1 mb-1" style={{ background: CITY_COLORS.green }} />
          <div className="w-1 h-20" style={{ background: CITY_COLORS.green }} />
          <div className="absolute top-3 left-3 text-xs font-mono" style={{ color: CITY_COLORS.green }}>
            SOLD
          </div>
        </div>
        {/* Top-right */}
        <div className="absolute top-0 right-0">
          <div className="w-20 h-1 mb-1 ml-auto" style={{ background: CITY_COLORS.cyan }} />
          <div className="w-1 h-20 ml-auto" style={{ background: CITY_COLORS.cyan }} />
        </div>
        {/* Bottom-left */}
        <div className="absolute bottom-0 left-0">
          <div className="w-1 h-20" style={{ background: CITY_COLORS.purple }} />
          <div className="w-20 h-1 mt-1" style={{ background: CITY_COLORS.purple }} />
        </div>
        {/* Bottom-right */}
        <div className="absolute bottom-0 right-0">
          <div className="w-1 h-20 ml-auto" style={{ background: CITY_COLORS.gold }} />
          <div className="w-20 h-1 mt-1 ml-auto" style={{ background: CITY_COLORS.gold }} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TOP BANNER - "SOLD" with glitch */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-700 ease-out ${
          phase !== 'blackout' && phase !== 'scan' ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* Top accent */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, transparent, ${CITY_COLORS.green}, ${CITY_COLORS.greenLight}, ${CITY_COLORS.green}, transparent)`,
          }}
        />

        {/* Banner content */}
        <div
          className="relative h-28 flex items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${CITY_COLORS.green}ee, ${CITY_COLORS.green})`,
          }}
        >
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(white 1px, transparent 1px),
                linear-gradient(90deg, white 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-banner-shine" />

          {/* Glitch layers */}
          <div className="relative">
            <span
              className="absolute inset-0 text-5xl md:text-6xl font-black tracking-[0.3em] uppercase animate-glitch-text-1"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: CITY_COLORS.cyan,
                clipPath: 'polygon(0 0, 100% 0, 100% 35%, 0 35%)',
              }}
            >
              SOLD TO {team.short_name || team.name}
            </span>
            <span
              className="absolute inset-0 text-5xl md:text-6xl font-black tracking-[0.3em] uppercase animate-glitch-text-2"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: CITY_COLORS.purple,
                clipPath: 'polygon(0 65%, 100% 65%, 100% 100%, 0 100%)',
              }}
            >
              SOLD TO {team.short_name || team.name}
            </span>
            <span
              className="text-5xl md:text-6xl font-black tracking-[0.3em] uppercase text-white"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              }}
            >
              SOLD TO {team.short_name || team.name}
            </span>
          </div>

          {/* Pulsing dots */}
          <div className="absolute left-8 flex gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
          <div className="absolute right-8 flex gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>

        {/* Bottom accent with data */}
        <div
          className="h-8 flex items-center justify-center gap-8"
          style={{
            background: `linear-gradient(90deg, ${CITY_COLORS.navy}, ${CITY_COLORS.green}40, ${CITY_COLORS.navy})`,
          }}
        >
          <span className="text-xs font-mono tracking-wider" style={{ color: CITY_COLORS.cyan }}>
            TRANSACTION CONFIRMED
          </span>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: CITY_COLORS.green }} />
          <span className="text-xs font-mono tracking-wider" style={{ color: CITY_COLORS.gold }}>
            LIVE BROADCAST
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT - Player and Team */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 flex items-center justify-center gap-8 md:gap-16 mt-24">

        {/* Player Frame */}
        <div
          className={`flex flex-col items-center transition-all duration-1000 ease-out ${
            phase === 'blackout' || phase === 'scan' || phase === 'banner'
              ? 'translate-x-[-250px] opacity-0 scale-50'
              : 'translate-x-0 opacity-100 scale-100'
          }`}
        >
          {/* Frame Container */}
          <div style={{ position: 'relative', width: '360px', height: '360px' }}>
            {/* Rotating outer ring */}
            <div
              className="absolute inset-0 animate-spin-slow"
              style={{
                border: `2px dashed ${CITY_COLORS.cyan}40`,
                borderRadius: '50%',
              }}
            />

            {/* Glow pulse */}
            <div
              className="absolute inset-0 animate-glow-pulse"
              style={{
                background: `radial-gradient(circle, ${CITY_COLORS.cyan}50, transparent 60%)`,
                filter: 'blur(30px)',
              }}
            />

            {/* Data circles */}
            <svg className="absolute inset-0 w-full h-full animate-spin-reverse" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="48"
                fill="none"
                stroke={`${CITY_COLORS.cyan}30`}
                strokeWidth="0.3"
                strokeDasharray="5 5"
              />
            </svg>

            {/* Photo */}
            <div
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
                className="rounded-xl overflow-hidden"
                style={{
                  width: '60%',
                  height: '60%',
                  boxShadow: `0 0 30px ${CITY_COLORS.cyan}60, inset 0 0 20px ${CITY_COLORS.cyan}20`,
                  border: `3px solid ${CITY_COLORS.cyan}80`,
                }}
              >
                {player.photo_url ? (
                  <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <User size={60} className="text-slate-600" />
                  </div>
                )}
              </div>
            </div>

            {/* PNG Frame */}
            <img
              src="/images/city-frame.png"
              alt=""
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
                `,
              }}
            />

            {/* Player UID badge */}
            {player.player_uid && (
              <div
                className={`absolute -top-3 -right-3 z-20 transition-all duration-500 ${
                  phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
                    ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                }`}
              >
                <div
                  className="w-16 h-16 flex items-center justify-center font-black text-xl text-white animate-badge-glow"
                  style={{
                    background: `linear-gradient(135deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple})`,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    fontFamily: "'Orbitron', sans-serif",
                  }}
                >
                  {player.player_uid}
                </div>
              </div>
            )}
          </div>

          {/* Player name */}
          <h2
            className={`mt-6 text-2xl md:text-3xl font-black uppercase tracking-wider text-center transition-all duration-700 ${
              phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
                ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{
              background: `linear-gradient(180deg, #ffffff, ${CITY_COLORS.cyan})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: "'Orbitron', sans-serif",
              filter: `drop-shadow(0 0 20px ${CITY_COLORS.cyan}80)`,
            }}
          >
            {player.name}
          </h2>
        </div>

        {/* Connection beam */}
        <div
          className={`transition-all duration-700 ${
            phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
              ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
        >
          <div className="relative">
            {/* Energy beam */}
            <div
              className="w-32 h-2 animate-beam-pulse"
              style={{
                background: `linear-gradient(90deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple}, ${CITY_COLORS.gold})`,
                boxShadow: `0 0 20px ${CITY_COLORS.cyan}, 0 0 40px ${CITY_COLORS.purple}50`,
              }}
            />
            {/* Arrow heads */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2"
              style={{
                width: 0,
                height: 0,
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderLeft: `16px solid ${CITY_COLORS.gold}`,
                filter: `drop-shadow(0 0 10px ${CITY_COLORS.gold})`,
              }}
            />
            {/* Particles on beam */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-beam-particle"
                style={{
                  background: CITY_COLORS.cyan,
                  boxShadow: `0 0 10px ${CITY_COLORS.cyan}`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Team Frame */}
        <div
          className={`flex flex-col items-center transition-all duration-1000 ease-out ${
            phase === 'blackout' || phase === 'scan' || phase === 'banner'
              ? 'translate-x-[250px] opacity-0 scale-50'
              : 'translate-x-0 opacity-100 scale-100'
          }`}
          style={{ transitionDelay: '0.2s' }}
        >
          {/* Frame Container */}
          <div style={{ position: 'relative', width: '360px', height: '360px' }}>
            {/* Rotating outer ring */}
            <div
              className="absolute inset-0 animate-spin-reverse"
              style={{
                border: `2px dashed ${CITY_COLORS.purple}40`,
                borderRadius: '50%',
              }}
            />

            {/* Glow pulse */}
            <div
              className="absolute inset-0 animate-glow-pulse"
              style={{
                background: `radial-gradient(circle, ${CITY_COLORS.purple}50, transparent 60%)`,
                filter: 'blur(30px)',
                animationDelay: '0.5s',
              }}
            />

            {/* Team logo */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: '20%',
                paddingRight: '12%',
                zIndex: 1,
              }}
            >
              <div style={{ width: '75%', height: '75%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      filter: `drop-shadow(0 0 20px ${CITY_COLORS.purple}80)`,
                    }}
                  />
                ) : (
                  <span
                    className="text-5xl font-black"
                    style={{
                      color: CITY_COLORS.purple,
                      textShadow: `0 0 30px ${CITY_COLORS.purple}`,
                    }}
                  >
                    {team.short_name}
                  </span>
                )}
              </div>
            </div>

            {/* PNG Frame */}
            <img
              src="/images/city-frame-team.png"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                zIndex: 10,
                filter: `
                  drop-shadow(0 0 15px ${CITY_COLORS.purple})
                  drop-shadow(0 0 30px ${CITY_COLORS.magenta}80)
                `,
              }}
            />
          </div>

          {/* Team name */}
          <h2
            className={`mt-6 text-2xl md:text-3xl font-black uppercase tracking-wider text-center transition-all duration-700 ${
              phase === 'merge' || phase === 'price' || phase === 'celebrate' || phase === 'exit'
                ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{
              background: `linear-gradient(180deg, #ffffff, ${CITY_COLORS.purple})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: "'Orbitron', sans-serif",
              filter: `drop-shadow(0 0 20px ${CITY_COLORS.purple}80)`,
              transitionDelay: '0.1s',
            }}
          >
            {team.name}
          </h2>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PRICE SECTION - Holographic display */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`absolute bottom-28 left-0 right-0 z-30 flex flex-col items-center transition-all duration-1000 ${
          phase === 'price' || phase === 'celebrate' || phase === 'exit'
            ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-80'
        }`}
      >
        <p
          className="text-sm md:text-base uppercase tracking-[0.5em] mb-4 font-mono"
          style={{
            color: CITY_COLORS.cyan,
            textShadow: `0 0 10px ${CITY_COLORS.cyan}`,
          }}
        >
          ◆ Final Price ◆
        </p>

        <div className="relative">
          {/* Holographic glow */}
          <div
            className="absolute inset-0 animate-holo-glow"
            style={{
              background: `radial-gradient(ellipse, ${CITY_COLORS.gold}50, transparent 70%)`,
              filter: 'blur(30px)',
              transform: 'scale(2.5)',
            }}
          />

          {/* Price container */}
          <div
            className="relative px-16 py-6"
            style={{
              background: `linear-gradient(135deg, ${CITY_COLORS.navy}ee, ${CITY_COLORS.purple}20, ${CITY_COLORS.navy}ee)`,
              border: `3px solid ${CITY_COLORS.gold}80`,
              clipPath: 'polygon(5% 0, 95% 0, 100% 30%, 100% 70%, 95% 100%, 5% 100%, 0% 70%, 0% 30%)',
              boxShadow: `inset 0 0 40px ${CITY_COLORS.gold}20`,
            }}
          >
            {/* Rotating border glow */}
            <div
              className="absolute inset-0 animate-border-rotate"
              style={{
                background: `conic-gradient(from 0deg, transparent, ${CITY_COLORS.gold}60, transparent, ${CITY_COLORS.cyan}60, transparent)`,
                clipPath: 'polygon(5% 0, 95% 0, 100% 30%, 100% 70%, 95% 100%, 5% 100%, 0% 70%, 0% 30%)',
                filter: 'blur(10px)',
              }}
            />

            <p
              className="relative text-6xl md:text-8xl font-black tabular-nums"
              style={{
                background: `linear-gradient(180deg, #ffffff 0%, ${CITY_COLORS.goldLight} 30%, ${CITY_COLORS.gold} 70%, #d97706 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: "'Orbitron', sans-serif",
                filter: `drop-shadow(0 0 30px ${CITY_COLORS.gold}80)`,
              }}
            >
              {formatAmountCompact(displayPrice, usePoints)}
            </p>
          </div>
        </div>

        {/* Base + Multiplier */}
        <div
          className={`flex items-center justify-center gap-8 mt-6 transition-all duration-700 ${
            phase === 'celebrate' || phase === 'exit' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <span className="text-lg font-mono" style={{ color: CITY_COLORS.cyan }}>
            Base: {formatAmountCompact(player.base_price, usePoints)}
          </span>
          {parseFloat(multiplier) > 1 && (
            <span
              className="px-6 py-2 font-black text-xl animate-multiplier-glow"
              style={{
                background: `linear-gradient(135deg, ${CITY_COLORS.purple}, ${CITY_COLORS.magenta})`,
                color: CITY_COLORS.gold,
                clipPath: 'polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0% 50%)',
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              {multiplier}x
            </span>
          )}
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-particle-rise"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '0',
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: i % 4 === 0 ? CITY_COLORS.cyan : i % 4 === 1 ? CITY_COLORS.purple : i % 4 === 2 ? CITY_COLORS.gold : CITY_COLORS.green,
              boxShadow: `0 0 ${6 + Math.random() * 8}px currentColor`,
              animationDuration: `${4 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Bottom ticker */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 transition-all duration-700 ${
          phase !== 'blackout' ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div
          className="h-1"
          style={{ background: `linear-gradient(90deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.green}, ${CITY_COLORS.gold}, ${CITY_COLORS.purple}, ${CITY_COLORS.cyan})` }}
        />
        <div
          className="h-10 flex items-center justify-center gap-6"
          style={{ background: `linear-gradient(to top, ${CITY_COLORS.navy}, transparent)` }}
        >
          <span className="text-xs font-mono tracking-wider" style={{ color: CITY_COLORS.cyan }}>
            CITY BROADCAST
          </span>
          <div className="w-2 h-2 rounded-full" style={{ background: CITY_COLORS.green, boxShadow: `0 0 10px ${CITY_COLORS.green}` }} />
          <span className="text-xs font-mono tracking-wider" style={{ color: CITY_COLORS.green }}>
            LIVE
          </span>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

        /* ═══════════════════════════════════════════════════════════════════ */
        /* BROADCASTER INTRO ANIMATIONS */
        /* ═══════════════════════════════════════════════════════════════════ */
        @keyframes intro-bg {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes intro-rays {
          0% { opacity: 0; transform: rotate(var(--rotation)) scaleY(0); }
          30% { opacity: 0.6; transform: rotate(var(--rotation)) scaleY(1); }
          70% { opacity: 0.6; transform: rotate(var(--rotation)) scaleY(1); }
          100% { opacity: 0; transform: rotate(var(--rotation)) scaleY(0); }
        }
        @keyframes intro-glow {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1); }
          70% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes intro-logo {
          0% { opacity: 0; transform: scale(0.3) rotateY(-30deg); }
          20% { opacity: 1; transform: scale(1.1) rotateY(0deg); }
          30% { transform: scale(1) rotateY(0deg); }
          70% { opacity: 1; transform: scale(1) rotateY(0deg); }
          100% { opacity: 0; transform: scale(1.5) rotateY(15deg); }
        }
        @keyframes intro-logo-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
        @keyframes intro-text {
          0% { opacity: 0; transform: translateY(20px); letter-spacing: 0.1em; }
          30% { opacity: 1; transform: translateY(0); letter-spacing: 0.3em; }
          70% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes intro-presents {
          0% { opacity: 0; transform: scaleX(0); }
          40% { opacity: 1; transform: scaleX(1); }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes intro-corner {
          0% { opacity: 0; transform: scale(0); }
          30% { opacity: 1; transform: scale(1); }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes intro-particle {
          0%, 100% { opacity: 0; transform: scale(0); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
        }

        .animate-intro-bg { animation: intro-bg 2.5s ease-in-out forwards; }
        .animate-intro-rays { animation: intro-rays 2.5s ease-out forwards; }
        .animate-intro-glow { animation: intro-glow 2.5s ease-out forwards; }
        .animate-intro-logo { animation: intro-logo 2.5s ease-out forwards; }
        .animate-intro-logo-pulse { animation: intro-logo-pulse 0.8s ease-in-out infinite; }
        .animate-intro-text { animation: intro-text 2.5s ease-out forwards; }
        .animate-intro-presents { animation: intro-presents 2.5s ease-out forwards; }
        .animate-intro-corner { animation: intro-corner 2.5s ease-out forwards; }
        .animate-intro-particle { animation: intro-particle 2.5s ease-in-out forwards; }

        @keyframes city-sold-exit {
          to { opacity: 0; transform: scale(1.1); filter: blur(10px); }
        }
        @keyframes scan-beam {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes neon-flash {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes banner-shine {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
        @keyframes glitch-text-1 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-3px, 0); }
          40% { transform: translate(3px, 0); }
          60% { transform: translate(-2px, 0); }
          80% { transform: translate(2px, 0); }
        }
        @keyframes glitch-text-2 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(3px, 0); }
          40% { transform: translate(-3px, 0); }
          60% { transform: translate(2px, 0); }
          80% { transform: translate(-2px, 0); }
        }
        @keyframes data-scroll {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes badge-glow {
          0%, 100% { box-shadow: 0 0 20px ${CITY_COLORS.cyan}; }
          50% { box-shadow: 0 0 40px ${CITY_COLORS.cyan}, 0 0 60px ${CITY_COLORS.purple}; }
        }
        @keyframes beam-pulse {
          0%, 100% { opacity: 0.8; transform: scaleX(1); }
          50% { opacity: 1; transform: scaleX(1.1); }
        }
        @keyframes beam-particle {
          0% { left: 0; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes holo-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes border-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes multiplier-glow {
          0%, 100% { box-shadow: 0 0 20px ${CITY_COLORS.purple}60; filter: brightness(1); }
          50% { box-shadow: 0 0 40px ${CITY_COLORS.purple}, 0 0 60px ${CITY_COLORS.magenta}80; filter: brightness(1.2); }
        }
        @keyframes particle-rise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? '' : '-'}50px); opacity: 0; }
        }

        .animate-city-sold-exit { animation: city-sold-exit 0.5s ease-out forwards; }
        .animate-scan-beam { animation: scan-beam 0.6s ease-out forwards; }
        .animate-neon-flash { animation: neon-flash 0.5s ease-out forwards; }
        .animate-banner-shine { animation: banner-shine 2s linear infinite; }
        .animate-glitch-text-1 { animation: glitch-text-1 0.5s ease-in-out infinite; }
        .animate-glitch-text-2 { animation: glitch-text-2 0.5s ease-in-out infinite; animation-delay: 0.05s; }
        .animate-data-scroll { animation: data-scroll 4s linear infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse { animation: spin-reverse 15s linear infinite; }
        .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
        .animate-badge-glow { animation: badge-glow 1.5s ease-in-out infinite; }
        .animate-beam-pulse { animation: beam-pulse 1s ease-in-out infinite; }
        .animate-beam-particle { animation: beam-particle 0.8s linear infinite; }
        .animate-holo-glow { animation: holo-glow 2s ease-in-out infinite; }
        .animate-border-rotate { animation: border-rotate 4s linear infinite; }
        .animate-multiplier-glow { animation: multiplier-glow 1.5s ease-in-out infinite; }
        .animate-particle-rise { animation: particle-rise linear infinite; }
      `}</style>
    </div>
  );
}
