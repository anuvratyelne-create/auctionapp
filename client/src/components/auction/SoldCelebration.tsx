import { useEffect, useState, useMemo, useRef } from 'react';

interface SoldCelebrationProps {
  isActive: boolean;
  teamColor?: string; // Optional team accent color
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  type: 'confetti' | 'sparkle' | 'star' | 'currency' | 'firework';
  opacity: number;
  delay: number;
}

interface FireworkParticle {
  angle: number;
  speed: number;
  x: number;
  y: number;
  opacity: number;
  size: number;
}

interface Firework {
  id: number;
  x: number;
  y: number;
  targetY: number;
  color: string;
  exploded: boolean;
  particles: FireworkParticle[];
}

const DEFAULT_COLORS = [
  '#22c55e', // green-500
  '#4ade80', // green-400
  '#86efac', // green-300
  '#fbbf24', // amber-400
  '#f59e0b', // amber-500
  '#ffffff', // white
  '#10b981', // emerald-500
  '#34d399', // emerald-400
];

// Generate colors including team color if provided
function getColors(teamColor?: string): string[] {
  if (!teamColor) return DEFAULT_COLORS;
  return [teamColor, ...DEFAULT_COLORS.slice(0, 6), teamColor];
}

export default function SoldCelebration({ isActive, teamColor }: SoldCelebrationProps) {
  const [show, setShow] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const colors = useMemo(() => getColors(teamColor), [teamColor]);

  // Generate confetti particles when activated
  const generatedParticles = useMemo(() => {
    if (!isActive) return [];

    const newParticles: Particle[] = [];

    // Create confetti particles from multiple positions with gravity physics
    for (let i = 0; i < 80; i++) {
      // Left side burst
      newParticles.push({
        id: i,
        x: Math.random() * 25,
        y: 100 + Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 14,
        speedX: 3 + Math.random() * 8,
        speedY: -(18 + Math.random() * 12),
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 25,
        gravity: 0.3 + Math.random() * 0.2,
        opacity: 1,
        delay: Math.random() * 0.2,
        type: Math.random() > 0.8 ? 'currency' : Math.random() > 0.6 ? 'star' : Math.random() > 0.4 ? 'sparkle' : 'confetti',
      });

      // Right side burst
      newParticles.push({
        id: i + 100,
        x: 75 + Math.random() * 25,
        y: 100 + Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 14,
        speedX: -(3 + Math.random() * 8),
        speedY: -(18 + Math.random() * 12),
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 25,
        gravity: 0.3 + Math.random() * 0.2,
        opacity: 1,
        delay: Math.random() * 0.2,
        type: Math.random() > 0.8 ? 'currency' : Math.random() > 0.6 ? 'star' : Math.random() > 0.4 ? 'sparkle' : 'confetti',
      });
    }

    // Center burst - more concentrated
    for (let i = 0; i < 40; i++) {
      newParticles.push({
        id: i + 200,
        x: 40 + Math.random() * 20,
        y: 45 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 12,
        speedX: (Math.random() - 0.5) * 15,
        speedY: -(10 + Math.random() * 10),
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
        gravity: 0.25 + Math.random() * 0.15,
        opacity: 1,
        delay: 0.1 + Math.random() * 0.2,
        type: Math.random() > 0.5 ? 'star' : 'sparkle',
      });
    }

    return newParticles;
  }, [isActive, colors]);

  // Generate fireworks
  const generatedFireworks = useMemo((): Firework[] => {
    if (!isActive) return [];

    const newFireworks: Firework[] = [];
    const fireworkPositions = [
      { x: 15, delay: 0 },
      { x: 85, delay: 100 },
      { x: 50, delay: 200 },
      { x: 30, delay: 350 },
      { x: 70, delay: 500 },
    ];

    fireworkPositions.forEach((pos, idx) => {
      const color = colors[idx % colors.length];
      const particles: FireworkParticle[] = [];

      // Create explosion particles
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        particles.push({
          angle,
          speed: 3 + Math.random() * 4,
          x: 0,
          y: 0,
          opacity: 1,
          size: 3 + Math.random() * 3,
        });
      }

      newFireworks.push({
        id: idx,
        x: pos.x,
        y: 110,
        targetY: 20 + Math.random() * 25,
        color,
        exploded: false,
        particles,
      });
    });

    return newFireworks;
  }, [isActive, colors]);

  // Canvas-based firework animation
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const localFireworks = generatedFireworks.map(fw => ({ ...fw, particles: fw.particles.map(p => ({ ...p })) }));
    let startTime = Date.now();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = Date.now() - startTime;

      localFireworks.forEach((fw, fwIdx) => {
        const delay = [0, 100, 200, 350, 500][fwIdx];
        if (elapsed < delay) return;

        const fwElapsed = elapsed - delay;

        if (!fw.exploded) {
          // Rising phase
          const progress = Math.min(fwElapsed / 600, 1);
          const currentY = fw.y - (fw.y - fw.targetY) * progress;

          // Draw trail
          ctx.beginPath();
          ctx.moveTo((fw.x / 100) * canvas.width, (currentY / 100) * canvas.height);
          ctx.lineTo((fw.x / 100) * canvas.width, ((currentY + 5) / 100) * canvas.height);
          ctx.strokeStyle = fw.color;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Draw head
          ctx.beginPath();
          ctx.arc((fw.x / 100) * canvas.width, (currentY / 100) * canvas.height, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          if (progress >= 1) {
            fw.exploded = true;
          }
        } else {
          // Explosion phase
          const explosionElapsed = fwElapsed - 600;
          const explosionProgress = Math.min(explosionElapsed / 1500, 1);

          fw.particles.forEach((p) => {
            const distance = p.speed * explosionProgress * 50;
            const x = ((fw.x / 100) * canvas.width) + Math.cos(p.angle) * distance;
            const y = ((fw.targetY / 100) * canvas.height) + Math.sin(p.angle) * distance + (explosionProgress * explosionProgress * 100);
            const opacity = 1 - explosionProgress;
            const size = p.size * (1 - explosionProgress * 0.5);

            if (opacity > 0) {
              ctx.beginPath();
              ctx.arc(x, y, size, 0, Math.PI * 2);
              ctx.fillStyle = fw.color;
              ctx.globalAlpha = opacity;
              ctx.fill();
              ctx.globalAlpha = 1;

              // Add glow
              ctx.beginPath();
              ctx.arc(x, y, size * 2, 0, Math.PI * 2);
              const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
              gradient.addColorStop(0, fw.color);
              gradient.addColorStop(1, 'transparent');
              ctx.fillStyle = gradient;
              ctx.globalAlpha = opacity * 0.5;
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          });
        }
      });

      if (elapsed < 3500) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, generatedFireworks]);

  useEffect(() => {
    if (isActive) {
      setShow(true);
      setParticles(generatedParticles);

      const timer = setTimeout(() => {
        setShow(false);
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      setShow(false);
      setParticles([]);
    }
  }, [isActive, generatedParticles, generatedFireworks]);

  if (!show) return null;

  // Get tint color for flash effect
  const flashColor = teamColor || '#22c55e';

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {/* Fireworks canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Team color / green glow flash */}
      <div
        className="absolute inset-0 animate-sold-flash"
        style={{
          backgroundColor: `${flashColor}50`,
        }}
      />

      {/* Vignette glow with team color */}
      <div
        className="absolute inset-0 animate-pulse-fast"
        style={{
          background: `radial-gradient(circle, transparent 30%, ${flashColor}20 100%)`,
        }}
      />

      {/* Side beams with team color */}
      <div
        className="absolute left-0 top-0 bottom-0 w-40 animate-beam-left"
        style={{
          background: `linear-gradient(to right, ${flashColor}40, transparent)`,
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-40 animate-beam-right"
        style={{
          background: `linear-gradient(to left, ${flashColor}40, transparent)`,
        }}
      />

      {/* Screen flash overlay */}
      <div className="absolute inset-0 bg-white animate-screen-flash" />

      {/* Confetti particles with physics */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti-physics"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            '--speed-x': `${particle.speedX}px`,
            '--speed-y': `${particle.speedY}px`,
            '--rotation': `${particle.rotation}deg`,
            '--rotation-speed': `${particle.rotationSpeed}deg`,
            '--gravity': particle.gravity,
            animationDelay: `${particle.delay}s`,
          } as React.CSSProperties}
        >
          {particle.type === 'confetti' && (
            <div
              className="rounded-sm"
              style={{
                width: particle.size,
                height: particle.size * 0.6,
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size / 2}px ${particle.color}`,
              }}
            />
          )}
          {particle.type === 'sparkle' && (
            <div
              className="rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size}px ${particle.color}, 0 0 ${particle.size * 2}px ${particle.color}`,
              }}
            />
          )}
          {particle.type === 'star' && (
            <svg
              width={particle.size}
              height={particle.size}
              viewBox="0 0 24 24"
              fill={particle.color}
              style={{
                filter: `drop-shadow(0 0 ${particle.size / 2}px ${particle.color})`,
              }}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )}
          {particle.type === 'currency' && (
            <span
              className="font-black"
              style={{
                fontSize: particle.size * 1.2,
                color: particle.color,
                textShadow: `0 0 ${particle.size}px ${particle.color}`,
              }}
            >
              $
            </span>
          )}
        </div>
      ))}

      {/* "SOLD" text burst with team color accent */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-sold-text-burst">
          <span
            className="text-8xl font-black text-transparent bg-clip-text"
            style={{
              backgroundImage: `linear-gradient(to right, ${flashColor}, #86efac, ${flashColor})`,
              filter: `drop-shadow(0 0 30px ${flashColor}80)`,
            }}
          >
            SOLD!
          </span>
        </div>
      </div>

      {/* Additional sparkle bursts */}
      <div className="absolute top-1/4 left-1/4 animate-sparkle-burst-1">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: flashColor, boxShadow: `0 0 20px ${flashColor}` }} />
      </div>
      <div className="absolute top-1/3 right-1/4 animate-sparkle-burst-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: flashColor, boxShadow: `0 0 15px ${flashColor}` }} />
      </div>
      <div className="absolute bottom-1/3 left-1/3 animate-sparkle-burst-3">
        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: flashColor, boxShadow: `0 0 25px ${flashColor}` }} />
      </div>
    </div>
  );
}
