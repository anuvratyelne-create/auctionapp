import { useEffect, useState } from 'react';
import { Team } from '../../types';

interface OverlayCelebrationProps {
  isActive: boolean;
  team?: Team | null;
  soldPrice?: number;
  accentColor?: string;
}

export default function OverlayCelebration({
  isActive,
  team,
  soldPrice,
  accentColor = '#22c55e'
}: OverlayCelebrationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3500);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isActive]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {/* Green/Team color flash */}
      <div
        className="absolute inset-0 animate-overlay-flash"
        style={{ backgroundColor: `${accentColor}40` }}
      />

      {/* Corner bursts */}
      <div
        className="absolute top-0 left-0 w-64 h-64 animate-corner-burst-tl"
        style={{
          background: `radial-gradient(circle at top left, ${accentColor}60, transparent 70%)`
        }}
      />
      <div
        className="absolute top-0 right-0 w-64 h-64 animate-corner-burst-tr"
        style={{
          background: `radial-gradient(circle at top right, ${accentColor}60, transparent 70%)`
        }}
      />

      {/* SOLD badge - appears from scale 0 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-overlay-sold-badge">
          <div
            className="relative px-12 py-6 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              boxShadow: `0 0 60px ${accentColor}80, 0 0 120px ${accentColor}40`
            }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div
                className="absolute inset-0 animate-shine"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  transform: 'skewX(-20deg)'
                }}
              />
            </div>

            <div className="relative text-center">
              <span className="text-6xl font-black text-white tracking-tight drop-shadow-lg">
                SOLD!
              </span>

              {/* Team & Price info */}
              {(team || soldPrice) && (
                <div className="mt-3 flex items-center justify-center gap-4">
                  {team && (
                    <div className="flex items-center gap-2">
                      {team.logo_url && (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-10 h-10 object-contain"
                        />
                      )}
                      <span className="text-white/90 font-bold text-xl">
                        {team.short_name}
                      </span>
                    </div>
                  )}
                  {soldPrice && (
                    <span className="text-white text-2xl font-black">
                      {soldPrice.toLocaleString('en-IN')} pts
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confetti particles - minimal for overlay */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full animate-overlay-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            backgroundColor: i % 3 === 0 ? accentColor : i % 3 === 1 ? '#fbbf24' : '#ffffff',
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${1.5 + Math.random()}s`
          }}
        />
      ))}
    </div>
  );
}
