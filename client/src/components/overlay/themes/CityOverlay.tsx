import { useEffect, useState } from 'react';
import { Player, Team } from '../../../types';
import { User } from 'lucide-react';
import { api } from '../../../utils/api';

interface CityOverlayProps {
  player: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  status: 'idle' | 'bidding' | 'sold' | 'unsold';
  tournament?: {
    id?: string;
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

export default function CityOverlay({
  player,
  currentBid,
  currentTeam,
  status,
  tournament,
  slideState,
  bidAnimating,
}: CityOverlayProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [showAppLogo, setShowAppLogo] = useState(!tournament?.broadcaster_logo_url);

  // Load teams for the scoreboard
  useEffect(() => {
    if (tournament?.id) {
      loadTeams();
    }
  }, [tournament?.id]);

  // Rotating logo effect
  useEffect(() => {
    if (!tournament?.broadcaster_logo_url) {
      setShowAppLogo(true);
      return;
    }
    const interval = setInterval(() => setShowAppLogo((prev) => !prev), 5000);
    return () => clearInterval(interval);
  }, [tournament?.broadcaster_logo_url]);

  const loadTeams = async () => {
    try {
      if (tournament?.id) {
        const teamsData = await api.getTeamsPublic(tournament.id) as Team[];
        setTeams(teamsData);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  };

  // Accent color
  const accentColor = '#06b6d4'; // Cyan

  return (
    <div className="overlay-bg min-h-screen relative overflow-hidden" style={{ fontFamily: "'Rajdhani', 'Orbitron', sans-serif" }}>

      {/* TOP RIGHT - ROTATING LOGO */}
      <div className="absolute top-6 right-6 z-20">
        <img
          src={showAppLogo ? '/logo.png' : (tournament?.broadcaster_logo_url || '/logo.png')}
          alt={showAppLogo ? 'Game Auction' : (tournament?.broadcaster_name || 'Broadcaster')}
          className="h-44 w-auto object-contain transition-opacity duration-500"
          style={{ filter: 'drop-shadow(0 0 15px rgba(6,182,212,0.6))' }}
        />
      </div>

      {/* TOP CENTER - TOURNAMENT LOGO */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
        {tournament?.logo_url ? (
          <img
            src={tournament.logo_url}
            alt={tournament.name}
            className="h-52 w-auto object-contain drop-shadow-lg"
            style={{ filter: 'drop-shadow(0 0 20px rgba(6,182,212,0.7))' }}
          />
        ) : (
          <div
            className="px-10 py-4 text-3xl font-bold text-white tracking-widest"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)`,
              borderTop: `3px solid ${accentColor}`,
              borderBottom: `3px solid ${accentColor}`,
            }}
          >
            {tournament?.name || 'PLAYER AUCTION'}
          </div>
        )}
      </div>

      {/* BOTTOM CENTER - HEXAGON PLAYER FRAME */}
      {player && status !== 'idle' && (
        <div className={`absolute bottom-36 left-1/2 -translate-x-1/2 z-10 transition-all duration-500 ${
          slideState === 'entering' ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}>
          {/* Outer glow */}
          <div
            className="absolute -inset-4"
            style={{
              background: `conic-gradient(from 0deg, ${accentColor}, #a855f7, #ec4899, #a855f7, ${accentColor})`,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              filter: 'blur(20px)',
              opacity: 0.5,
            }}
          />

          {/* Hexagon frame - smaller to match team box */}
          <div
            className="relative"
            style={{
              width: '220px',
              height: '250px',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          >
            {/* Border */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, ${accentColor}, #a855f7)`,
              }}
            />

            {/* Inner content */}
            <div
              className="absolute inset-1"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                background: '#0a0a1a',
              }}
            >
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={80} className="text-cyan-400/30" />
                </div>
              )}
            </div>
          </div>

          {/* Player Name below hexagon */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center w-80">
            <h2
              className="text-2xl font-black text-white tracking-wide uppercase"
              style={{ textShadow: `0 0 20px ${accentColor}` }}
            >
              {player.name}
            </h2>
            {player.categories && (
              <span
                className="inline-block mt-2 px-4 py-1 text-sm font-bold text-white tracking-wider"
                style={{
                  background: `linear-gradient(90deg, #a855f7, #ec4899)`,
                }}
              >
                {player.categories.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM LEFT - BASE VALUE / CURRENT BID BAR */}
      {player && status !== 'idle' && (
        <div className="absolute bottom-10 left-10 z-20">
          <div
            className="relative"
            style={{ width: '400px' }}
          >
            {/* Top accent line */}
            <div
              className="h-1.5 mb-1"
              style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
            />

            {/* Main bar */}
            <div
              className="px-6 py-4"
              style={{
                background: 'linear-gradient(90deg, rgba(6,182,212,0.95), rgba(6,182,212,0.8), rgba(6,182,212,0.4))',
                borderLeft: `5px solid ${accentColor}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-white/90 tracking-widest uppercase">
                  {status === 'sold' ? 'SOLD FOR' : status === 'bidding' ? 'CURRENT BID' : 'BASE VALUE'}
                </span>
                <span
                  className={`text-4xl font-black text-white transition-transform ${bidAnimating ? 'scale-110' : ''}`}
                >
                  {(status as string) === 'idle' ? player.base_price.toLocaleString('en-IN') : currentBid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Bottom accent line */}
            <div
              className="h-1.5 mt-1"
              style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
            />
          </div>

          {/* Current Team (if bidding) */}
          {currentTeam && (
            <div className="mt-5 flex items-center gap-4 px-2">
              {currentTeam.logo_url ? (
                <img src={currentTeam.logo_url} className="w-14 h-14 object-contain" />
              ) : (
                <div
                  className="w-14 h-14 rounded flex items-center justify-center text-lg font-bold text-white"
                  style={{ background: accentColor }}
                >
                  {currentTeam.short_name}
                </div>
              )}
              <div>
                <p className="text-sm text-cyan-400 uppercase tracking-wider font-medium">
                  {status === 'sold' ? 'Sold To' : 'Leading'}
                </p>
                <p className="text-2xl font-bold text-white">{currentTeam.name}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM RIGHT - TEAMS SCOREBOARD */}
      <div className="absolute bottom-10 right-10 z-20">
        <div
          style={{
            width: '420px',
            background: 'rgba(10,10,30,0.95)',
            border: `3px solid ${accentColor}`,
            borderRadius: '6px',
          }}
        >
          {/* Header */}
          <div
            className="grid grid-cols-12 gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider"
            style={{
              background: `linear-gradient(90deg, ${accentColor}40, transparent)`,
              borderBottom: `2px solid ${accentColor}60`,
            }}
          >
            <div className="col-span-6 text-cyan-400">Team</div>
            <div className="col-span-2 text-center text-cyan-400">PL</div>
            <div className="col-span-4 text-right text-cyan-400">Points</div>
          </div>

          {/* Teams list */}
          <div className="max-h-64 overflow-y-auto">
            {teams.length > 0 ? (
              teams.map((team, index) => (
                <div
                  key={team.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                    currentTeam?.id === team.id ? 'bg-cyan-500/25' : ''
                  }`}
                  style={{
                    borderBottom: index < teams.length - 1 ? `1px solid ${accentColor}30` : 'none',
                  }}
                >
                  <div className="col-span-6 flex items-center gap-3">
                    {team.logo_url ? (
                      <img src={team.logo_url} className="w-8 h-8 object-contain" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: accentColor }}
                      >
                        {team.short_name?.slice(0, 2)}
                      </div>
                    )}
                    <span className="text-white text-base font-medium truncate">{team.name}</span>
                  </div>
                  <div className="col-span-2 text-center text-white text-base font-semibold">
                    {team.player_count || 0}
                  </div>
                  <div className="col-span-4 text-right text-cyan-300 text-base font-bold">
                    {((team.remaining_budget || 0) / 100000).toFixed(1)}L
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-slate-500 text-base">
                No teams yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SOLD BANNER */}
      {slideState === 'sold' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="animate-sold-pop">
            <div
              className="px-16 py-6 text-5xl font-black text-white tracking-wider"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, #0891b2)`,
                clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
                boxShadow: `0 0 60px ${accentColor}`,
              }}
            >
              SOLD!
            </div>
          </div>
        </div>
      )}

      {/* UNSOLD BANNER */}
      {slideState === 'unsold' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="animate-unsold-pop">
            <div
              className="px-16 py-6 text-5xl font-black text-white tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
                boxShadow: '0 0 60px rgba(168,85,247,0.7)',
              }}
            >
              UNSOLD
            </div>
          </div>
        </div>
      )}

      {/* Import fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <style>{`
        .overlay-bg { background: transparent !important; }

        @keyframes sold-pop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-sold-pop {
          animation: sold-pop 0.4s ease-out forwards;
        }

        @keyframes unsold-pop {
          0% { transform: scale(0.5) rotate(-3deg); opacity: 0; }
          50% { transform: scale(1.05) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-unsold-pop {
          animation: unsold-pop 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
