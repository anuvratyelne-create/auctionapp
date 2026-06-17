import { Player, Team } from '../../../types';
import { User, TrendingUp } from 'lucide-react';

interface CityOverlayProps {
  player: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  status: 'idle' | 'bidding' | 'sold' | 'unsold';
  tournament?: {
    name?: string;
    logo_url?: string;
    broadcaster_logo_url?: string;
    broadcaster_name?: string;
  } | null;
  slideState: 'entering' | 'active' | 'sold' | 'unsold';
  bidAnimating: boolean;
  showParticles?: boolean;
  accentColor?: string;
}

// Neon light particles
function NeonParticles({ count = 25, colors }: { count?: number; colors?: string[] }) {
  const particleColors = colors || ['#06b6d4', '#a855f7', '#ec4899', '#22d3ee'];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const color = particleColors[i % particleColors.length];
        const size = 3 + Math.random() * 5;
        const duration = 4 + Math.random() * 6;
        const delay = Math.random() * 5;
        const left = Math.random() * 100;
        const startTop = Math.random() * 100;

        return (
          <div
            key={i}
            className="absolute rounded-full animate-neon-float"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${left}%`,
              top: `${startTop}%`,
              backgroundColor: color,
              boxShadow: `0 0 ${size * 3}px ${color}, 0 0 ${size * 6}px ${color}`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              opacity: 0.6 + Math.random() * 0.4,
            }}
          />
        );
      })}

      {/* Traffic light trails */}
      {Array.from({ length: 8 }).map((_, i) => {
        const isLeft = Math.random() > 0.5;
        const top = 60 + Math.random() * 30;
        const color = Math.random() > 0.5 ? '#ef4444' : '#fbbf24';
        const duration = 2 + Math.random() * 2;

        return (
          <div
            key={`trail-${i}`}
            className="absolute h-0.5 animate-traffic-trail"
            style={{
              width: '60px',
              top: `${top}%`,
              left: isLeft ? '-60px' : undefined,
              right: isLeft ? undefined : '-60px',
              background: `linear-gradient(${isLeft ? '90deg' : '270deg'}, transparent, ${color})`,
              boxShadow: `0 0 10px ${color}`,
              animationDuration: `${duration}s`,
              animationDelay: `${i * 0.3}s`,
              animationDirection: isLeft ? 'normal' : 'reverse',
            }}
          />
        );
      })}
    </div>
  );
}

export default function CityOverlay({
  player,
  currentBid,
  currentTeam,
  status,
  tournament,
  slideState,
  bidAnimating,
  showParticles = true,
  accentColor = '#06b6d4',
}: CityOverlayProps) {

  if (!player || status === 'idle') {
    return <div className="overlay-bg min-h-screen" />;
  }

  return (
    <div className="overlay-bg min-h-screen relative overflow-hidden" style={{ fontFamily: "'Orbitron', sans-serif" }}>
      {/* Dark city gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at bottom, rgba(6,182,212,0.15) 0%, rgba(10,10,30,0.95) 40%, rgba(5,5,15,1) 100%)',
        }}
      />

      {/* Neon particles and traffic trails */}
      {showParticles && <NeonParticles count={25} />}

      {/* Grid lines overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Top Neon Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-14"
        style={{
          background: 'linear-gradient(90deg, #06b6d4, #a855f7, #ec4899, #a855f7, #06b6d4)',
        }}
      >
        <div className="h-full flex items-center justify-between px-6 bg-black/30">
          {/* Tournament */}
          <div className="flex items-center gap-4">
            {tournament?.logo_url && (
              <img src={tournament.logo_url} className="h-9 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            )}
            <span className="text-white font-bold text-lg tracking-widest uppercase">
              {tournament?.name || 'PLAYER AUCTION'}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-lg" style={{ boxShadow: '0 0 15px #06b6d4' }} />
            <span className="text-white font-black text-xl tracking-widest">
              {slideState === 'entering' ? 'NEXT UP' :
               slideState === 'sold' ? 'SOLD!' :
               slideState === 'unsold' ? 'UNSOLD' : 'LIVE BIDDING'}
            </span>
          </div>

        </div>
        {/* Neon glow at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-cyan-500/60 to-transparent blur-sm" />
      </div>

      {/* Main Content */}
      <div className="absolute top-14 left-0 right-0 bottom-32">
        <div className="h-full flex items-center justify-center">
          <div
            className={`relative transition-all duration-700 ${
              slideState === 'entering' ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
            }`}
            style={{ maxWidth: '500px', width: '90%' }}
          >
            {/* Rotating neon ring frame */}
            <div
              className="absolute -inset-4 rounded-2xl animate-neon-rotate"
              style={{
                background: 'conic-gradient(from 0deg, #06b6d4, #a855f7, #ec4899, #a855f7, #06b6d4)',
                filter: 'blur(15px)',
                opacity: 0.6,
              }}
            />
            <div
              className="absolute -inset-2 rounded-xl"
              style={{
                background: 'conic-gradient(from 180deg, transparent, #06b6d4 50%, transparent)',
                filter: 'blur(4px)',
                animation: 'neon-spin 4s linear infinite',
              }}
            />

            {/* Card content */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(15,15,30,0.98), rgba(10,10,25,0.95))',
                border: '2px solid rgba(6,182,212,0.5)',
                boxShadow: '0 0 40px rgba(6,182,212,0.3), inset 0 0 40px rgba(6,182,212,0.05)',
              }}
            >
              {/* Player Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {player.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt={player.name}
                    className="w-full h-full object-cover"
                    style={{ filter: 'saturate(1.2)' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)' }}>
                    <User size={120} className="text-cyan-400/40" />
                  </div>
                )}

                {/* Cyberpunk gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, rgba(10,10,30,1) 0%, transparent 40%, transparent 60%, rgba(6,182,212,0.1) 100%)',
                  }}
                />

                {/* Player UID Badge - Hexagon style */}
                {player.player_uid && (
                  <div
                    className="absolute top-4 right-4 w-16 h-16 flex items-center justify-center text-2xl font-black text-white"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      boxShadow: '0 0 30px rgba(6,182,212,0.8)',
                    }}
                  >
                    {player.player_uid}
                  </div>
                )}

                {/* Category */}
                {player.categories && (
                  <div
                    className="absolute top-4 left-4 px-4 py-1.5 text-sm font-bold text-white tracking-wider"
                    style={{
                      background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                      clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)',
                    }}
                  >
                    {player.categories.name}
                  </div>
                )}

                {/* Player Name */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2
                    className="text-5xl font-black text-white tracking-wide"
                    style={{
                      textShadow: '0 0 30px rgba(6,182,212,0.8), 0 0 60px rgba(168,85,247,0.4)',
                    }}
                  >
                    {player.name}
                  </h2>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 border-t border-cyan-500/30">
                <div className="p-4 text-center border-r border-cyan-500/30">
                  <p className="text-xs uppercase tracking-widest text-cyan-300/70">Base Price</p>
                  <p className="text-xl font-bold text-white">{player.base_price.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 text-center border-r border-cyan-500/30" style={{ background: 'rgba(6,182,212,0.1)' }}>
                  <p className="text-xs uppercase tracking-widest text-cyan-400">Current Bid</p>
                  <p
                    className={`text-2xl font-black text-cyan-400 transition-transform ${bidAnimating ? 'scale-110' : ''}`}
                    style={{ textShadow: '0 0 20px rgba(6,182,212,0.6)' }}
                  >
                    {currentBid.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs uppercase tracking-widest text-cyan-300/70">Bids</p>
                  <p className="text-xl font-bold text-white flex items-center justify-center gap-1">
                    <TrendingUp size={18} className="text-purple-400" />
                    {currentTeam ? '1+' : '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-16 bg-gradient-to-t from-slate-900/80 to-transparent" />

        <div style={{ background: 'linear-gradient(90deg, #0a0a1a, #0f0f25, #0a0a1a)' }}>
          {/* Top neon accent */}
          <div
            className="h-2 relative overflow-hidden"
            style={{ background: 'linear-gradient(90deg, #06b6d4, #a855f7, #ec4899, #a855f7, #06b6d4)' }}
          >
            <div
              className="absolute inset-y-0 w-32 animate-neon-slide"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
            />
          </div>

          <div className="flex items-stretch">
            {/* Team Section */}
            <div
              className="flex items-center gap-4 px-8 py-5"
              style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), transparent)', minWidth: '280px' }}
            >
              {currentTeam ? (
                <>
                  <div className="relative">
                    {currentTeam.logo_url ? (
                      <img
                        src={currentTeam.logo_url}
                        className="w-16 h-16 object-contain"
                        style={{ filter: 'drop-shadow(0 0 15px rgba(6,182,212,0.6))' }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #a855f7)' }}
                      >
                        {currentTeam.short_name}
                      </div>
                    )}
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{ border: '2px solid #06b6d4' }}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-cyan-400">Leading Team</p>
                    <p className="text-xl font-bold text-white tracking-wide">{currentTeam.name}</p>
                  </div>
                </>
              ) : (
                <span className="text-cyan-300/70 tracking-wider">Awaiting first bid...</span>
              )}
            </div>

            {/* Current Bid */}
            <div className="flex-1 flex items-center justify-center py-5" style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.08), transparent)' }}>
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.3em] mb-1 text-cyan-400">Current Bid</p>
                <div className={`transition-all duration-300 ${bidAnimating ? 'scale-110' : 'scale-100'}`}>
                  <span
                    className="text-6xl font-black text-white"
                    style={{ textShadow: '0 0 40px rgba(6,182,212,0.5), 0 0 80px rgba(168,85,247,0.3)' }}
                  >
                    {currentBid.toLocaleString('en-IN')}
                  </span>
                  <span className="text-2xl text-cyan-300/70 ml-2 tracking-wider">pts</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            {(status === 'sold' || status === 'unsold') && (
              <div
                className="flex items-center justify-center px-10"
                style={{ minWidth: '180px' }}
              >
                <div
                  className="px-8 py-4 rounded-xl text-2xl font-black text-white tracking-wider"
                  style={{
                    background: status === 'sold'
                      ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                      : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    boxShadow: `0 0 30px ${status === 'sold' ? 'rgba(6,182,212,0.6)' : 'rgba(168,85,247,0.6)'}`,
                  }}
                >
                  {status.toUpperCase()}!
                </div>
              </div>
            )}
          </div>

          {/* Bottom neon bar */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #06b6d4, #a855f7, #ec4899, #a855f7, #06b6d4)' }} />
        </div>
      </div>

      {/* Sold Banner */}
      {slideState === 'sold' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="relative animate-city-sold">
            <div
              className="px-20 py-10 text-7xl font-black text-white tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)',
                boxShadow: '0 0 100px rgba(6,182,212,0.8)',
                textShadow: '0 0 30px rgba(0,0,0,0.5)',
              }}
            >
              SOLD TO {currentTeam?.short_name || 'TEAM'}!
            </div>
            <div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 text-3xl font-black text-white rounded-lg tracking-wider"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            >
              {currentBid.toLocaleString('en-IN')} PTS
            </div>
          </div>
        </div>
      )}

      {/* Unsold Banner */}
      {slideState === 'unsold' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div
            className="px-20 py-10 text-7xl font-black text-white tracking-wider animate-city-unsold"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
              clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)',
              boxShadow: '0 0 100px rgba(168,85,247,0.7)',
            }}
          >
            UNSOLD
          </div>
        </div>
      )}

      {/* Import Orbitron font */}
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <style>{`
        .overlay-bg { background: transparent !important; }

        @keyframes neon-float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.6;
          }
          25% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-10px) translateX(-5px);
            opacity: 0.5;
          }
          75% {
            transform: translateY(-30px) translateX(-10px);
            opacity: 0.7;
          }
        }
        .animate-neon-float {
          animation: neon-float ease-in-out infinite;
        }

        @keyframes traffic-trail {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(calc(100vw + 120px)); opacity: 0; }
        }
        .animate-traffic-trail {
          animation: traffic-trail linear infinite;
        }

        @keyframes neon-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-neon-rotate {
          animation: neon-rotate 8s linear infinite;
        }

        @keyframes neon-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes neon-slide {
          0% { left: -32px; }
          100% { left: 100%; }
        }
        .animate-neon-slide {
          animation: neon-slide 3s linear infinite;
        }

        @keyframes city-sold {
          0% { transform: scale(0.5) rotate(-5deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(-3deg); }
          100% { transform: scale(1) rotate(-3deg); opacity: 1; }
        }
        .animate-city-sold {
          animation: city-sold 0.5s ease-out forwards;
        }

        @keyframes city-unsold {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05) rotate(2deg); }
          60% { transform: scale(1) rotate(-2deg); }
          70% { transform: scale(1.02) rotate(1deg); }
          80% { transform: scale(1) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-city-unsold {
          animation: city-unsold 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
