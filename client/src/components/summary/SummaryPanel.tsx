import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { Team, Player } from '../../types';
import { useSocket } from '../../hooks/useSocket';
import { formatIndianNumber } from '../../utils/formatters';
import { Users, Wallet, Shield, TrendingUp, X, ArrowLeft, GitCompare, Check, Crown, Eye, Trophy } from 'lucide-react';
import TeamComparisonModal from '../comparison/TeamComparisonModal';
import TeamPreviewModal from './TeamPreviewModal';

export default function SummaryPanel() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [previewTeam, setPreviewTeam] = useState<Team | null>(null);
  const [previewPlayers, setPreviewPlayers] = useState<Player[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    loadTeams();

    socket.onTeamsUpdated(() => {
      loadTeams();
      if (selectedTeam) {
        loadTeamPlayers(selectedTeam.id);
      }
    });

    return () => {
      socket.off('teams:updated');
    };
  }, [socket, selectedTeam]);

  const loadTeams = async () => {
    try {
      const data = await api.getTeams() as Team[];
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamPlayers = async (teamId: string) => {
    try {
      const team = await api.getTeam(teamId) as Team & { players: Player[] };
      setSelectedTeam(team);
      setTeamPlayers(team.players || []);
    } catch (error) {
      console.error('Failed to load team:', error);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!selectedTeam) return;
    if (!confirm('Remove this player from the team?')) return;

    try {
      await api.removePlayerFromTeam(selectedTeam.id, playerId);
      loadTeamPlayers(selectedTeam.id);
      loadTeams();
    } catch (error: any) {
      alert(error.message || 'Failed to remove player');
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedForCompare([]);
  };

  const toggleTeamSelection = (teamId: string) => {
    if (selectedForCompare.includes(teamId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== teamId));
    } else if (selectedForCompare.length < 4) {
      setSelectedForCompare([...selectedForCompare, teamId]);
    }
  };

  const handleTeamClick = (team: Team) => {
    if (compareMode) {
      toggleTeamSelection(team.id);
    } else {
      openTeamPreview(team);
    }
  };

  const openTeamPreview = async (team: Team) => {
    try {
      const teamData = await api.getTeam(team.id) as Team & { players: Player[] };
      setPreviewTeam(teamData);
      setPreviewPlayers(teamData.players || []);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to load team preview:', error);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setTimeout(() => {
      setPreviewTeam(null);
      setPreviewPlayers([]);
    }, 300);
  };

  const handleCompare = () => {
    if (selectedForCompare.length >= 2) {
      setShowComparison(true);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-slate-400 animate-pulse">Loading teams...</p>
        </div>
      </div>
    );
  }

  if (selectedTeam) {
    return (
      <div className="p-6 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedTeam(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <div className="flex items-center gap-4">
                {selectedTeam.logo_url ? (
                  <img
                    src={selectedTeam.logo_url}
                    alt={selectedTeam.name}
                    className="w-16 h-16 object-contain drop-shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">{selectedTeam.short_name}</span>
                  </div>
                )}
                <div>
                  <h2 className="text-3xl font-bold text-white">{selectedTeam.name}</h2>
                  <p className="text-slate-400">
                    {teamPlayers.length} players • {formatIndianNumber(selectedTeam.spent_points)} pts spent
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => openTeamPreview(selectedTeam)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-glow-sm hover:scale-105 transition-all"
            >
              <Eye size={18} />
              Animated Preview
            </button>
          </div>

          {/* Squad List */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="p-5 border-b border-slate-700/50 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
                  <Users size={18} className="text-white" />
                </div>
                <h3 className="font-semibold text-white text-lg">Squad</h3>
              </div>
              <div className="divide-y divide-slate-700/30">
                {teamPlayers.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No players in squad yet</p>
                  </div>
                ) : (
                  teamPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-4 hover:bg-white/5 group transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-8 text-center text-slate-500 font-medium">{index + 1}</span>
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.name}
                            className="w-14 h-14 object-cover rounded-xl shadow-lg"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
                            <Users size={22} className="text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white text-lg">{player.name}</p>
                          <p className="text-sm text-slate-400">
                            {player.categories?.name || 'Unknown'}
                            {player.jersey_number && <span className="ml-2">#{player.jersey_number}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-emerald-400">
                            {formatIndianNumber(player.sold_price)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Base: {formatIndianNumber(player.base_price)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemovePlayer(player.id)}
                          className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove from team"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-purple-700">
                <Crown size={28} className="text-white" />
              </div>
              Team Summary
            </h2>
            <p className="text-slate-400 mt-1">Click on a team to view their squad</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Top Players Button */}
            <button
              onClick={() => navigate('/top-players')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-lg hover:scale-105 transition-all"
            >
              <Trophy size={18} />
              Top Players
            </button>
            <button
              onClick={toggleCompareMode}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200
                ${compareMode
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-glow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/50'}
              `}
            >
              <GitCompare size={18} />
              {compareMode ? 'Cancel' : 'Compare Teams'}
            </button>
            {compareMode && selectedForCompare.length >= 2 && (
              <button
                onClick={handleCompare}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-success transition-all hover:scale-105"
              >
                <Check size={18} />
                Compare ({selectedForCompare.length})
              </button>
            )}
          </div>
        </div>

        {compareMode && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary-900/30 to-purple-900/30 border border-primary-500/30 text-sm text-slate-300">
            <span className="font-medium text-primary-400">Comparison Mode:</span> Select 2-4 teams to compare side by side
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team, index) => {
            const isSelected = selectedForCompare.includes(team.id);
            return (
              <button
                key={team.id}
                onClick={() => handleTeamClick(team)}
                className={`
                  relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300
                  ${compareMode
                    ? isSelected
                      ? 'bg-gradient-to-br from-primary-900/40 to-purple-900/40 border-2 border-primary-500 shadow-glow scale-[1.02]'
                      : 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-slate-600'
                    : 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-primary-500/50 hover:shadow-card-hover hover:scale-[1.02]'}
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Decorative gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                {/* Selection indicator */}
                {compareMode && isSelected && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center shadow-glow-sm">
                    <Check size={16} className="text-white" />
                  </div>
                )}

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-5">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-16 h-16 object-contain drop-shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-xl font-bold text-white">{team.short_name}</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white text-xl">{team.name}</h3>
                      <p className="text-slate-400">{team.short_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                        <Users size={12} />
                        Players
                      </div>
                      <p className="text-2xl font-bold text-white">{team.player_count}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                        <Wallet size={12} />
                        Balance
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {formatIndianNumber(team.remaining_budget)}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                        <Shield size={12} />
                        Reserve
                      </div>
                      <p className="text-2xl font-bold text-amber-400">
                        {formatIndianNumber(team.reserve_points)}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                        <TrendingUp size={12} />
                        Max Bid
                      </div>
                      <p className="text-2xl font-bold text-emerald-400">
                        {formatIndianNumber(team.max_bid)}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {teams.length === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <Users size={64} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No teams created yet</p>
              <p className="text-slate-500 mt-2">
                Add teams in the Manage panel
              </p>
            </div>
          </div>
        )}
      </div>

      {showComparison && (
        <TeamComparisonModal
          teamIds={selectedForCompare}
          onClose={() => {
            setShowComparison(false);
            setCompareMode(false);
            setSelectedForCompare([]);
          }}
        />
      )}

      {showPreview && previewTeam && (
        <TeamPreviewModal
          team={previewTeam}
          players={previewPlayers}
          onClose={closePreview}
          onViewDetails={() => {
            setSelectedTeam(previewTeam);
            setTeamPlayers(previewPlayers);
          }}
        />
      )}
    </div>
  );
}
