import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socketClient } from '../socket/client';
import { api } from '../utils/api';
import { Team } from '../types';
import { Users, Wallet, Shield, TrendingUp } from 'lucide-react';

export default function SummaryView() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shareCode) return;
    loadTournament();
  }, [shareCode]);

  useEffect(() => {
    if (!tournamentId) return;

    socketClient.joinSummaryView(tournamentId);

    socketClient.onTeamsUpdated(() => {
      loadTeams();
    });

    return () => {
      socketClient.removeAllListeners();
    };
  }, [tournamentId]);

  const loadTournament = async () => {
    try {
      const tournament = await api.getTournamentByShareCode(shareCode!) as any;
      setTournamentId(tournament.id);
      setTournamentName(tournament.name);
      await loadTeams(tournament.id);
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

  return (
    <div className="min-h-screen bg-auction-bg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{tournamentName}</h1>
          <p className="text-slate-400">Team Summary - Real-time Updates</p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-auction-card border border-auction-border rounded-2xl p-6 hover:border-primary-500/50 transition-all"
            >
              {/* Team Header */}
              <div className="flex items-center gap-4 mb-6">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold">{team.short_name}</span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">{team.name}</h2>
                  <p className="text-slate-400">{team.short_name}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Users size={16} />
                    <span className="text-sm">Players</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{team.player_count}</p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Wallet size={16} />
                    <span className="text-sm">Balance</span>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {((team.remaining_budget || 0) / 1000).toFixed(0)}K
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Shield size={16} />
                    <span className="text-sm">Spent</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-400">
                    {((team.spent_points || 0) / 1000).toFixed(0)}K
                  </p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <TrendingUp size={16} />
                    <span className="text-sm">Max Bid</span>
                  </div>
                  <p className="text-3xl font-bold text-green-400">
                    {((team.max_bid || 0) / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>Budget Used</span>
                  <span>
                    {(
                      ((team.spent_points || 0) / (team.total_budget || 100000)) *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-500"
                    style={{
                      width: `${
                        ((team.spent_points || 0) / (team.total_budget || 100000)) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {teams.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Users size={64} className="mx-auto mb-4 opacity-50" />
            <p>No teams in this tournament yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
