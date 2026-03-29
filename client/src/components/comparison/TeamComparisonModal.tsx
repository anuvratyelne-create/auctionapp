import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { formatIndianNumber } from '../../utils/formatters';
import { X, Users, Wallet, Trophy, TrendingUp, Sparkles } from 'lucide-react';

interface TeamComparisonData {
  id: string;
  name: string;
  short_name: string;
  logo_url?: string;
  owner_name?: string;
  total_budget: number;
  spent_points: number;
  remaining_budget: number;
  player_count: number;
  avg_per_player: number;
  category_breakdown: Array<{
    id: string;
    name: string;
    count: number;
    total_spent: number;
  }>;
  top_purchase: {
    name: string;
    photo_url?: string;
    sold_price: number;
    category?: string;
  } | null;
  players: Array<{
    id: string;
    name: string;
    photo_url?: string;
    jersey_number?: string;
    sold_price: number;
    category?: string;
  }>;
}

interface TeamComparisonModalProps {
  teamIds: string[];
  onClose: () => void;
}

export default function TeamComparisonModal({ teamIds, onClose }: TeamComparisonModalProps) {
  const [teams, setTeams] = useState<TeamComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComparison();
  }, [teamIds]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.compareTeams(teamIds) as TeamComparisonData[];
      setTeams(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  const allCategories = teams.length > 0
    ? teams[0].category_breakdown.map(c => ({ id: c.id, name: c.name }))
    : [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-950 w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-purple-600/10 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 p-5 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-slate-800/50 to-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-600 to-purple-700 shadow-glow-sm">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Team Comparison</h2>
              <p className="text-sm text-slate-400">Side-by-side analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              <p className="mt-4 text-slate-400">Loading comparison...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <div className="text-red-400 text-lg">{error}</div>
            </div>
          )}

          {!loading && !error && teams.length > 0 && (
            <div className="space-y-6">
              {/* Team Headers */}
              <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="text-center p-4 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/30"
                  >
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-20 h-20 object-contain mx-auto mb-3 drop-shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <span className="text-2xl font-bold text-white">{team.short_name}</span>
                      </div>
                    )}
                    <h3 className="font-bold text-white text-lg">{team.name}</h3>
                    {team.owner_name && (
                      <p className="text-sm text-slate-400 mt-1">{team.owner_name}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Stats Comparison */}
              <div className="rounded-2xl overflow-hidden border border-slate-700/30 bg-gradient-to-br from-slate-800/40 to-slate-900/40">
                <div className="p-4 border-b border-slate-700/30 bg-slate-800/30">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Wallet size={18} className="text-amber-400" />
                    Budget Overview
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  {/* Player Count */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Players</p>
                    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                      {teams.map((team) => (
                        <div key={team.id} className="text-center">
                          <span className="text-3xl font-bold text-white">{team.player_count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Spent Points */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Spent</p>
                    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                      {teams.map((team) => (
                        <div key={team.id} className="text-center">
                          <span className="text-2xl font-bold text-amber-400">
                            {formatIndianNumber(team.spent_points)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Remaining Budget */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Remaining</p>
                    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                      {teams.map((team) => (
                        <div key={team.id} className="text-center">
                          <span className="text-2xl font-bold text-emerald-400">
                            {formatIndianNumber(team.remaining_budget)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Avg Per Player */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Avg per Player</p>
                    <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                      {teams.map((team) => (
                        <div key={team.id} className="text-center">
                          <span className="text-2xl font-bold text-blue-400">
                            {formatIndianNumber(team.avg_per_player)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="rounded-2xl overflow-hidden border border-slate-700/30 bg-gradient-to-br from-slate-800/40 to-slate-900/40">
                <div className="p-4 border-b border-slate-700/30 bg-slate-800/30">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-cyan-400" />
                    Category Breakdown
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  {allCategories.map((category) => (
                    <div key={category.id}>
                      <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">{category.name}</p>
                      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                        {teams.map((team) => {
                          const catData = team.category_breakdown.find(c => c.id === category.id);
                          return (
                            <div key={team.id} className="text-center">
                              <span className="text-2xl font-bold text-white">
                                {catData?.count || 0}
                              </span>
                              <span className="text-sm text-slate-400 ml-2">
                                ({formatIndianNumber(catData?.total_spent || 0)})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Purchases */}
              <div className="rounded-2xl overflow-hidden border border-slate-700/30 bg-gradient-to-br from-slate-800/40 to-slate-900/40">
                <div className="p-4 border-b border-slate-700/30 bg-slate-800/30">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Trophy size={18} className="text-amber-400" />
                    Top Purchase
                  </h4>
                </div>
                <div className={`grid gap-4 p-4`} style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                  {teams.map((team) => (
                    <div key={team.id} className="text-center">
                      {team.top_purchase ? (
                        <div className="bg-gradient-to-br from-amber-900/20 to-amber-950/20 border border-amber-500/20 rounded-xl p-4">
                          {team.top_purchase.photo_url ? (
                            <img
                              src={team.top_purchase.photo_url}
                              alt={team.top_purchase.name}
                              className="w-16 h-16 object-cover rounded-xl mx-auto mb-3 shadow-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                              <Users size={24} className="text-slate-400" />
                            </div>
                          )}
                          <p className="font-semibold text-white truncate">{team.top_purchase.name}</p>
                          <p className="text-xs text-slate-400 mt-1">{team.top_purchase.category}</p>
                          <p className="text-xl font-bold text-emerald-400 mt-2">
                            {formatIndianNumber(team.top_purchase.sold_price)}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-800/30 rounded-xl p-8 text-slate-500">
                          No purchases yet
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Squad Lists */}
              <div>
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Users size={18} className="text-blue-400" />
                  Squad Rosters
                </h4>
                <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${teams.length}, 1fr)` }}>
                  {teams.map((team) => (
                    <div key={team.id} className="rounded-2xl overflow-hidden border border-slate-700/30 bg-gradient-to-br from-slate-800/40 to-slate-900/40">
                      <div className="p-3 border-b border-slate-700/30 bg-slate-800/30">
                        <p className="font-semibold text-white">{team.short_name} Squad</p>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {team.players.length > 0 ? (
                          <div className="divide-y divide-slate-700/30">
                            {team.players.map((player) => (
                              <div key={player.id} className="p-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
                                {player.photo_url ? (
                                  <img
                                    src={player.photo_url}
                                    alt={player.name}
                                    className="w-10 h-10 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                                    <Users size={16} className="text-slate-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white font-medium truncate">{player.name}</p>
                                  <p className="text-xs text-slate-500">{player.category}</p>
                                </div>
                                <span className="text-sm font-bold text-emerald-400">
                                  {formatIndianNumber(player.sold_price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-500">
                            No players
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
