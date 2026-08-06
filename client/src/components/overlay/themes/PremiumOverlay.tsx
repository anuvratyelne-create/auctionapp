import { useState, useEffect } from 'react';
import { Player, Team } from '../../../types';
import { User, Zap, Crown } from 'lucide-react';

interface PremiumOverlayProps {
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

// Floating Gold Particles - premium feel
const GoldParticles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    {[...Array(25)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full animate-float-particle"
        style={{
          width: `${Math.random() * 5 + 2}px`,
          height: `${Math.random() * 5 + 2}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: i % 2 === 0 ? '#ffd700' : '#d4af37',
          boxShadow: `0 0 ${8 + Math.random() * 8}px #d4af37`,
          opacity: 0.5 + Math.random() * 0.3,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 8 + 12}s`,
        }}
      />
    ))}
  </div>
);

// Gold corner decoration component
const GoldCorner = ({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) => {
  const isTop = position.includes('top');
  const isLeft = position.includes('left');

  return (
    <div className={`absolute ${isTop ? 'top-0' : 'bottom-0'} ${isLeft ? 'left-0' : 'right-0'} w-12 h-12 pointer-events-none`}>
      <div
        className={`absolute ${isTop ? 'top-0' : 'bottom-0'} ${isLeft ? 'left-0' : 'right-0'} w-full h-[3px]`}
        style={{ background: `linear-gradient(${isLeft ? '90deg' : '270deg'}, #ffd700, transparent)` }}
      />
      <div
        className={`absolute ${isTop ? 'top-0' : 'bottom-0'} ${isLeft ? 'left-0' : 'right-0'} w-[3px] h-full`}
        style={{ background: `linear-gradient(${isTop ? '180deg' : '0deg'}, #ffd700, transparent)` }}
      />
    </div>
  );
};

export default function PremiumOverlay({
  player,
  currentBid,
  currentTeam,
  status,
  tournament,
  slideState,
  bidAnimating,
  showParticles = true,
}: PremiumOverlayProps) {
  const [showAppLogo, setShowAppLogo] = useState(!tournament?.broadcaster_logo_url);

  // Rotating logo effect
  useEffect(() => {
    if (!tournament?.broadcaster_logo_url) {
      setShowAppLogo(true);
      return;
    }
    const interval = setInterval(() => setShowAppLogo((prev) => !prev), 5000);
    return () => clearInterval(interval);
  }, [tournament?.broadcaster_logo_url]);

  if (!player || status === 'idle') {
    return <div className="overlay-bg min-h-screen" />;
  }

  return (
    <div className="overlay-bg min-h-screen relative overflow-hidden">
      {/* Floating Particles */}
      {showParticles && <GoldParticles />}

      {/* ==================== FLOATING LOGOS ==================== */}
      {/* Tournament Logo - Top Left with Premium Badge */}
      <div className="absolute top-6 left-6 z-30 animate-slide-in-left">
        <div className="flex items-center gap-5">
          {tournament?.logo_url && (
            <div className="relative">
              <div className="absolute -inset-3 rounded-full opacity-30 blur-xl" style={{ background: '#d4af37' }} />
              <img
                src={tournament.logo_url}
                alt={tournament.name}
                className="relative h-44 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 4px 20px rgba(212,175,55,0.6))' }}
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={18} className="text-amber-400" style={{ filter: 'drop-shadow(0 0 6px #d4af37)' }} />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-widest" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Premium Auction</span>
            </div>
            <p className="text-3xl font-black text-white tracking-tight" style={{ textShadow: '0 4px 15px rgba(0,0,0,0.9)' }}>
              {tournament?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Rotating Logo - Top Right (Broadcaster ↔ App Logo) */}
      <div className="absolute top-6 right-6 z-30 animate-slide-in-right">
        <div className="relative">
          <div className="absolute -inset-3 rounded-full opacity-30 blur-xl transition-colors duration-500" style={{ background: showAppLogo ? '#06b6d4' : '#d4af37' }} />
          <img
            src={showAppLogo ? '/logo.png' : (tournament?.broadcaster_logo_url || '/logo.png')}
            alt={showAppLogo ? 'Game Auction' : (tournament?.broadcaster_name || 'Broadcaster')}
            className="relative h-40 w-auto object-contain transition-opacity duration-500"
            style={{ filter: `drop-shadow(0 4px 20px ${showAppLogo ? 'rgba(6,182,212,0.6)' : 'rgba(212,175,55,0.6)'})` }}
          />
        </div>
      </div>

      {/* ==================== PLAYER CARD (LEFT) ==================== */}
      <div className="absolute left-6 top-56 bottom-6 w-[420px] z-10 animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
        <div
          className="relative h-full rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(15,12,8,0.96) 0%, rgba(20,16,10,0.98) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(212,175,55,0.5)',
            boxShadow: '0 0 50px rgba(212,175,55,0.2), 0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Gold Top Accent - Thicker for premium */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ background: 'linear-gradient(90deg, #b8860b, #ffd700, #d4af37, #ffd700, #b8860b)' }}
          />

          {/* Gold Corner Decorations */}
          <GoldCorner position="top-left" />
          <GoldCorner position="top-right" />
          <GoldCorner position="bottom-left" />
          <GoldCorner position="bottom-right" />

          {/* Shine Effect */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div
              className="absolute inset-0 animate-shine"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(212,175,55,0.08) 45%, rgba(255,215,0,0.15) 50%, rgba(212,175,55,0.08) 55%, transparent 60%)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>

          <div className="relative h-full flex flex-col p-5">
            {/* Player Photo */}
            <div
              className="relative flex-1 min-h-0 rounded-xl overflow-hidden mb-4"
              style={{
                border: '2px solid rgba(212,175,55,0.4)',
                boxShadow: 'inset 0 0 30px rgba(212,175,55,0.1)',
              }}
            >
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(0,0,0,0.3))' }}>
                  <User size={120} className="text-amber-400/30" />
                </div>
              )}

              {/* Vignette Overlay with gold tint */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(15,12,8,0.95) 0%, rgba(15,12,8,0.3) 30%, transparent 50%)' }}
              />

              {/* UID Badge - Diamond shape for premium */}
              {player.player_uid && (
                <div className="absolute top-4 right-4">
                  <div
                    className="w-14 h-14 flex items-center justify-center text-lg font-black text-black"
                    style={{
                      background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                      transform: 'rotate(45deg)',
                      boxShadow: '0 0 25px rgba(212,175,55,0.7)',
                    }}
                  >
                    <span style={{ transform: 'rotate(-45deg)' }}>{player.player_uid}</span>
                  </div>
                </div>
              )}

              {/* Player Info Overlay at Bottom of Photo */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h2
                  className="text-3xl font-black text-white mb-2"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9), 0 0 30px rgba(212,175,55,0.3)' }}
                >
                  {player.name}
                </h2>

                {player.categories && (
                  <div
                    className="inline-block px-4 py-1.5"
                    style={{
                      background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                      boxShadow: '0 4px 15px rgba(212,175,55,0.5)',
                      clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
                    }}
                  >
                    <span className="text-black font-bold text-sm uppercase tracking-wider">
                      {player.categories.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Row with gold styling */}
            <div className="flex gap-3">
              {/* Base Price */}
              <div
                className="flex-1 rounded-xl p-3 text-center"
                style={{
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.25)',
                }}
              >
                <p className="text-amber-400/70 text-xs uppercase tracking-wider mb-1">Base Price</p>
                <p className="text-white font-bold text-xl">₹{player.base_price.toLocaleString('en-IN')}</p>
              </div>

              {/* Current Bid */}
              <div
                className={`flex-1 rounded-xl p-3 text-center transition-all duration-200 ${bidAnimating ? 'scale-105' : ''}`}
                style={{
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(184,134,11,0.1))',
                  border: '2px solid #d4af37',
                  boxShadow: bidAnimating ? '0 0 30px rgba(212,175,55,0.5)' : '0 0 20px rgba(212,175,55,0.2)',
                }}
              >
                <p className="text-amber-400 text-xs uppercase tracking-wider mb-1">Current Bid</p>
                <p
                  className="font-black text-2xl"
                  style={{ color: '#ffd700', textShadow: '0 0 20px rgba(212,175,55,0.6)' }}
                >
                  ₹{currentBid.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== TEAM PANEL (RIGHT) ==================== */}
      <div className="absolute right-6 top-56 bottom-6 w-[400px] z-10 animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
        <div
          className="relative h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(15,12,8,0.96) 0%, rgba(20,16,10,0.98) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(212,175,55,0.5)',
            boxShadow: '0 0 50px rgba(212,175,55,0.2), 0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Gold Top Accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ background: 'linear-gradient(90deg, #b8860b, #ffd700, #d4af37, #ffd700, #b8860b)' }}
          />

          {/* Gold Corner Decorations */}
          <GoldCorner position="top-left" />
          <GoldCorner position="top-right" />
          <GoldCorner position="bottom-left" />
          <GoldCorner position="bottom-right" />

          {currentTeam ? (
            <>
              {/* Team Logo with gold glow */}
              <div className="relative mb-6">
                <div
                  className="absolute -inset-8 rounded-full opacity-50 blur-3xl animate-pulse"
                  style={{ background: '#d4af37' }}
                />
                {currentTeam.logo_url ? (
                  <img
                    src={currentTeam.logo_url}
                    alt={currentTeam.name}
                    className="relative w-56 h-56 object-contain"
                    style={{ filter: 'drop-shadow(0 0 40px rgba(212,175,55,0.6))' }}
                  />
                ) : (
                  <div
                    className="relative w-56 h-56 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                      boxShadow: '0 0 60px rgba(212,175,55,0.6)',
                    }}
                  >
                    <span className="text-5xl font-black text-black">{currentTeam.short_name}</span>
                  </div>
                )}
              </div>

              {/* Gold Divider */}
              <div
                className="w-40 h-0.5 my-3"
                style={{ background: 'linear-gradient(90deg, transparent, #ffd700, #d4af37, #ffd700, transparent)' }}
              />

              {/* Leading Team Badge */}
              <div
                className="px-6 py-2 mb-3"
                style={{
                  background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                  boxShadow: '0 4px 20px rgba(212,175,55,0.5)',
                  clipPath: 'polygon(5% 0, 95% 0, 100% 50%, 95% 100%, 5% 100%, 0% 50%)',
                }}
              >
                <span className="text-black font-black text-sm uppercase tracking-wider">Leading Team</span>
              </div>

              {/* Team Name */}
              <h3
                className="text-2xl font-black text-center text-white mb-1"
                style={{ textShadow: '0 2px 15px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.2)' }}
              >
                {currentTeam.name}
              </h3>
              <p className="text-amber-400/60 text-sm font-semibold mb-4">{currentTeam.short_name}</p>

              {/* Budget Info with gold styling */}
              {currentTeam.remaining_budget !== undefined && (
                <div
                  className="mt-2 text-center px-6 py-3 rounded-xl"
                  style={{
                    background: 'rgba(212,175,55,0.1)',
                    border: '1px solid rgba(212,175,55,0.3)',
                  }}
                >
                  <p className="text-amber-400/70 text-xs uppercase tracking-wider">Remaining Budget</p>
                  <p className="text-amber-400 font-bold text-xl" style={{ textShadow: '0 0 10px rgba(212,175,55,0.4)' }}>
                    ₹{currentTeam.remaining_budget.toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </>
          ) : (
            // Awaiting Bids State with gold styling
            <div className="flex flex-col items-center">
              <div
                className="w-36 h-36 rounded-full mb-6 flex items-center justify-center animate-pulse"
                style={{
                  background: 'rgba(212,175,55,0.08)',
                  border: '3px dashed rgba(212,175,55,0.4)',
                  boxShadow: 'inset 0 0 30px rgba(212,175,55,0.1)',
                }}
              >
                <Zap size={56} className="text-amber-400/50" />
              </div>
              <p className="text-amber-400/60 text-xl font-semibold">Awaiting Bids...</p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== SOLD CELEBRATION ==================== */}
      {slideState === 'sold' && (
        <div className="absolute inset-0 z-50">
          {/* Gold Flash for premium */}
          <div className="absolute inset-0 animate-flash pointer-events-none" style={{ background: 'rgba(212,175,55,0.25)' }} />

          {/* Gold & Green Confetti */}
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti pointer-events-none"
              style={{
                width: `${Math.random() * 12 + 6}px`,
                height: `${Math.random() * 12 + 6}px`,
                left: `${Math.random() * 100}%`,
                top: '-20px',
                background: i % 5 === 0 ? '#ffd700' : i % 5 === 1 ? '#d4af37' : i % 5 === 2 ? '#10B981' : i % 5 === 3 ? '#22c55e' : '#b8860b',
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${Math.random() * 1.5 + 1.5}s`,
              }}
            />
          ))}

          {/* SOLD Card - Centered with gold accents */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-sold-card-in">
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(15,12,8,0.98), rgba(20,16,10,0.95))',
                  boxShadow: '0 0 100px rgba(212,175,55,0.4), 0 0 60px rgba(34,197,94,0.3), 0 30px 60px rgba(0,0,0,0.5)',
                  border: '3px solid #22c55e',
                  width: '540px'
                }}
              >
                {/* Gold corners on sold card */}
                <GoldCorner position="top-left" />
                <GoldCorner position="top-right" />
                <GoldCorner position="bottom-left" />
                <GoldCorner position="bottom-right" />

                {/* Green/Gold header bar */}
                <div
                  className="h-2"
                  style={{ background: 'linear-gradient(90deg, #d4af37, #22c55e, #16a34a, #22c55e, #d4af37)' }}
                />

                {/* Player Photo */}
                <div className="relative h-72 overflow-hidden">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <User size={100} className="text-white/20" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c08] via-transparent to-transparent" />

                  {/* SOLD stamp - Premium Ribbon style with gold accent */}
                  <div className="absolute -top-1 -right-1">
                    {/* Glow effect */}
                    <div
                      className="absolute inset-0 blur-2xl animate-pulse"
                      style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.9) 0%, rgba(212,175,55,0.5) 50%, transparent 70%)', transform: 'scale(1.5)' }}
                    />
                    {/* Gold ribbon fold */}
                    <div
                      className="absolute -bottom-2 right-0 w-6 h-6"
                      style={{
                        background: 'linear-gradient(135deg, #b8860b 0%, transparent 50%)',
                        clipPath: 'polygon(100% 0%, 100% 100%, 0% 0%)',
                      }}
                    />
                    {/* Main ribbon with gold border */}
                    <div
                      className="relative px-8 py-3 overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, #34d399 0%, #22c55e 30%, #16a34a 70%, #15803d 100%)',
                        clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 85% 100%, 0% 100%)',
                        boxShadow: '0 10px 40px rgba(34,197,94,0.7), 0 0 0 2px #d4af37',
                      }}
                    >
                      {/* Inner highlight */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1/2 opacity-30"
                        style={{ background: 'linear-gradient(180deg, white, transparent)' }}
                      />
                      {/* Animated shine */}
                      <div
                        className="absolute inset-0 animate-shine-badge"
                        style={{
                          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
                          backgroundSize: '200% 100%',
                        }}
                      />
                      {/* Text */}
                      <span
                        className="relative text-3xl font-black text-white tracking-wider"
                        style={{
                          textShadow: '0 2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)',
                          letterSpacing: '0.15em'
                        }}
                      >
                        SOLD!
                      </span>
                    </div>
                  </div>

                  {/* Player UID */}
                  {player.player_uid && (
                    <div
                      className="absolute top-4 left-4 px-4 py-2 text-lg font-black text-black"
                      style={{
                        background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                        boxShadow: '0 4px 15px rgba(212,175,55,0.5)',
                        clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
                      }}
                    >
                      #{player.player_uid}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="p-6">
                  <h2 className="text-4xl font-black text-white text-center mb-5"
                      style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.3)' }}>
                    {player.name}
                  </h2>

                  {/* Price & Team */}
                  <div
                    className="flex items-center justify-between p-5 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(212,175,55,0.1))',
                      border: '2px solid rgba(34,197,94,0.5)',
                      boxShadow: 'inset 0 0 20px rgba(212,175,55,0.1)',
                    }}
                  >
                    {/* Team */}
                    <div className="flex items-center gap-4">
                      {currentTeam?.logo_url ? (
                        <img
                          src={currentTeam.logo_url}
                          className="w-16 h-16 object-contain"
                          style={{ filter: 'drop-shadow(0 0 15px rgba(212,175,55,0.5))' }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                             style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                          {currentTeam?.short_name}
                        </div>
                      )}
                      <div>
                        <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Sold To</p>
                        <p className="text-white text-2xl font-bold">{currentTeam?.name}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-amber-400 text-sm font-semibold uppercase tracking-wider">Final Price</p>
                      <p className="text-5xl font-black" style={{ color: '#ffd700', textShadow: '0 0 25px rgba(212,175,55,0.6)' }}>
                        ₹{currentBid.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom gold/green bar */}
                <div
                  className="h-2"
                  style={{ background: 'linear-gradient(90deg, #d4af37, #22c55e, #16a34a, #22c55e, #d4af37)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== UNSOLD EFFECT ==================== */}
      {slideState === 'unsold' && (
        <div className="absolute inset-0 z-50">
          {/* Red Flash */}
          <div className="absolute inset-0 animate-flash pointer-events-none" style={{ background: 'rgba(239,68,68,0.25)' }} />

          {/* UNSOLD Card - Centered with muted gold */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-unsold-shake">
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,15,12,0.98), rgba(35,25,20,0.95))',
                  boxShadow: '0 0 80px rgba(239,68,68,0.4), 0 30px 60px rgba(0,0,0,0.5)',
                  border: '3px solid #ef4444',
                  width: '520px'
                }}
              >
                {/* Red header bar */}
                <div
                  className="h-2"
                  style={{ background: 'linear-gradient(90deg, #7f1d1d, #ef4444, #dc2626, #ef4444, #7f1d1d)' }}
                />

                {/* Player Photo */}
                <div className="relative h-64 overflow-hidden">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-full h-full object-cover object-top grayscale opacity-50"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <User size={100} className="text-white/20" />
                    </div>
                  )}
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#140f0c] via-[#140f0c]/70 to-[#140f0c]/30" />

                  {/* UNSOLD stamp - Premium Ribbon style */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg]">
                    {/* Glow effect */}
                    <div
                      className="absolute inset-0 blur-2xl animate-pulse"
                      style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.9) 0%, rgba(185,28,28,0.5) 50%, transparent 70%)', transform: 'scale(2)' }}
                    />
                    {/* Shadow layer */}
                    <div
                      className="absolute inset-0 blur-md opacity-50"
                      style={{ background: '#7f1d1d', transform: 'translate(4px, 4px)' }}
                    />
                    {/* Main badge */}
                    <div
                      className="relative px-10 py-4 overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, #f87171 0%, #ef4444 20%, #dc2626 50%, #b91c1c 80%, #991b1b 100%)',
                        clipPath: 'polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%)',
                        boxShadow: '0 10px 50px rgba(239,68,68,0.8), inset 0 -2px 10px rgba(0,0,0,0.3)',
                      }}
                    >
                      {/* Inner highlight */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1/3 opacity-40"
                        style={{ background: 'linear-gradient(180deg, white, transparent)' }}
                      />
                      {/* X pattern overlay */}
                      <div
                        className="absolute inset-0 opacity-10"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px)',
                        }}
                      />
                      {/* Animated shine */}
                      <div
                        className="absolute inset-0 animate-shine-badge"
                        style={{
                          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                          backgroundSize: '200% 100%',
                        }}
                      />
                      {/* Text */}
                      <span
                        className="relative text-4xl font-black text-white tracking-wider"
                        style={{
                          textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 4px 15px rgba(0,0,0,0.3)',
                          letterSpacing: '0.2em'
                        }}
                      >
                        UNSOLD
                      </span>
                    </div>
                  </div>

                  {/* Player UID - muted */}
                  {player.player_uid && (
                    <div
                      className="absolute top-4 left-4 px-4 py-2 rounded-lg text-lg font-black text-white/50"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      #{player.player_uid}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="p-6">
                  <h2 className="text-3xl font-black text-white/60 text-center mb-4"
                      style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                    {player.name}
                  </h2>

                  {/* Base Price Info */}
                  <div
                    className="flex items-center justify-center p-4 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}
                  >
                    <div className="text-center">
                      <p className="text-red-400/80 text-sm font-semibold uppercase tracking-wider mb-1">Base Price</p>
                      <p className="text-3xl font-black text-white/60">
                        ₹{player.base_price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom red bar */}
                <div
                  className="h-2"
                  style={{ background: 'linear-gradient(90deg, #7f1d1d, #ef4444, #dc2626, #ef4444, #7f1d1d)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STYLES ==================== */}
      <style>{`
        .overlay-bg { background: transparent !important; }

        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          25% { transform: translateY(-50px) translateX(20px); opacity: 0.8; }
          50% { transform: translateY(-100px) translateX(-15px); opacity: 0.5; }
          75% { transform: translateY(-50px) translateX(25px); opacity: 0.7; }
        }
        .animate-float-particle { animation: float-particle ease-in-out infinite; }

        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-80px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-left { animation: slide-in-left 0.8s ease-out both; }

        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(80px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.8s ease-out both; }

        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shine { animation: shine 4s ease-in-out infinite; }

        @keyframes flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flash { animation: flash 0.8s ease-out forwards; }

        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation: confetti 2.5s ease-in forwards; }

        @keyframes sold-card-in {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.05) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-sold-card-in { animation: sold-card-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

        @keyframes unsold-shake {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05) rotate(2deg); }
          60% { transform: scale(1) rotate(-2deg); }
          70% { transform: scale(1.02) rotate(1deg); }
          80% { transform: scale(1) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-unsold-shake { animation: unsold-shake 0.6s ease-out forwards; }

        @keyframes shine-badge {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shine-badge { animation: shine-badge 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
