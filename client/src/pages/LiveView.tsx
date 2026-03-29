import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socketClient } from '../socket/client';
import { useAuctionStore } from '../stores/auctionStore';
import { api } from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import { Team, Player } from '../types';
import { User, Hash, Timer } from 'lucide-react';

export default function LiveView() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState('');
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

  useEffect(() => {
    if (!tournamentId) return;

    socketClient.joinLiveView(tournamentId);

    socketClient.onAuctionState((state) => {
      setAuctionState(state);
    });

    socketClient.onTeamsUpdated(() => {
      loadTeams();
    });

    socketClient.onPlayersUpdated(() => {
      loadPlayers();
    });

    // Listen for timer sync
    const handleTimerSync = (data: { timeLeft: number; isRunning: boolean; duration: number }) => {
      setTimerState(data);
    };
    socket.on('timer:sync', handleTimerSync);

    return () => {
      socketClient.removeAllListeners();
      socket.off('timer:sync', handleTimerSync);
    };
  }, [tournamentId, socket]);

  const loadTournament = async () => {
    try {
      const tournament = await api.getTournamentByShareCode(shareCode!) as any;
      setTournamentId(tournament.id);
      setTournamentName(tournament.name);
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

  useEffect(() => {
    if (tournamentId) {
      loadPlayers();
    }
  }, [playerFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-auction-bg flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-auction-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Tournament Not Found</h1>
          <p className="text-slate-400">Check the share code and try again.</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    idle: 'bg-slate-600',
    bidding: 'bg-amber-500 animate-pulse',
    sold: 'bg-green-500',
    unsold: 'bg-red-500',
  };

  return (
    <div className="min-h-screen bg-auction-bg">
      {/* Header */}
      <header className="bg-auction-card border-b border-auction-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{tournamentName}</h1>
          <span className="text-slate-400 text-sm">Live View</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-auction-card border-b border-auction-border">
        <div className="max-w-6xl mx-auto flex gap-4 px-6">
          {[
            { key: 'live', label: 'Live Auction' },
            { key: 'teams', label: 'Teams' },
            { key: 'players', label: 'Players' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-4 px-2 font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'text-primary-400 border-primary-400'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
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
              <div className="bg-auction-card border border-auction-border rounded-xl overflow-hidden">
                {/* Status Bar */}
                <div className={`${statusColors[status]} px-4 py-2 text-center`}>
                  <span className="text-white font-semibold text-sm uppercase tracking-wide">
                    {status === 'idle' ? 'Waiting for player' : status}
                  </span>
                </div>

                {currentPlayer ? (
                  <div className="p-6 flex gap-6">
                    {currentPlayer.photo_url ? (
                      <img
                        src={currentPlayer.photo_url}
                        alt={currentPlayer.name}
                        className="w-40 h-40 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-40 h-40 bg-slate-800 rounded-xl flex items-center justify-center">
                        <User size={64} className="text-slate-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-2">
                        {currentPlayer.name}
                      </h2>
                      <div className="flex items-center gap-3 mb-4">
                        {currentPlayer.jersey_number && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Hash size={16} />
                            {currentPlayer.jersey_number}
                          </span>
                        )}
                        {currentPlayer.categories && (
                          <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
                            {currentPlayer.categories.name}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400">
                        Base Price: {currentPlayer.base_price.toLocaleString()} pts
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <User size={64} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Waiting for next player...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Current Bid & Timer */}
            <div className="space-y-4">
              {/* Timer Display */}
              {status === 'bidding' && timerState.isRunning && (
                <div className="bg-auction-card border border-auction-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Timer size={18} className={
                        timerState.timeLeft <= 5 ? 'text-red-500' :
                        timerState.timeLeft <= 10 ? 'text-amber-500' :
                        'text-emerald-500'
                      } />
                      <span className="text-slate-400 text-sm">Bid Timer</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={`text-4xl font-bold ${
                      timerState.timeLeft <= 5 ? 'text-red-500' :
                      timerState.timeLeft <= 10 ? 'text-amber-500' :
                      'text-emerald-500'
                    }`}>
                      {timerState.timeLeft}s
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                        timerState.timeLeft <= 5 ? 'bg-red-500' :
                        timerState.timeLeft <= 10 ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${(timerState.timeLeft / timerState.duration) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Current Bid */}
              <div className="bg-auction-card border border-auction-border rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-center">
                  <p className="text-primary-200 text-sm mb-1">Current Bid</p>
                  <p className="text-4xl font-bold text-white">
                    {currentBid.toLocaleString()}
                  </p>
                  <p className="text-primary-200 text-sm mt-1">points</p>
                </div>

              <div className="p-6 text-center">
                {currentTeam ? (
                  <>
                    <p className="text-slate-400 text-sm mb-3">Current Bidder</p>
                    {currentTeam.logo_url ? (
                      <img
                        src={currentTeam.logo_url}
                        alt={currentTeam.name}
                        className="w-16 h-16 object-contain mx-auto mb-3"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-xl font-bold">{currentTeam.short_name}</span>
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-white">{currentTeam.name}</h3>
                  </>
                ) : (
                  <p className="text-slate-500 py-8">No bids yet</p>
                )}
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-auction-card border border-auction-border rounded-xl p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                      <span className="font-bold">{team.short_name}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-white">{team.name}</h3>
                    <p className="text-sm text-slate-400">{team.short_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Players</div>
                    <p className="text-xl font-bold text-white">{team.player_count}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Balance</div>
                    <p className="text-xl font-bold text-white">
                      {((team.remaining_budget || 0) / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'players' && (
          <>
            <div className="flex gap-2 mb-6">
              {(['available', 'sold', 'unsold'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPlayerFilter(filter)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize ${
                    playerFilter === filter
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-auction-card border border-auction-border rounded-xl overflow-hidden"
                >
                  <div className="aspect-square bg-slate-800 relative">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={48} className="text-slate-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1">{player.name}</h3>
                    <p className="text-sm text-slate-400">
                      {player.categories?.name} • {player.base_price.toLocaleString()} pts
                    </p>
                    {player.teams && (
                      <p className="text-sm text-primary-400 mt-2">
                        Sold to {player.teams.name} for {player.sold_price?.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {players.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No {playerFilter} players
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
