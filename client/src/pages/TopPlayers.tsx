import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import { Player } from '../types';
import { Trophy, Filter, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type RoleFilter = 'all' | 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper';

const roleFilters: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All Players' },
  { value: 'batsman', label: 'Batsmen' },
  { value: 'bowler', label: 'Bowlers' },
  { value: 'all-rounder', label: 'All-Rounders' },
  { value: 'wicket-keeper', label: 'Wicket-Keepers' },
];

export default function TopPlayers() {
  const { tournament } = useAuthStore();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<RoleFilter>('all');

  useEffect(() => {
    loadSoldPlayers();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [players, activeFilter]);

  const loadSoldPlayers = async () => {
    try {
      const data = await api.getPlayers('sold') as Player[];
      // Sort by sold_price descending
      const sorted = data.sort((a, b) => (b.sold_price || 0) - (a.sold_price || 0));
      setPlayers(sorted);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    if (activeFilter === 'all') {
      setFilteredPlayers(players);
    } else {
      const filtered = players.filter((player) => {
        const role = (player.stats?.role || player.categories?.name || '').toLowerCase();
        // Normalize the role string for comparison (remove hyphens, spaces)
        const normalizedRole = role.replace(/[-\s]/g, '');
        const normalizedFilter = activeFilter.replace(/[-\s]/g, '');

        // Check various possible matches
        if (activeFilter === 'batsman') {
          return normalizedRole.includes('bat') || role.includes('batsman') || role.includes('batter');
        }
        if (activeFilter === 'bowler') {
          return normalizedRole.includes('bowl') || role.includes('bowler');
        }
        if (activeFilter === 'all-rounder') {
          return normalizedRole.includes('allround') || role.includes('all-round') || role.includes('all round');
        }
        if (activeFilter === 'wicket-keeper') {
          return normalizedRole.includes('wicket') || normalizedRole.includes('keeper') || role.includes('wk');
        }
        return normalizedRole.includes(normalizedFilter);
      });
      setFilteredPlayers(filtered);
    }
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black';
    if (index === 1) return 'bg-gradient-to-r from-slate-400 to-slate-300 text-black';
    if (index === 2) return 'bg-gradient-to-r from-amber-700 to-amber-600 text-white';
    return 'bg-slate-700 text-white';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-auction-bg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-auction-bg">
      {/* Header */}
      <header className="bg-auction-card border-b border-auction-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/manage')}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <Trophy size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Most Expensive Players</h1>
                  <p className="text-slate-400 text-sm">{tournament?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter size={18} className="text-slate-400 flex-shrink-0" />
          {roleFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-auction-card border border-auction-border rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Players</p>
            <p className="text-2xl font-bold text-white">{filteredPlayers.length}</p>
          </div>
          <div className="bg-auction-card border border-auction-border rounded-xl p-4">
            <p className="text-slate-400 text-sm">Highest Price</p>
            <p className="text-2xl font-bold text-green-400">
              {filteredPlayers[0]?.sold_price?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-auction-card border border-auction-border rounded-xl p-4">
            <p className="text-slate-400 text-sm">Average Price</p>
            <p className="text-2xl font-bold text-amber-400">
              {filteredPlayers.length > 0
                ? Math.round(
                    filteredPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0) /
                      filteredPlayers.length
                  ).toLocaleString()
                : 0}
            </p>
          </div>
          <div className="bg-auction-card border border-auction-border rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Spent</p>
            <p className="text-2xl font-bold text-primary-400">
              {filteredPlayers
                .reduce((sum, p) => sum + (p.sold_price || 0), 0)
                .toLocaleString()}
            </p>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-auction-card border border-auction-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-auction-border">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Trophy size={18} className="text-yellow-500" />
              Top {activeFilter === 'all' ? 'Players' : roleFilters.find(f => f.value === activeFilter)?.label}
            </h2>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No sold players in this category</p>
            </div>
          ) : (
            <div className="divide-y divide-auction-border">
              {filteredPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center gap-4 p-4 hover:bg-slate-800/50 transition-colors"
                >
                  {/* Rank */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${getRankStyle(
                      index
                    )}`}
                  >
                    {index + 1}
                  </div>

                  {/* Player Photo */}
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-slate-700 rounded-lg flex items-center justify-center">
                      <Users size={24} className="text-slate-500" />
                    </div>
                  )}

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{player.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span>{player.stats?.role || player.categories?.name || 'Unknown'}</span>
                      {player.jersey_number && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span>#{player.jersey_number}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Team */}
                  <div className="flex items-center gap-2">
                    {player.teams?.logo_url ? (
                      <img
                        src={player.teams.logo_url}
                        alt={player.teams.short_name}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {player.teams?.short_name || '?'}
                      </div>
                    )}
                    <span className="text-slate-400 text-sm hidden md:block">
                      {player.teams?.short_name}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-400">
                      {player.sold_price?.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      Base: {player.base_price?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
