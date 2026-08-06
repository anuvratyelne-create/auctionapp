import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { socketClient } from '../socket/client';
import { useAuctionStore } from '../stores/auctionStore';
import { api } from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import { Team, Player, SportsType } from '../types';
import { User, Timer, Trophy, Users, Zap, TrendingUp } from 'lucide-react';

// Cricket stadium background - classic green pitch atmosphere
const CRICKET_BG = 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2067&auto=format&fit=crop';
const FOOTBALL_BG = 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=2082&auto=format&fit=crop';
const KABADDI_BG = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2090&auto=format&fit=crop';
const BASKETBALL_BG = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2090&auto=format&fit=crop';
const DEFAULT_BG = CRICKET_BG;

const getSportBackground = (sport?: SportsType) => {
  switch (sport) {
    case 'cricket': return CRICKET_BG;
    case 'football': return FOOTBALL_BG;
    case 'kabaddi': return KABADDI_BG;
    case 'basketball': return BASKETBALL_BG;
    default: return DEFAULT_BG;
  }
};

export default function LiveView() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentLogo, setTournamentLogo] = useState<string | null>(null);
  const [sportsType, setSportsType] = useState<SportsType>('cricket');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'teams' | 'players'>('live');
  const [playerFilter, setPlayerFilter] = useState<'available' | 'sold' | 'unsold'>('available');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timerState, setTimerState] = useState({ timeLeft: 30, isRunning: false, duration: 30 });
  const socket = useSocket();

  const { currentPlayer, currentBid, currentTeam, status, setAuctionState } = useAuctionStore();

  useEffect(() => {
    if (!shareCode) return;
    loadTournament();
  }, [shareCode]);

  // Keep tournamentId ref for debounced handlers
  const tournamentIdRef = useRef(tournamentId);
  tournamentIdRef.current = tournamentId;

  useEffect(() => {
    if (!tournamentId) return;

    socketClient.joinLiveView(tournamentId);

    socketClient.onAuctionState((state) => {
      setAuctionState(state);
    });

    // Debounced handlers to prevent rapid duplicate calls
    let teamsDebounce: ReturnType<typeof setTimeout> | null = null;
    let playersDebounce: ReturnType<typeof setTimeout> | null = null;

    socketClient.onTeamsUpdated(() => {
      if (teamsDebounce) clearTimeout(teamsDebounce);
      teamsDebounce = setTimeout(() => {
        if (tournamentIdRef.current) loadTeams();
      }, 500);
    });

    socketClient.onPlayersUpdated(() => {
      if (playersDebounce) clearTimeout(playersDebounce);
      playersDebounce = setTimeout(() => {
        if (tournamentIdRef.current) loadPlayers();
      }, 500);
    });

    // Listen for timer sync
    const handleTimerSync = (data: { timeLeft: number; isRunning: boolean; duration: number }) => {
      setTimerState(data);
    };
    socket.on('timer:sync', handleTimerSync);

    return () => {
      socketClient.removeAllListeners();
      socket.off('timer:sync', handleTimerSync);
      if (teamsDebounce) clearTimeout(teamsDebounce);
      if (playersDebounce) clearTimeout(playersDebounce);
    };
  }, [tournamentId, socket]);

  const loadTournament = async () => {
    try {
      const tournament = await api.getTournamentByShareCode(shareCode!) as any;
      setTournamentId(tournament.id);
      setTournamentName(tournament.name);
      setTournamentLogo(tournament.logo_url || null);
      setSportsType(tournament.sports_type || 'cricket');
      await Promise.all([loadTeams(tournament.id), loadPlayers(tournament.id)]);
    } catch (err) {
      setError('Tournament not found');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async (id?: string) => {
    try {
      const data = await api.getTeamsPublic(id || tournamentId!) as Team[];
      setTeams(data);
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  };

  const loadPlayers = async (id?: string) => {
    try {
      const data = await api.getPlayersPublic(id || tournamentId!, playerFilter) as Player[];
      setPlayers(data);
    } catch (err) {
      console.error('Failed to load players:', err);
    }
  };

  // Debounce player filter changes
  useEffect(() => {
    if (!tournamentId) return;

    const debounceTimer = setTimeout(() => {
      loadPlayers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [playerFilter, tournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
            <Trophy className="absolute inset-0 m-auto w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-slate-400">Loading auction...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center bg-slate-900/80 backdrop-blur-xl rounded-2xl p-12 border border-slate-800">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Tournament Not Found</h1>
          <p className="text-slate-400">Check the share code and try again.</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    idle: { bg: 'bg-slate-600', text: 'Waiting for player', icon: null },
    bidding: { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', text: 'BIDDING', icon: <Zap className="w-4 h-4" /> },
    sold: { bg: 'bg-gradient-to-r from-emerald-500 to-green-500', text: 'SOLD', icon: <Trophy className="w-4 h-4" /> },
    unsold: { bg: 'bg-gradient-to-r from-red-500 to-rose-500', text: 'UNSOLD', icon: null },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cricket Stadium Background */}
      <div className="fixed inset-0 z-0">
        <img
          src={getSportBackground(sportsType)}
          alt="Stadium"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlays for better readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/80 to-slate-950/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/30 via-transparent to-emerald-950/30" />
        {/* Animated cricket-themed accent */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 opacity-60" />
      </div>

      {/* Floating particles effect */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-emerald-500/20 rounded-full animate-pulse"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-slate-900/60 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {tournamentLogo ? (
                  <img src={tournamentLogo} alt={tournamentName} className="w-12 h-12 object-contain rounded-lg bg-white/10 p-1" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">{tournamentName}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-400 text-sm font-medium">LIVE</span>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 text-sm">{teams.length} Teams</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-slate-900/40 backdrop-blur-lg border-b border-white/5">
          <div className="max-w-6xl mx-auto flex gap-1 px-6">
            {[
              { key: 'live', label: 'Live Auction', icon: <Zap className="w-4 h-4" /> },
              { key: 'teams', label: 'Teams', icon: <Users className="w-4 h-4" /> },
              { key: 'players', label: 'Players', icon: <User className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-4 font-medium transition-all border-b-2 ${
                  activeTab === tab.key
                    ? 'text-emerald-400 border-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main className="max-w-6xl mx-auto p-6">
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Player */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Status Bar */}
                <div className={`${currentStatus.bg} px-4 py-3 flex items-center justify-center gap-2`}>
                  {currentStatus.icon}
                  <span className="text-white font-bold text-sm uppercase tracking-widest">
                    {currentStatus.text}
                  </span>
                  {status === 'bidding' && (
                    <span className="ml-2 w-2 h-2 bg-white rounded-full animate-ping" />
                  )}
                </div>

                {currentPlayer ? (
                  <div className="p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Player Image */}
                      <div className="relative group">
                        {currentPlayer.photo_url ? (
                          <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl opacity-50 blur group-hover:opacity-75 transition-opacity" />
                            <img
                              src={currentPlayer.photo_url}
                              alt={currentPlayer.name}
                              className="relative w-48 h-48 object-cover rounded-xl border-2 border-white/20"
                            />
                          </div>
                        ) : (
                          <div className="w-48 h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center border border-white/10">
                            <User size={72} className="text-slate-600" />
                          </div>
                        )}
                        {/* Player UID Badge */}
                        {currentPlayer.player_uid && (
                          <div className="absolute -top-3 -left-3 bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-1 rounded-lg shadow-lg">
                            <span className="text-white text-sm font-bold">{currentPlayer.player_uid}</span>
                          </div>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 flex flex-col justify-center">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                          {currentPlayer.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                          {currentPlayer.categories && (
                            <span className="px-4 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-full text-amber-400 text-sm font-semibold">
                              {currentPlayer.categories.name}
                            </span>
                          )}
                          {currentPlayer.role && (
                            <span className="px-4 py-1.5 bg-slate-800/80 border border-white/10 rounded-full text-slate-300 text-sm">
                              {currentPlayer.role}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <TrendingUp className="w-5 h-5 text-emerald-500" />
                          <span className="text-lg">Base Price:</span>
                          <span className="text-2xl font-bold text-white">{currentPlayer.base_price.toLocaleString()}</span>
                          <span className="text-lg">pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-16 text-center">
                    <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <User size={48} className="text-slate-600" />
                    </div>
                    <p className="text-xl text-slate-400">Waiting for next player...</p>
                    <p className="text-slate-500 mt-2">The auctioneer will bring up the next player shortly</p>
                  </div>
                )}
              </div>
            </div>

            {/* Current Bid & Timer */}
            <div className="space-y-4">
              {/* Timer Display */}
              {status === 'bidding' && timerState.isRunning && (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Timer size={20} className={
                        timerState.timeLeft <= 5 ? 'text-red-500 animate-pulse' :
                        timerState.timeLeft <= 10 ? 'text-amber-500' :
                        'text-emerald-500'
                      } />
                      <span className="text-slate-300 text-sm font-medium">Bid Timer</span>
                    </div>
                  </div>
                  <div className="text-center py-2">
                    <span className={`text-6xl font-black ${
                      timerState.timeLeft <= 5 ? 'text-red-500 animate-pulse' :
                      timerState.timeLeft <= 10 ? 'text-amber-500' :
                      'text-emerald-400'
                    }`}>
                      {timerState.timeLeft}
                    </span>
                    <span className={`text-2xl ${
                      timerState.timeLeft <= 5 ? 'text-red-500' :
                      timerState.timeLeft <= 10 ? 'text-amber-500' :
                      'text-emerald-400'
                    }`}>s</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-4 h-3 bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                        timerState.timeLeft <= 5 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                        timerState.timeLeft <= 10 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                        'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      }`}
                      style={{ width: `${(timerState.timeLeft / timerState.duration) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Current Bid */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 p-8 text-center relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16" />
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-black/10 rounded-full translate-x-12 translate-y-12" />

                  <p className="text-emerald-200 text-sm font-medium mb-2 relative">Current Bid</p>
                  <p className="text-5xl md:text-6xl font-black text-white relative">
                    {currentBid.toLocaleString()}
                  </p>
                  <p className="text-emerald-200 text-sm mt-2 relative">points</p>
                </div>

                <div className="p-6 text-center bg-slate-900/40">
                  {currentTeam ? (
                    <>
                      <p className="text-slate-400 text-sm mb-4 uppercase tracking-wider">Current Bidder</p>
                      <div className="relative inline-block">
                        {currentTeam.logo_url ? (
                          <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full opacity-50 blur" />
                            <img
                              src={currentTeam.logo_url}
                              alt={currentTeam.name}
                              className="relative w-20 h-20 object-contain mx-auto p-2 bg-white/10 rounded-full border border-white/20"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border-2 border-emerald-500/50">
                            <span className="text-2xl font-bold text-white">{currentTeam.short_name}</span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white mt-4">{currentTeam.name}</h3>
                    </>
                  ) : (
                    <div className="py-8">
                      <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="w-8 h-8 text-slate-600" />
                      </div>
                      <p className="text-slate-500">No bids yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className="group bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4 mb-5">
                  {team.logo_url ? (
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/50 to-green-500/50 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img src={team.logo_url} alt={team.name} className="relative w-14 h-14 object-contain rounded-full bg-white/10 p-1" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border border-white/10">
                      <span className="font-bold text-white">{team.short_name}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-white text-lg">{team.name}</h3>
                    <p className="text-sm text-slate-400">{team.short_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-white/5">
                    <Users className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{team.player_count}</p>
                    <div className="text-xs text-slate-400 mt-1">Players</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-white/5">
                    <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">
                      {((team.remaining_budget || 0) / 1000).toFixed(0)}K
                    </p>
                    <div className="text-xs text-slate-400 mt-1">Balance</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'players' && (
          <>
            <div className="flex gap-2 mb-6 bg-slate-900/40 backdrop-blur-lg rounded-xl p-2 inline-flex">
              {(['available', 'sold', 'unsold'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPlayerFilter(filter)}
                  className={`px-5 py-2.5 rounded-lg font-medium capitalize transition-all ${
                    playerFilter === filter
                      ? filter === 'sold'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25'
                        : filter === 'unsold'
                        ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="group bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={56} className="text-slate-700" />
                      </div>
                    )}
                    {/* Status badge */}
                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      player.status === 'sold' ? 'bg-emerald-500 text-white' :
                      player.status === 'unsold' ? 'bg-red-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {player.status}
                    </div>
                    {/* Player UID */}
                    {player.player_uid && (
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-cyan-400 text-xs font-bold">
                        {player.player_uid}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white text-lg mb-1">{player.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      {player.categories && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                          {player.categories.name}
                        </span>
                      )}
                      <span>{player.base_price.toLocaleString()} pts</span>
                    </div>
                    {player.teams && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                        {player.teams.logo_url && (
                          <img src={player.teams.logo_url} alt={player.teams.name} className="w-6 h-6 object-contain" />
                        )}
                        <p className="text-sm text-emerald-400">
                          Sold for <span className="font-bold">{player.sold_price?.toLocaleString()}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {players.length === 0 && (
              <div className="text-center py-16 bg-slate-900/40 backdrop-blur-lg rounded-2xl border border-white/10">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={40} className="text-slate-600" />
                </div>
                <p className="text-xl text-slate-400">No {playerFilter} players</p>
                <p className="text-slate-500 mt-2">Players will appear here as the auction progresses</p>
              </div>
            )}
          </>
        )}
      </main>
      </div>
    </div>
  );
}
