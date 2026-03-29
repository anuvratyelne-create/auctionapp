import { useEffect, useState } from 'react';
import { Gavel } from 'lucide-react';

type StickerStatus = 'sold' | 'unsold' | 'bidding';
type StickerSize = 'sm' | 'md' | 'lg';

interface StatusStickerProps {
  status: StickerStatus;
  size?: StickerSize;
  className?: string;
  showAnimation?: boolean;
}

const sizeConfig = {
  sm: {
    container: 'w-32 h-32',
    image: 'w-32 h-32',
    icon: 20,
    text: 'text-xs',
    confetti: 6,
  },
  md: {
    container: 'w-48 h-48',
    image: 'w-48 h-48',
    icon: 28,
    text: 'text-sm',
    confetti: 8,
  },
  lg: {
    container: 'w-72 h-72',
    image: 'w-72 h-72',
    icon: 36,
    text: 'text-base',
    confetti: 12,
  },
};

const statusConfig = {
  sold: {
    gradient: 'from-emerald-500 via-green-500 to-emerald-600',
    shadowColor: 'rgba(34, 197, 94, 0.5)',
    label: 'SOLD',
    stampImage: '/stamps/sold-stamp.png',
  },
  unsold: {
    gradient: 'from-red-500 via-rose-500 to-red-600',
    shadowColor: 'rgba(239, 68, 68, 0.5)',
    label: 'UNSOLD',
    stampImage: '/stamps/unsold-stamp.png',
  },
  bidding: {
    gradient: 'from-amber-500 via-yellow-500 to-amber-600',
    shadowColor: 'rgba(245, 158, 11, 0.5)',
    label: 'BIDDING',
    stampImage: null,
  },
};

// Confetti particle component
function ConfettiParticle({ delay, x, y, color }: { delay: number; x: number; y: number; color: string }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-confetti-spread"
      style={{
        '--x': `${x}px`,
        '--y': `${y}px`,
        backgroundColor: color,
        animationDelay: `${delay}ms`,
        left: '50%',
        top: '50%',
      } as React.CSSProperties}
    />
  );
}

// Starburst ray component
function StarburstRay({ angle, delay }: { angle: number; delay: number }) {
  return (
    <div
      className="absolute w-1 h-8 bg-gradient-to-t from-yellow-400 to-transparent animate-starburst origin-bottom"
      style={{
        transform: `rotate(${angle}deg)`,
        animationDelay: `${delay}ms`,
        left: '50%',
        bottom: '50%',
        marginLeft: '-2px',
      }}
    />
  );
}

export default function StatusSticker({
  status,
  size = 'md',
  className = '',
  showAnimation = true,
}: StatusStickerProps) {
  const [mounted, setMounted] = useState(false);
  const config = statusConfig[status];
  const sizeConf = sizeConfig[size];

  useEffect(() => {
    setMounted(true);
  }, []);

  const confettiColors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
  const confettiParticles = Array.from({ length: sizeConf.confetti }, (_, i) => ({
    x: Math.cos((i * 2 * Math.PI) / sizeConf.confetti) * 60,
    y: Math.sin((i * 2 * Math.PI) / sizeConf.confetti) * -60,
    color: confettiColors[i % confettiColors.length],
    delay: i * 50,
  }));

  const starburstRays = Array.from({ length: 8 }, (_, i) => ({
    angle: i * 45,
    delay: i * 30,
  }));

  // Use PNG stamps for sold/unsold status
  if ((status === 'sold' || status === 'unsold') && config.stampImage) {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        {/* Starburst effect for SOLD */}
        {status === 'sold' && showAnimation && mounted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {starburstRays.map((ray, i) => (
              <StarburstRay key={i} angle={ray.angle} delay={ray.delay} />
            ))}
          </div>
        )}

        {/* Confetti for SOLD */}
        {status === 'sold' && showAnimation && mounted && (
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            {confettiParticles.map((particle, i) => (
              <ConfettiParticle
                key={i}
                delay={particle.delay}
                x={particle.x}
                y={particle.y}
                color={particle.color}
              />
            ))}
          </div>
        )}

        {/* PNG Stamp Image */}
        <img
          src={config.stampImage}
          alt={config.label}
          className={`
            ${sizeConf.image}
            object-contain
            ${showAnimation && mounted ? 'animate-stamp-slam' : ''}
            drop-shadow-2xl
          `}
          style={{
            filter: `drop-shadow(0 4px 20px ${config.shadowColor})`,
          }}
        />
      </div>
    );
  }

  // Fallback for bidding status (keep original design)
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Main Sticker for bidding */}
      <div
        className={`
          w-32 h-32
          relative rounded-full
          bg-gradient-to-br ${config.gradient}
          flex flex-col items-center justify-center
          shadow-2xl
          ${showAnimation && mounted ? 'animate-sticker-pop' : ''}
        `}
        style={{
          boxShadow: `0 8px 32px ${config.shadowColor}, inset 0 2px 4px rgba(255,255,255,0.3)`,
        }}
      >
        {/* Inner highlight ring */}
        <div className="absolute inset-1 rounded-full border-2 border-white/30" />

        {/* Glossy overlay */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/20 pointer-events-none" />

        {/* Icon */}
        <Gavel
          size={sizeConf.icon}
          className={`relative z-10 text-white drop-shadow-lg ${
            showAnimation ? 'animate-gavel-swing' : ''
          }`}
          strokeWidth={3}
        />

        {/* Label */}
        <span className={`relative z-10 font-black ${sizeConf.text} text-white tracking-wider drop-shadow-lg mt-0.5`}>
          {config.label}
        </span>

        {/* Shimmer effect for bidding */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
