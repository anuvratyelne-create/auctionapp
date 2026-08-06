import { useState, useEffect } from 'react';
import { Player, Team, Tournament } from '../../../types';
import { User, Zap } from 'lucide-react';

interface PremiumStandardOverlayProps {
  player: Player;
  currentBid: number;
  currentTeam: Team | null;
  status: string;
  tournament: Tournament | null;
  slideState: 'entering' | 'active' | 'sold' | 'unsold';
  bidAnimating: boolean;
  showParticles?: boolean;
  accentColor?: string;
}

// Floating Gold Particles
const GoldParticles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full animate-float-particle"
        style={{
          width: `${Math.random() * 4 + 2}px`,
          height: `${Math.random() * 4 + 2}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: '#F5A623',
          boxShadow: '0 0 10px #F5A623',
          opacity: 0.6,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 10 + 10}s`,
        }}
      />
    ))}
  </div>
);

export default function PremiumStandardOverlay({
  player,
  currentBid,
  currentTeam,
  status: _status,
  tournament,
  slideState,
  bidAnimating,
  showParticles = true,
}: PremiumStandardOverlayProps) {
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

  return (
    <div className="overlay-bg min-h-screen relative overflow-hidden">
      {/* Floating Particles */}
      {showParticles && <GoldParticles />}

      {/* ==================== FLOATING LOGOS ==================== */}
      {/* Tournament Logo - Top Left */}
      {tournament?.logo_url && (
        <div className="absolute top-6 left-6 z-30">
          <img
            src={tournament.logo_url}
            alt={tournament.name}
            className="h-56 w-auto object-contain"
            style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.7))' }}
          />
        </div>
      )}

      {/* Rotating Logo - Top Right (Broadcaster ↔ App Logo) */}
      <div className="absolute top-6 right-6 z-30">
        <img
          src={showAppLogo ? '/logo.png' : (tournament?.broadcaster_logo_url || '/logo.png')}
          alt={showAppLogo ? 'Game Auction' : (tournament?.broadcaster_name || 'Broadcaster')}
          className="h-48 w-auto object-contain transition-opacity duration-500"
          style={{ filter: `drop-shadow(0 4px 15px ${showAppLogo ? 'rgba(6,182,212,0.5)' : 'rgba(0,0,0,0.7)'})` }}
        />
      </div>

      {/* ==================== PLAYER CARD (LEFT) ==================== */}
      <div className="absolute left-6 top-64 bottom-6 w-[400px] z-10 animate-slide-in-left">
        <div
          className="relative h-full rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(10,15,25,0.95) 0%, rgba(15,20,35,0.98) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(245,166,35,0.4)',
            boxShadow: '0 0 40px rgba(245,166,35,0.15), 0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Gold Top Accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(90deg, transparent, #F5A623, #D4AF37, #F5A623, transparent)' }}
          />

          {/* Shine Effect */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div
              className="absolute inset-0 animate-shine"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 60%)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>

          <div className="relative h-full flex flex-col p-5">
            {/* Player Photo */}
            <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden mb-4">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800/50">
                  <User size={120} className="text-slate-600" />
                </div>
              )}

              {/* Vignette Overlay */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(10,15,25,0.9) 0%, transparent 40%)' }}
              />

              {/* UID Badge */}
              {player.player_uid && (
                <div className="absolute top-4 left-4">
                  <div
                    className="px-4 py-2 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, #F5A623, #D4AF37)',
                      boxShadow: '0 4px 15px rgba(245,166,35,0.5)',
                    }}
                  >
                    <span className="text-black font-black text-lg">#{player.player_uid}</span>
                  </div>
                </div>
              )}

              {/* Player Info Overlay at Bottom of Photo */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h2
                  className="text-3xl font-black text-white mb-2"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}
                >
                  {player.name}
                </h2>

                {player.categories && (
                  <div
                    className="inline-block px-4 py-1.5 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #F5A623, #D4AF37)',
                      boxShadow: '0 4px 15px rgba(245,166,35,0.4)',
                    }}
                  >
                    <span className="text-black font-bold text-sm uppercase tracking-wider">
                      {player.categories.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-3">
              {/* Base Price */}
              <div
                className="flex-1 rounded-xl p-3 text-center"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Base Price</p>
                <p className="text-white font-bold text-xl">₹{player.base_price.toLocaleString('en-IN')}</p>
              </div>

              {/* Current Bid */}
              <div
                className={`flex-1 rounded-xl p-3 text-center transition-transform duration-200 ${bidAnimating ? 'scale-105' : ''}`}
                style={{
                  background: 'linear-gradient(135deg, rgba(245,166,35,0.2), rgba(212,175,55,0.1))',
                  border: '2px solid #F5A623',
                  boxShadow: '0 0 20px rgba(245,166,35,0.2)',
                }}
              >
                <p className="text-amber-400 text-xs uppercase tracking-wider mb-1">Current Bid</p>
                <p
                  className="font-black text-2xl"
                  style={{ color: '#F5A623', textShadow: '0 0 20px rgba(245,166,35,0.5)' }}
                >
                  ₹{currentBid.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== TEAM PANEL (RIGHT) ==================== */}
      <div className="absolute right-6 top-64 bottom-6 w-[420px] z-10 animate-slide-in-right">
        <div
          className="relative h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(10,15,25,0.95) 0%, rgba(15,20,35,0.98) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(245,166,35,0.4)',
            boxShadow: '0 0 40px rgba(245,166,35,0.15), 0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Gold Top Accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(90deg, transparent, #F5A623, #D4AF37, #F5A623, transparent)' }}
          />

          {currentTeam ? (
            <>
              {/* Team Logo */}
              <div className="relative mb-8">
                <div
                  className="absolute -inset-10 rounded-full opacity-40 blur-3xl animate-pulse"
                  style={{ background: '#F5A623' }}
                />
                {currentTeam.logo_url ? (
                  <img
                    src={currentTeam.logo_url}
                    alt={currentTeam.name}
                    className="relative w-64 h-64 object-contain"
                    style={{ filter: 'drop-shadow(0 0 40px rgba(245,166,35,0.5))' }}
                  />
                ) : (
                  <div
                    className="relative w-64 h-64 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #F5A623, #D4AF37)',
                      boxShadow: '0 0 50px rgba(245,166,35,0.5)',
                    }}
                  >
                    <span className="text-6xl font-black text-black">{currentTeam.short_name}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div
                className="w-48 h-0.5 my-4"
                style={{ background: 'linear-gradient(90deg, transparent, #F5A623, transparent)' }}
              />

              {/* Leading Team Badge */}
              <div
                className="px-6 py-2 rounded-full mb-4"
                style={{
                  background: 'linear-gradient(135deg, #F5A623, #D4AF37)',
                  boxShadow: '0 4px 20px rgba(245,166,35,0.4)',
                }}
              >
                <span className="text-black font-black text-sm uppercase tracking-wider">Leading Team</span>
              </div>

              {/* Team Name */}
              <h3
                className="text-2xl font-black text-center text-white"
                style={{ textShadow: '0 2px 15px rgba(0,0,0,0.5)' }}
              >
                {currentTeam.name}
              </h3>

              {/* Budget Info */}
              {currentTeam.remaining_budget !== undefined && (
                <div className="mt-4 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Remaining Budget</p>
                  <p className="text-amber-400 font-bold text-lg">
                    ₹{currentTeam.remaining_budget.toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </>
          ) : (
            // Awaiting Bids State
            <div className="flex flex-col items-center">
              <div
                className="w-32 h-32 rounded-full mb-6 flex items-center justify-center animate-pulse"
                style={{
                  background: 'rgba(245,166,35,0.1)',
                  border: '3px dashed rgba(245,166,35,0.4)',
                }}
              >
                <Zap size={48} className="text-amber-500/50" />
              </div>
              <p className="text-slate-400 text-xl">Awaiting Bids...</p>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER REMOVED */}

      {/* ==================== SOLD CELEBRATION ==================== */}
      {slideState === 'sold' && (
        <div className="absolute inset-0 z-50">
          {/* Green Flash */}
          <div className="absolute inset-0 animate-flash pointer-events-none" style={{ background: 'rgba(16,185,129,0.3)' }} />

          {/* Confetti */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti pointer-events-none"
              style={{
                width: `${Math.random() * 12 + 6}px`,
                height: `${Math.random() * 12 + 6}px`,
                left: `${Math.random() * 100}%`,
                top: '-20px',
                background: i % 4 === 0 ? '#F5A623' : i % 4 === 1 ? '#10B981' : i % 4 === 2 ? '#D4AF37' : '#22c55e',
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${Math.random() * 1.5 + 1.5}s`,
              }}
            />
          ))}

          {/* SOLD Card - Centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-sold-card-in">
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(10,20,30,0.98), rgba(20,35,50,0.95))',
                  boxShadow: '0 0 120px rgba(34,197,94,0.5), 0 30px 60px rgba(0,0,0,0.5)',
                  border: '4px solid #22c55e',
                  width: '520px'
                }}
              >
                {/* Green header bar */}
                <div
                  className="h-3"
                  style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a, #22c55e)' }}
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a141e] via-transparent to-transparent" />

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
                      className="absolute top-4 left-4 px-4 py-2 rounded-lg text-lg font-black text-black"
                      style={{
                        background: 'linear-gradient(135deg, #F5A623, #D4AF37)',
                        boxShadow: '0 4px 15px rgba(245,166,35,0.5)',
                      }}
                    >
                      #{player.player_uid}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="p-6">
                  <h2 className="text-4xl font-black text-white text-center mb-5"
                      style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                    {player.name}
                  </h2>

                  {/* Price & Team */}
                  <div
                    className="flex items-center justify-between p-5 rounded-xl"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}
                  >
                    {/* Team */}
                    <div className="flex items-center gap-4">
                      {currentTeam?.logo_url ? (
                        <img
                          src={currentTeam.logo_url}
                          className="w-16 h-16 object-contain"
                          style={{ filter: 'drop-shadow(0 0 10px rgba(34,197,94,0.5))' }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xl">
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
                      <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Final Price</p>
                      <p className="text-5xl font-black text-white" style={{ textShadow: '0 0 20px rgba(34,197,94,0.5)' }}>
                        ₹{currentBid.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom green bar */}
                <div
                  className="h-3"
                  style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a, #22c55e)' }}
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

          {/* UNSOLD Banner - Centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-unsold-shake">
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,15,15,0.98), rgba(40,25,25,0.95))',
                  boxShadow: '0 0 100px rgba(239,68,68,0.5), 0 30px 60px rgba(0,0,0,0.5)',
                  border: '4px solid #ef4444',
                  width: '520px'
                }}
              >
                {/* Red header bar */}
                <div
                  className="h-3"
                  style={{ background: 'linear-gradient(90deg, #ef4444, #dc2626, #ef4444)' }}
                />

                {/* Player Photo */}
                <div className="relative h-64 overflow-hidden">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-full h-full object-cover object-top grayscale opacity-60"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <User size={100} className="text-white/20" />
                    </div>
                  )}
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#140f0f] via-[#140f0f]/60 to-transparent" />

                  {/* UNSOLD stamp - Ribbon style */}
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

                  {/* Player UID */}
                  {player.player_uid && (
                    <div
                      className="absolute top-4 left-4 px-4 py-2 rounded-lg text-lg font-black text-white opacity-60"
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      #{player.player_uid}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="p-6">
                  <h2 className="text-3xl font-black text-white/70 text-center mb-4"
                      style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                    {player.name}
                  </h2>

                  {/* Base Price Info */}
                  <div
                    className="flex items-center justify-center p-4 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.3)' }}
                  >
                    <div className="text-center">
                      <p className="text-red-400 text-sm font-semibold uppercase tracking-wider mb-1">Base Price</p>
                      <p className="text-3xl font-black text-white/70">
                        ₹{player.base_price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom red bar */}
                <div
                  className="h-3"
                  style={{ background: 'linear-gradient(90deg, #ef4444, #dc2626, #ef4444)' }}
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
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-40px) translateX(15px); opacity: 0.7; }
          50% { transform: translateY(-80px) translateX(-10px); opacity: 0.5; }
          75% { transform: translateY(-40px) translateX(20px); opacity: 0.6; }
        }
        .animate-float-particle { animation: float-particle 15s ease-in-out infinite; }

        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-left { animation: slide-in-left 0.7s ease-out; }

        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.7s ease-out 0.15s both; }

        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-shine { animation: shine 3s ease-in-out infinite; }

        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 30px rgba(245,166,35,0.3), inset 0 0 20px rgba(245,166,35,0.1); }
          50% { box-shadow: 0 0 40px rgba(245,166,35,0.5), inset 0 0 30px rgba(245,166,35,0.2); }
        }
        .animate-pulse-border { animation: pulse-border 2s ease-in-out infinite; }

        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.5s ease-out; }

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
