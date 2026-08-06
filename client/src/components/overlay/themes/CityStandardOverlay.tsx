import { useEffect, useState } from 'react';
import { Player, Team } from '../../../types';
import { User } from 'lucide-react';
import { api } from '../../../utils/api';

interface CityStandardOverlayProps {
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

export default function CityStandardOverlay({
  player,
  currentBid,
  currentTeam,
  status,
  tournament,
  slideState,
  bidAnimating,
}: CityStandardOverlayProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [soldPlayers, setSoldPlayers] = useState<Player[]>([]);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [showAppLogo, setShowAppLogo] = useState(!tournament?.broadcaster_logo_url);

  // City neon colors
  const cyan = '#06b6d4';
  const purple = '#a855f7';

  // Load data
  useEffect(() => {
    if (tournament?.id) {
      loadData();
    }
  }, [tournament?.id]);

  // Rotate ticker every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % 2);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Rotating logo effect
  useEffect(() => {
    if (!tournament?.broadcaster_logo_url) {
      setShowAppLogo(true);
      return;
    }
    const interval = setInterval(() => setShowAppLogo((prev) => !prev), 5000);
    return () => clearInterval(interval);
  }, [tournament?.broadcaster_logo_url]);

  const loadData = async () => {
    try {
      if (tournament?.id) {
        const [teamsData, playersData] = await Promise.all([
          api.getTeamsPublic(tournament.id) as Promise<Team[]>,
          api.getPlayersPublic(tournament.id) as Promise<Player[]>
        ]);
        setTeams(teamsData);
        setSoldPlayers(playersData.filter((p: Player) => p.status === 'sold'));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const tickerLabel = tickerIndex === 0 ? 'TEAM PURSE' : 'PLAYERS SOLD';

  return (
    <div className="overlay-bg min-h-screen relative overflow-hidden" style={{ fontFamily: "'Rajdhani', sans-serif" }}>

      {/* ==================== TOP LEFT - TOURNAMENT LOGO ==================== */}
      {tournament?.logo_url && (
        <div className="absolute top-8 left-8 z-20">
          <img
            src={tournament.logo_url}
            alt={tournament.name}
            className="h-44 w-auto object-contain"
            style={{ filter: `drop-shadow(0 0 15px ${cyan}80)` }}
          />
        </div>
      )}

      {/* ==================== TOP RIGHT - ROTATING LOGO ==================== */}
      <div className="absolute top-8 right-8 z-20">
        <img
          src={showAppLogo ? '/logo.png' : (tournament?.broadcaster_logo_url || '/logo.png')}
          alt={showAppLogo ? 'Game Auction' : (tournament?.broadcaster_name || 'Broadcaster')}
          className="h-40 w-auto object-contain transition-opacity duration-500"
          style={{ filter: `drop-shadow(0 0 10px ${showAppLogo ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.3)'})` }}
        />
      </div>

      {/* ==================== MAIN PLAYER CARD - CENTER ==================== */}
      {player && status !== 'idle' && (
        <div className={`absolute bottom-36 left-1/2 -translate-x-1/2 z-10 transition-all duration-500 ${
          slideState === 'entering' ? 'scale-90 opacity-0 translate-y-20' : 'scale-100 opacity-100 translate-y-0'
        }`}>

          {/* Container for centered alignment */}
          <div className="flex flex-col items-center" style={{ width: '600px' }}>

            {/* Player Photo - Clean Frame */}
            <div className="relative" style={{ width: '180px', height: '220px' }}>
              {/* Glow */}
              <div
                className="absolute -inset-2 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${cyan}, ${purple})`,
                  filter: 'blur(10px)',
                  opacity: 0.5,
                }}
              />

              {/* Frame */}
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: `linear-gradient(180deg, ${cyan}, ${purple})`,
                  padding: '3px',
                }}
              >
                <div className="w-full h-full rounded-lg bg-slate-900 overflow-hidden">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={60} className="text-cyan-400/30" />
                    </div>
                  )}
                </div>
              </div>

              {/* UID Badge */}
              {player.player_uid && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-bold text-white rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${cyan}, ${purple})`,
                    boxShadow: `0 0 15px ${cyan}`,
                  }}
                >
                  #{player.player_uid}
                </div>
              )}
            </div>

            {/* ==================== INFO BAR ==================== */}
            <div className="mt-4 w-full">
            {/* Main bar */}
            <div
              className="flex overflow-hidden rounded-lg"
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: `2px solid ${cyan}`,
                boxShadow: `0 0 20px ${cyan}40`,
              }}
            >
              {/* Base Price */}
              <div
                className="flex-1 py-4 px-6 text-center"
                style={{
                  background: `linear-gradient(180deg, ${cyan}20, transparent)`,
                  borderRight: `1px solid ${cyan}50`,
                }}
              >
                <p className="text-cyan-400 text-xs uppercase tracking-widest font-semibold mb-1">Base Price</p>
                <p className="text-white font-bold text-2xl">
                  ₹{player.base_price.toLocaleString('en-IN')}
                </p>
              </div>

              {/* Player Name */}
              <div
                className="flex-[1.6] py-4 px-6 text-center"
                style={{ borderRight: `1px solid ${cyan}50` }}
              >
                <p className="text-white font-black text-2xl uppercase tracking-wide truncate">
                  {player.name}
                </p>
                {player.categories && (
                  <span
                    className="inline-block mt-1 px-3 py-0.5 text-xs font-bold text-white rounded-full"
                    style={{ background: `linear-gradient(135deg, ${purple}, #ec4899)` }}
                  >
                    {player.categories.name}
                  </span>
                )}
              </div>

              {/* Current Bid */}
              <div
                className={`flex-1 py-4 px-6 text-center transition-all duration-200 ${bidAnimating ? 'scale-105' : ''}`}
                style={{
                  background: status === 'sold'
                    ? 'linear-gradient(180deg, rgba(16,185,129,0.3), transparent)'
                    : `linear-gradient(180deg, ${purple}20, transparent)`,
                }}
              >
                <p className={`text-xs uppercase tracking-widest font-semibold mb-1 ${
                  status === 'sold' ? 'text-emerald-400' : 'text-purple-400'
                }`}>
                  {status === 'sold' ? 'Sold For' : 'Current Bid'}
                </p>
                <p className={`font-bold text-2xl ${status === 'sold' ? 'text-emerald-400' : 'text-white'}`}>
                  ₹{currentBid > 0 ? currentBid.toLocaleString('en-IN') : '---'}
                </p>
              </div>
            </div>

            {/* Leading Team */}
            {currentTeam && status === 'bidding' && (
              <div
                className="flex items-center justify-center gap-3 mt-3 py-2 px-5 mx-auto w-fit rounded-full"
                style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: `2px solid ${purple}`,
                }}
              >
                {currentTeam.logo_url ? (
                  <img src={currentTeam.logo_url} className="w-8 h-8 object-contain" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: purple }}
                  >
                    {currentTeam.short_name?.slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="text-purple-400 text-[10px] uppercase tracking-wider font-semibold">Leading</p>
                  <p className="text-white text-base font-bold">{currentTeam.name}</p>
                </div>
              </div>
            )}
          </div>
          </div> {/* End of centered container */}
        </div>
      )}

      {/* ==================== TEAM SCOREBOARD - RIGHT ==================== */}
      <div className="absolute right-8 bottom-36 z-20">
        <div
          style={{
            width: '340px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: `2px solid ${cyan}`,
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
            style={{ background: `linear-gradient(90deg, ${cyan}80, ${purple}60)` }}
          >
            <div className="col-span-5 text-white">Teams</div>
            <div className="col-span-4 text-center text-white">Balance</div>
            <div className="col-span-3 text-right text-white">Players</div>
          </div>

          {/* Teams list */}
          <div className="max-h-48 overflow-y-auto">
            {teams.length > 0 ? (
              teams.map((team, index) => (
                <div
                  key={team.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center ${
                    currentTeam?.id === team.id ? 'bg-cyan-500/20' : ''
                  }`}
                  style={{
                    borderBottom: index < teams.length - 1 ? `1px solid ${cyan}30` : 'none',
                  }}
                >
                  <div className="col-span-5 flex items-center gap-2">
                    {team.logo_url ? (
                      <img src={team.logo_url} className="w-7 h-7 object-contain" />
                    ) : (
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: cyan }}
                      >
                        {team.short_name?.slice(0, 2)}
                      </div>
                    )}
                    <span className="text-white text-sm font-medium truncate">{team.short_name}</span>
                  </div>
                  <div className="col-span-4 text-center text-cyan-400 text-sm font-bold">
                    ₹{((team.remaining_budget || 0) / 100000).toFixed(1)}L
                  </div>
                  <div className="col-span-3 text-right text-white text-sm font-semibold">
                    {team.player_count || 0}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-4 text-center text-slate-500 text-sm">No teams</div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== NEWS TRAIN TICKER - BOTTOM ==================== */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        {/* Top accent line */}
        <div
          className="h-1"
          style={{ background: `linear-gradient(90deg, ${cyan}, ${purple}, ${cyan})` }}
        />

        {/* Main ticker container */}
        <div
          className="flex items-stretch"
          style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
            height: '90px',
          }}
        >
          {/* Label Section - Chevron Shape */}
          <div
            className="relative flex items-center gap-4 px-8 z-10"
            style={{
              background: `linear-gradient(135deg, ${cyan}, ${purple})`,
              clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 50%, calc(100% - 30px) 100%, 0 100%)',
              paddingRight: '50px',
              minWidth: '300px',
            }}
          >
            {tournament?.logo_url && (
              <img
                src={tournament.logo_url}
                className="h-14 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
              />
            )}
            <div>
              <p className="text-white font-black text-lg tracking-wider uppercase">
                {tickerLabel}
              </p>
              <p className="text-white/70 text-xs uppercase tracking-widest">Live Updates</p>
            </div>
          </div>

          {/* Scrolling Train Cars */}
          <div className="flex-1 overflow-hidden relative flex items-center">
            <div
              className="animate-train whitespace-nowrap flex items-center"
              style={{ paddingLeft: '50px', gap: '0px' }}
            >
              {/* Train Cars */}
              {(tickerIndex === 0 ? teams : soldPlayers.slice(-10)).map((item, idx) => {
                const isTeam = tickerIndex === 0;
                const team = isTeam ? (item as Team) : (item as Player).teams;
                const displayName = isTeam ? (item as Team).name : (item as Player).name;
                const subText = isTeam
                  ? `₹${(((item as Team).remaining_budget || 0) / 100000).toFixed(1)}L • ${(item as Team).player_count || 0} players`
                  : `→ ${team?.name || 'Team'} • ₹${((item as Player).sold_price || 0).toLocaleString('en-IN')}`;

                return (
                  <div
                    key={idx}
                    className="relative flex items-center h-16 px-6 mx-[-1px]"
                    style={{
                      background: idx % 2 === 0
                        ? `linear-gradient(180deg, ${cyan}dd, ${cyan}99)`
                        : `linear-gradient(180deg, ${purple}dd, ${purple}99)`,
                      clipPath: 'polygon(15px 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 15px 100%, 0 50%)',
                      minWidth: '280px',
                    }}
                  >
                    {/* Team/Player Logo */}
                    <div className="flex items-center gap-4">
                      {(isTeam ? (item as Team).logo_url : team?.logo_url) ? (
                        <img
                          src={isTeam ? (item as Team).logo_url : team?.logo_url}
                          className="w-12 h-12 object-contain"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                          {(isTeam ? (item as Team).short_name : team?.short_name)?.slice(0, 2) || '?'}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-white font-bold text-lg leading-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                          {displayName}
                        </p>
                        <p className="text-white/90 text-sm font-medium">
                          {subText}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Duplicate for seamless loop */}
              {(tickerIndex === 0 ? teams : soldPlayers.slice(-10)).map((item, idx) => {
                const isTeam = tickerIndex === 0;
                const team = isTeam ? (item as Team) : (item as Player).teams;
                const displayName = isTeam ? (item as Team).name : (item as Player).name;
                const subText = isTeam
                  ? `₹${(((item as Team).remaining_budget || 0) / 100000).toFixed(1)}L • ${(item as Team).player_count || 0} players`
                  : `→ ${team?.name || 'Team'} • ₹${((item as Player).sold_price || 0).toLocaleString('en-IN')}`;

                return (
                  <div
                    key={`dup-${idx}`}
                    className="relative flex items-center h-16 px-6 mx-[-1px]"
                    style={{
                      background: idx % 2 === 0
                        ? `linear-gradient(180deg, ${cyan}dd, ${cyan}99)`
                        : `linear-gradient(180deg, ${purple}dd, ${purple}99)`,
                      clipPath: 'polygon(15px 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 15px 100%, 0 50%)',
                      minWidth: '280px',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {(isTeam ? (item as Team).logo_url : team?.logo_url) ? (
                        <img
                          src={isTeam ? (item as Team).logo_url : team?.logo_url}
                          className="w-12 h-12 object-contain"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                          {(isTeam ? (item as Team).short_name : team?.short_name)?.slice(0, 2) || '?'}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-white font-bold text-lg leading-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                          {displayName}
                        </p>
                        <p className="text-white/90 text-sm font-medium">
                          {subText}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {tickerIndex === 1 && soldPlayers.length === 0 && (
                <div
                  className="relative flex items-center h-16 px-8"
                  style={{
                    background: `linear-gradient(180deg, ${purple}dd, ${purple}99)`,
                    clipPath: 'polygon(15px 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 15px 100%, 0 50%)',
                    minWidth: '300px',
                  }}
                >
                  <p className="text-white font-bold text-lg">Auction in progress...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="h-1"
          style={{ background: `linear-gradient(90deg, ${purple}, ${cyan}, ${purple})` }}
        />
      </div>

      {/* ==================== SOLD BANNER ==================== */}
      {slideState === 'sold' && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 animate-flash-green" style={{ background: 'rgba(16,185,129,0.3)' }} />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-sold-pop text-center">
              <div
                className="px-20 py-8 text-6xl font-black text-white tracking-wider rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 0 60px rgba(16,185,129,0.8)',
                }}
              >
                SOLD!
              </div>

              <div className="mt-6 flex items-center justify-center gap-5">
                {currentTeam?.logo_url && (
                  <img src={currentTeam.logo_url} className="w-16 h-16 object-contain" />
                )}
                <div className="text-left">
                  <p className="text-emerald-400 text-xl font-semibold">{currentTeam?.name}</p>
                  <p className="text-4xl font-black text-white">₹{currentBid.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== UNSOLD BANNER ==================== */}
      {slideState === 'unsold' && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 animate-flash-red" style={{ background: 'rgba(239,68,68,0.2)' }} />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-unsold-pop">
              <div
                className="px-20 py-8 text-6xl font-black text-white tracking-wider rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  boxShadow: '0 0 60px rgba(239,68,68,0.8)',
                }}
              >
                UNSOLD
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        .overlay-bg { background: transparent !important; }

        @keyframes train {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-train {
          animation: train 25s linear infinite;
        }

        @keyframes sold-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-sold-pop { animation: sold-pop 0.5s ease-out forwards; }

        @keyframes unsold-pop {
          0% { transform: scale(0.5) rotate(-3deg); opacity: 0; }
          60% { transform: scale(1.05) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-unsold-pop { animation: unsold-pop 0.5s ease-out forwards; }

        @keyframes flash-green {
          0%, 30% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flash-green { animation: flash-green 0.6s ease-out forwards; }

        @keyframes flash-red {
          0%, 30% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flash-red { animation: flash-red 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}
