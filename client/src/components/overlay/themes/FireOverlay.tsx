import { useState, useEffect } from 'react';
import { Player, Team } from '../../../types';
import { User, Flame } from 'lucide-react';

interface FireOverlayProps {
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

// Rising ember particles from bottom
const EmberParticles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    {[...Array(35)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full animate-ember-rise"
        style={{
          width: `${Math.random() * 5 + 2}px`,
          height: `${Math.random() * 5 + 2}px`,
          left: `${Math.random() * 100}%`,
          bottom: '120px',
          background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f97316' : '#ef4444',
          boxShadow: `0 0 ${10 + Math.random() * 10}px ${i % 2 === 0 ? '#f97316' : '#ef4444'}`,
          opacity: 0.7 + Math.random() * 0.3,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${Math.random() * 3 + 3}s`,
        }}
      />
    ))}
  </div>
);

export default function FireOverlay({
  player,
  currentBid,
  currentTeam,
  status,
  tournament,
  slideState,
  bidAnimating,
  showParticles = true,
}: FireOverlayProps) {
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
      {/* Rising ember particles */}
      {showParticles && <EmberParticles />}

      {/* Heat glow from bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(to top, rgba(249,115,22,0.15), transparent)',
        }}
      />

      {/* ==================== TOP LOGOS ==================== */}
      {/* Tournament Logo - Top Left */}
      {tournament?.logo_url && (
        <div className="absolute top-6 left-6 z-30 animate-fade-in">
          <img
            src={tournament.logo_url}
            alt={tournament.name}
            className="h-44 w-auto object-contain"
            style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.7))' }}
          />
        </div>
      )}

      {/* Rotating Logo - Top Right (Broadcaster ↔ App Logo) */}
      <div className="absolute top-6 right-6 z-30 animate-fade-in">
        <img
          src={showAppLogo ? '/logo.png' : (tournament?.broadcaster_logo_url || '/logo.png')}
          alt={showAppLogo ? 'Game Auction' : (tournament?.broadcaster_name || 'Broadcaster')}
          className="h-40 w-auto object-contain transition-opacity duration-500"
          style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.7))' }}
        />
      </div>

      {/* ==================== PLAYER CARD (Center-Left) ==================== */}
      <div className="absolute left-12 top-1/2 -translate-y-1/2 w-[380px] z-10 animate-slide-up">
        {/* Dissolving border - top and sides only, fades at bottom */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `
              linear-gradient(to bottom, rgba(249,115,22,0.7) 0%, rgba(249,115,22,0.4) 40%, transparent 85%) padding-box,
              linear-gradient(to bottom, #f97316 0%, rgba(220,38,38,0.5) 50%, transparent 90%) border-box
            `,
            border: '2px solid transparent',
            borderRadius: '1rem',
          }}
        />
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'transparent',
          }}
        >

          {/* Player Photo */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt={player.name}
                className="w-full h-full object-cover object-top"
                style={{
                  mask: 'linear-gradient(to bottom, white 0%, white 75%, transparent 100%)',
                  WebkitMask: 'linear-gradient(to bottom, white 0%, white 75%, transparent 100%)',
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
                <User size={100} className="text-orange-400/30" />
              </div>
            )}

            {/* Fire gradient overlay - for text readability */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 30%, transparent 60%)' }}
            />

            {/* UID Badge - Top right circular */}
            {player.player_uid && (
              <div
                className="absolute top-4 right-4 w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white animate-pulse"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #dc2626)',
                  boxShadow: '0 0 30px rgba(249,115,22,0.8)',
                }}
              >
                {player.player_uid}
              </div>
            )}

            {/* Player Name at bottom of photo */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2
                className="text-3xl font-black text-white leading-tight"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(249,115,22,0.5)' }}
              >
                {player.name}
              </h2>
              {player.categories && (
                <span
                  className="inline-block mt-2 px-3 py-1 text-sm font-bold text-white rounded"
                  style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}
                >
                  {player.categories.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== BOTTOM BAR ==================== */}
      <div className="absolute bottom-0 left-0 right-0 z-20 animate-slide-up-bar">
        {/* Top fade gradient - dissolving into background */}
        <div
          className="h-16"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(20,10,5,0.3) 40%, rgba(20,10,5,0.7) 70%, rgba(20,10,5,0.95) 100%)',
          }}
        />
        {/* Main bottom bar content - transparent edges */}
        <div
          className="flex items-center"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(20,10,5,0.95) 5%, rgba(20,10,5,0.98) 50%, rgba(20,10,5,0.95) 95%, transparent 100%)',
          }}
        >
          {/* Team Section - Left */}
          <div className="flex items-center gap-5 px-8 py-6 min-w-[320px]">
            {currentTeam ? (
              <>
                <div className="relative">
                  <div
                    className="absolute -inset-2 rounded-full opacity-50 blur-lg animate-pulse"
                    style={{ background: '#f97316' }}
                  />
                  {currentTeam.logo_url ? (
                    <img
                      src={currentTeam.logo_url}
                      className="relative w-20 h-20 object-contain"
                      style={{ filter: 'drop-shadow(0 0 20px rgba(249,115,22,0.6))' }}
                    />
                  ) : (
                    <div
                      className="relative w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white"
                      style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}
                    >
                      {currentTeam.short_name}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Leading Team</p>
                  <p className="text-white text-2xl font-black" style={{ textShadow: '0 0 20px rgba(249,115,22,0.3)' }}>
                    {currentTeam.name}
                  </p>
                  {currentTeam.remaining_budget !== undefined && (
                    <p className="text-orange-400/70 text-sm mt-1">
                      Budget: ₹{currentTeam.remaining_budget.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
                  style={{ background: 'rgba(249,115,22,0.2)', border: '2px dashed rgba(249,115,22,0.5)' }}
                >
                  <Flame size={28} className="text-orange-400/50" />
                </div>
                <p className="text-orange-400/60 text-lg">Awaiting bids...</p>
              </div>
            )}
          </div>

          {/* Base Price */}
          <div className="px-6 py-4 text-center">
            <p className="text-orange-400/70 text-xs uppercase tracking-wider mb-1">Base Price</p>
            <p className="text-white text-2xl font-bold">₹{player.base_price.toLocaleString('en-IN')}</p>
          </div>

          {/* Current Bid - Center/Main */}
          <div
            className={`flex-1 flex items-center justify-center py-5 transition-all duration-300 ${bidAnimating ? 'scale-105' : ''}`}
          >
            <div className="text-center">
              <p className="text-orange-400 text-sm uppercase tracking-widest mb-2">Current Bid</p>
              <div className="relative">
                <span
                  className="text-6xl font-black"
                  style={{
                    background: 'linear-gradient(180deg, #fbbf24, #f97316, #dc2626)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: bidAnimating ? 'drop-shadow(0 0 30px rgba(249,115,22,0.8))' : 'drop-shadow(0 0 15px rgba(249,115,22,0.5))',
                  }}
                >
                  ₹{currentBid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Status Indicator - Right */}
          <div className="px-8 py-4">
            <div
              className="flex items-center gap-3 px-6 py-3 rounded-xl"
              style={{
                background: slideState === 'sold' ? 'linear-gradient(135deg, #f97316, #dc2626)' :
                           slideState === 'unsold' ? 'linear-gradient(135deg, #7f1d1d, #450a0a)' :
                           'rgba(249,115,22,0.2)',
                border: `2px solid ${slideState === 'sold' || slideState === 'unsold' ? 'transparent' : 'rgba(249,115,22,0.5)'}`,
                boxShadow: slideState === 'sold' ? '0 0 30px rgba(249,115,22,0.6)' : 'none',
              }}
            >
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-orange-400 animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-orange-400 animate-ping opacity-50" />
              </div>
              <span className="text-white font-black text-lg uppercase tracking-wider">
                {slideState === 'sold' ? 'SOLD!' : slideState === 'unsold' ? 'UNSOLD' : 'LIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== SOLD CELEBRATION ==================== */}
      {slideState === 'sold' && (
        <div className="absolute inset-0 z-50">
          {/* Fire Flash */}
          <div className="absolute inset-0 animate-flash pointer-events-none" style={{ background: 'rgba(249,115,22,0.35)' }} />

          {/* Fire Confetti */}
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti pointer-events-none"
              style={{
                width: `${Math.random() * 14 + 6}px`,
                height: `${Math.random() * 14 + 6}px`,
                left: `${Math.random() * 100}%`,
                top: '-20px',
                background: i % 4 === 0 ? '#fbbf24' : i % 4 === 1 ? '#f97316' : i % 4 === 2 ? '#ef4444' : '#dc2626',
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${Math.random() * 1.5 + 1.5}s`,
              }}
            />
          ))}

          {/* SOLD Card */}
          <div className="absolute inset-0 flex items-center justify-center pb-32">
            <div className="animate-sold-card-in">
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(25,12,8,0.98), rgba(15,8,5,0.95))',
                  boxShadow: '0 0 100px rgba(249,115,22,0.6), 0 0 50px rgba(34,197,94,0.3), 0 30px 60px rgba(0,0,0,0.5)',
                  border: '4px solid #22c55e',
                  width: '520px'
                }}
              >
                {/* Green/Fire header bar */}
                <div
                  className="h-3"
                  style={{ background: 'linear-gradient(90deg, #f97316, #22c55e, #16a34a, #22c55e, #f97316)' }}
                />

                {/* Player Photo */}
                <div className="relative h-64 overflow-hidden">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#190c08] via-transparent to-transparent" />

                  {/* SOLD stamp - Ribbon style */}
                  <div className="absolute -top-1 -right-1">
                    {/* Glow effect */}
                    <div
                      className="absolute inset-0 blur-2xl animate-pulse"
                      style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.9) 0%, rgba(16,185,129,0.5) 50%, transparent 70%)', transform: 'scale(1.5)' }}
                    />
                    {/* Ribbon fold shadow */}
                    <div
                      className="absolute -bottom-2 right-0 w-6 h-6"
                      style={{
                        background: 'linear-gradient(135deg, #0f5132 0%, transparent 50%)',
                        clipPath: 'polygon(100% 0%, 100% 100%, 0% 0%)',
                      }}
                    />
                    {/* Main ribbon */}
                    <div
                      className="relative px-8 py-3 overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, #34d399 0%, #22c55e 30%, #16a34a 70%, #15803d 100%)',
                        clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 85% 100%, 0% 100%)',
                        boxShadow: '0 10px 40px rgba(34,197,94,0.7)',
                      }}
                    >
                      {/* Inner highlight */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1/2 opacity-30"
                        style={{ background: 'linear-gradient(180deg, white, transparent)' }}
                      />
                      {/* Animated shine */}
                      <div
                        className="absolute inset-0 animate-shine-sold"
                        style={{
                          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
                          backgroundSize: '200% 100%',
                        }}
                      />
                      {/* Text with shadow */}
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

                  {player.player_uid && (
                    <div
                      className="absolute top-4 left-4 w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #dc2626)',
                        boxShadow: '0 4px 15px rgba(249,115,22,0.5)',
                      }}
                    >
                      {player.player_uid}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="p-6">
                  <h2 className="text-3xl font-black text-white text-center mb-5"
                      style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                    {player.name}
                  </h2>

                  <div
                    className="flex items-center justify-between p-5 rounded-xl"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}
                  >
                    <div className="flex items-center gap-4">
                      {currentTeam?.logo_url ? (
                        <img src={currentTeam.logo_url} className="w-14 h-14 object-contain" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                          {currentTeam?.short_name}
                        </div>
                      )}
                      <div>
                        <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Sold To</p>
                        <p className="text-white text-xl font-bold">{currentTeam?.name}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Final Price</p>
                      <p className="text-4xl font-black" style={{ color: '#fbbf24', textShadow: '0 0 20px rgba(249,115,22,0.5)' }}>
                        ₹{currentBid.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="h-3"
                  style={{ background: 'linear-gradient(90deg, #f97316, #22c55e, #16a34a, #22c55e, #f97316)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== UNSOLD EFFECT ==================== */}
      {slideState === 'unsold' && (
        <div className="absolute inset-0 z-50">
          <div className="absolute inset-0 animate-flash pointer-events-none" style={{ background: 'rgba(127,29,29,0.35)' }} />

          <div className="absolute inset-0 flex items-center justify-center pb-32">
            <div className="animate-unsold-shake">
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(30,15,12,0.98), rgba(20,10,8,0.95))',
                  boxShadow: '0 0 80px rgba(127,29,29,0.6), 0 30px 60px rgba(0,0,0,0.5)',
                  border: '4px solid #dc2626',
                  width: '480px'
                }}
              >
                <div
                  className="h-3"
                  style={{ background: 'linear-gradient(90deg, #450a0a, #7f1d1d, #dc2626, #7f1d1d, #450a0a)' }}
                />

                <div className="relative h-56 overflow-hidden">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-full h-full object-cover object-top grayscale opacity-50"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <User size={80} className="text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e0f0c] via-[#1e0f0c]/70 to-[#1e0f0c]/30" />

                  {/* UNSOLD stamp - Ribbon style */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg]">
                    {/* Glow effect */}
                    <div
                      className="absolute inset-0 blur-2xl animate-pulse"
                      style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.9) 0%, rgba(185,28,28,0.5) 50%, transparent 70%)', transform: 'scale(2)' }}
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
                        boxShadow: '0 10px 50px rgba(220,38,38,0.8), inset 0 -2px 10px rgba(0,0,0,0.3)',
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
                        className="absolute inset-0 animate-shine-unsold"
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
                </div>

                <div className="p-5">
                  <h2 className="text-2xl font-black text-white/60 text-center mb-3">
                    {player.name}
                  </h2>

                  <div
                    className="flex items-center justify-center p-3 rounded-xl"
                    style={{ background: 'rgba(220,38,38,0.1)', border: '2px solid rgba(220,38,38,0.3)' }}
                  >
                    <div className="text-center">
                      <p className="text-red-400/80 text-xs font-semibold uppercase tracking-wider mb-1">Base Price</p>
                      <p className="text-2xl font-black text-white/60">
                        ₹{player.base_price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="h-3"
                  style={{ background: 'linear-gradient(90deg, #450a0a, #7f1d1d, #dc2626, #7f1d1d, #450a0a)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STYLES ==================== */}
      <style>{`
        .overlay-bg { background: transparent !important; }

        @keyframes ember-rise {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.9; }
          50% { transform: translateY(-45vh) translateX(15px) scale(0.6); opacity: 0.5; }
          100% { transform: translateY(-90vh) translateX(-10px) scale(0.2); opacity: 0; }
        }
        .animate-ember-rise { animation: ember-rise linear infinite; }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px) translateX(-50%); }
          to { opacity: 1; transform: translateY(-50%) translateX(-50%); }
        }
        .animate-slide-up {
          animation: slide-up 0.7s ease-out;
          transform: translateY(-50%);
        }

        @keyframes slide-up-bar {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up-bar { animation: slide-up-bar 0.6s ease-out; }

        @keyframes fire-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        .animate-fire-glow { animation: fire-glow 2s ease-in-out infinite; }

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

        @keyframes shine-sold {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shine-sold { animation: shine-sold 2s ease-in-out infinite; }

        @keyframes shine-unsold {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shine-unsold { animation: shine-unsold 2.5s ease-in-out infinite; }

        @keyframes unsold-shake {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05) rotate(2deg); }
          60% { transform: scale(1) rotate(-2deg); }
          70% { transform: scale(1.02) rotate(1deg); }
          80% { transform: scale(1) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-unsold-shake { animation: unsold-shake 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
}
