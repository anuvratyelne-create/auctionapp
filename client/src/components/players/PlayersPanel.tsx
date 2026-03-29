import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Player, Category } from '../../types';
import { useUIStore } from '../../stores/uiStore';
import { useSocket } from '../../hooks/useSocket';
import { User, Hash, Tag, Filter, ToggleLeft, ToggleRight } from 'lucide-react';

export default function PlayersPanel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { playerFilter, setPlayerFilter } = useUIStore();
  const socket = useSocket();

  useEffect(() => {
    loadCategories();
    socket.onPlayersUpdated(() => {
      loadPlayers();
    });
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [playerFilter, selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories() as Category[];
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const status = playerFilter === 'all' ? undefined : playerFilter;
      const categoryId = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await api.getPlayers(status, categoryId) as Player[];
      setPlayers(data);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (playerId: string) => {
    try {
      await api.togglePlayerAvailability(playerId);
      loadPlayers();
    } catch (error: any) {
      alert(error.message || 'Failed to toggle availability');
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'sold', label: 'Sold' },
    { key: 'unsold', label: 'Unsold' },
  ] as const;

  const statusColors = {
    available: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    bidding: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    sold: 'bg-green-500/20 text-green-400 border-green-500/50',
    unsold: 'bg-red-500/20 text-red-400 border-red-500/50',
  };

  const categoryColors: Record<string, string> = {
    Platinum: 'bg-slate-200 text-slate-800',
    Gold: 'bg-amber-400 text-amber-900',
    Silver: 'bg-slate-400 text-slate-900',
    Bronze: 'bg-orange-600 text-white',
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Player List</h2>
          <span className="text-slate-400">
            {players.length} player{players.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="bg-auction-card border border-auction-border rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <span className="text-sm text-slate-400">Status:</span>
              <div className="flex gap-2">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setPlayerFilter(f.key)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      playerFilter === f.key
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 ml-auto">
              <Tag size={16} className="text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-white text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Player Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : players.length === 0 ? (
          <div className="bg-auction-card border border-auction-border rounded-xl p-12 text-center">
            <User size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No players found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-auction-card border border-auction-border rounded-xl overflow-hidden hover:border-slate-600 transition-colors"
              >
                {/* Player Photo */}
                <div className="aspect-square bg-slate-800 relative">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={64} className="text-slate-600" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <span
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium border ${
                      statusColors[player.status]
                    }`}
                  >
                    {player.status}
                  </span>

                  {/* Category Badge */}
                  {player.categories && (
                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${
                        categoryColors[player.categories.name] || 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {player.categories.name}
                    </span>
                  )}
                </div>

                {/* Player Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{player.name}</h3>
                    {player.jersey_number && (
                      <span className="flex items-center gap-0.5 text-slate-400 text-sm">
                        <Hash size={12} />
                        {player.jersey_number}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Base: {player.base_price ? player.base_price.toLocaleString() : 'Pending'}
                    </span>
                    {player.sold_price && (
                      <span className="text-green-400 font-medium">
                        Sold: {player.sold_price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {player.teams && (
                    <div className="mt-2 pt-2 border-t border-auction-border">
                      <span className="text-sm text-primary-400">
                        {player.teams.name}
                      </span>
                    </div>
                  )}

                  {/* Availability Toggle - only for available/unsold players */}
                  {(player.status === 'available' || player.status === 'unsold') && (
                    <button
                      onClick={() => toggleAvailability(player.id)}
                      className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        player.status === 'available'
                          ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                          : 'bg-slate-600/30 text-slate-400 hover:bg-slate-600/50 border border-slate-600/30'
                      }`}
                      title={player.status === 'available' ? 'Mark as Unavailable' : 'Mark as Available'}
                    >
                      {player.status === 'available' ? (
                        <>
                          <ToggleRight size={16} />
                          <span>Available</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={16} />
                          <span>Unavailable</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
