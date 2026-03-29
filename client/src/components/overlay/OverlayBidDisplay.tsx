import { useEffect, useState, useRef } from 'react';
import { Team } from '../../types';

interface OverlayBidDisplayProps {
  currentBid: number;
  currentTeam: Team | null;
  mode?: 'minimal' | 'standard' | 'premium';
  accentColor?: string;
}

export default function OverlayBidDisplay({
  currentBid,
  currentTeam,
  mode = 'standard',
  accentColor = '#22c55e'
}: OverlayBidDisplayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const previousBidRef = useRef(currentBid);

  // Animate on bid change
  useEffect(() => {
    if (currentBid !== previousBidRef.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      previousBidRef.current = currentBid;
      return () => clearTimeout(timer);
    }
  }, [currentBid]);

  // Minimal mode
  if (mode === 'minimal') {
    return (
      <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
        <span
          className={`text-2xl font-bold ${isAnimating ? 'animate-bid-pulse' : ''}`}
          style={{ color: accentColor }}
        >
          {currentBid.toLocaleString('en-IN')}
        </span>
        <span className="text-slate-400 text-sm">pts</span>
      </div>
    );
  }

  // Premium mode
  if (mode === 'premium') {
    return (
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))`,
          border: `2px solid ${accentColor}40`,
          boxShadow: `0 0 40px ${accentColor}20`
        }}
      >
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `linear-gradient(45deg, ${accentColor}00, ${accentColor}30, ${accentColor}00)`,
            backgroundSize: '200% 200%',
            animation: 'gradient-sweep 3s ease-in-out infinite'
          }}
        />

        {/* Current Bid Section */}
        <div
          className="relative px-8 py-5 text-center"
          style={{
            background: `linear-gradient(180deg, ${accentColor}20, transparent)`
          }}
        >
          <p
            className="text-sm uppercase tracking-widest font-medium mb-2"
            style={{ color: accentColor }}
          >
            Current Bid
          </p>
          <div className={`${isAnimating ? 'animate-bid-scale' : ''}`}>
            <span
              className="text-6xl font-black"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, #ffffff, ${accentColor})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: `0 0 60px ${accentColor}60`,
                backgroundSize: '200% auto',
                animation: 'text-gradient 3s linear infinite'
              }}
            >
              {currentBid.toLocaleString('en-IN')}
            </span>
            <span className="text-2xl text-white/70 ml-2">pts</span>
          </div>
        </div>

        {/* Bidding Team Section */}
        {currentTeam && (
          <div className="relative px-6 py-4 border-t border-white/10">
            <div className="flex items-center gap-4">
              {/* Team Logo with glow */}
              <div
                className="relative"
                style={{
                  filter: `drop-shadow(0 0 15px ${accentColor}50)`
                }}
              >
                {currentTeam.logo_url ? (
                  <img
                    src={currentTeam.logo_url}
                    alt={currentTeam.name}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`
                    }}
                  >
                    {currentTeam.short_name}
                  </div>
                )}

                {/* Pulsing ring */}
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ border: `2px solid ${accentColor}` }}
                />
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <p className="font-bold text-white text-xl">{currentTeam.name}</p>
                <p className="text-sm" style={{ color: accentColor }}>
                  Leading Bid
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard mode (default)
  return (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10">
      <div
        className="px-8 py-4 text-center"
        style={{
          background: `linear-gradient(135deg, ${accentColor}90, ${accentColor}70)`
        }}
      >
        <p className="text-white/80 text-xs uppercase tracking-wider mb-1">
          Current Bid
        </p>
        <p className={`text-4xl font-bold text-white ${isAnimating ? 'animate-bid-pulse' : ''}`}>
          {currentBid.toLocaleString('en-IN')}
          <span className="text-lg ml-2">pts</span>
        </p>
      </div>

      {currentTeam && (
        <div className="px-6 py-4 flex items-center gap-4">
          {currentTeam.logo_url ? (
            <img
              src={currentTeam.logo_url}
              alt={currentTeam.name}
              className="w-12 h-12 object-contain"
            />
          ) : (
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
              <span className="font-bold text-white">{currentTeam.short_name}</span>
            </div>
          )}
          <div>
            <p className="font-bold text-white">{currentTeam.name}</p>
            <p className="text-xs text-slate-400">{currentTeam.short_name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
