import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useSocket } from '../../hooks/useSocket';
import { DashboardStats } from '../../types/stats';
import { formatIndianNumber } from '../../utils/formatters';
import StatCard from './StatCard';
import {
  Users,
  Wallet,
  TrendingUp,
  BarChart3,
  Trophy,
  DollarSign,
  Zap,
  Target,
} from 'lucide-react';

export default function StatsPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => {
    loadStats();

    socket.onTeamsUpdated(() => {
      loadStats();
    });

    socket.onPlayersUpdated(() => {
      loadStats();
    });

    socket.onStatsUpdated(() => {
      loadStats();
    });
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats() as DashboardStats;
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-slate-400 animate-pulse">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center text-slate-400">
        Failed to load statistics
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-600 to-purple-700">
              <BarChart3 size={28} className="text-white" />
            </div>
            Auction Statistics
          </h2>
          <p className="text-slate-400">Real-time auction metrics and insights</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Players"
            value={formatIndianNumber(stats.overview.total_players)}
            icon={Users}
            variant="blue"
          />
          <StatCard
            title="Players Sold"
            value={formatIndianNumber(stats.overview.sold_players)}
            subtitle={`${stats.overview.auction_progress}% complete`}
            icon={Trophy}
            variant="success"
          />
          <StatCard
            title="Total Value"
            value={formatIndianNumber(stats.overview.total_sold_value)}
            subtitle="Points spent"
            icon={Wallet}
            variant="gold"
          />
          <StatCard
            title="Avg Price"
            value={formatIndianNumber(stats.overview.avg_sold_price)}
            subtitle="Per player"
            icon={TrendingUp}
            variant="purple"
          />
        </div>

        {/* Progress Bar */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-6 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary-600 to-purple-700">
                  <Zap size={18} className="text-white" />
                </div>
                <span className="text-lg font-semibold text-white">Auction Progress</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">
                  {stats.overview.sold_players}
                </span>
                <span className="text-slate-400"> / {stats.overview.total_players}</span>
                <span className="ml-2 text-sm text-slate-500">players</span>
              </div>
            </div>

            <div className="relative h-4 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-600 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${stats.overview.auction_progress}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/20 to-transparent rounded-full animate-pulse"
                style={{ width: `${stats.overview.auction_progress}%` }}
              />
            </div>

            <div className="flex justify-between mt-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-400">{stats.overview.available_players} available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-400">{stats.overview.unsold_players} unsold</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="p-5 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                    <Target size={18} className="text-white" />
                  </div>
                  Category Breakdown
                </h3>
              </div>
              <div className="divide-y divide-slate-700/30">
                {stats.categories.map((cat, index) => (
                  <div
                    key={cat.id}
                    className="p-5 hover:bg-white/5 transition-colors"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-white text-lg">{cat.name}</span>
                      <span className="text-sm px-3 py-1 rounded-full bg-slate-700/50 text-slate-300">
                        {cat.sold_players} / {cat.total_players}
                      </span>
                    </div>
                    <div className="relative h-2.5 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                        style={{
                          width: cat.total_players > 0
                            ? `${(cat.sold_players / cat.total_players) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-400 font-medium">
                        Total: {formatIndianNumber(cat.total_value)} pts
                      </span>
                      <span className="text-slate-500">
                        Avg: {formatIndianNumber(cat.avg_sold_price)} pts
                      </span>
                    </div>
                  </div>
                ))}
                {stats.categories.length === 0 && (
                  <div className="p-10 text-center text-slate-500">
                    No categories created yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Team Spending */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="p-5 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                    <DollarSign size={18} className="text-white" />
                  </div>
                  Team Spending
                </h3>
              </div>
              <div className="divide-y divide-slate-700/30 max-h-[450px] overflow-y-auto">
                {stats.team_spending.map((team, index) => (
                  <div
                    key={team.id}
                    className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                        index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-black' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                        'bg-slate-700 text-slate-300'}
                    `}>
                      {index + 1}
                    </div>
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-12 h-12 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{team.short_name}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{team.name}</p>
                      <p className="text-xs text-slate-400">
                        {team.player_count} players • Avg {formatIndianNumber(team.avg_per_player)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-400">
                        {formatIndianNumber(team.spent_points)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatIndianNumber(team.remaining_budget)} left
                      </p>
                    </div>
                  </div>
                ))}
                {stats.team_spending.length === 0 && (
                  <div className="p-10 text-center text-slate-500">
                    No teams have made purchases yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Purchases */}
        <div className="mt-6 relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="p-5 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
                  <Trophy size={18} className="text-black" />
                </div>
                Top Purchases
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {stats.top_purchases.slice(0, 6).map((player, index) => (
                <div
                  key={player.id}
                  className={`
                    relative overflow-hidden rounded-xl p-4
                    ${index === 0 ? 'bg-gradient-to-br from-amber-900/40 to-amber-950/40 border border-amber-500/30' :
                      index === 1 ? 'bg-gradient-to-br from-slate-700/40 to-slate-800/40 border border-slate-500/30' :
                      index === 2 ? 'bg-gradient-to-br from-amber-800/30 to-amber-900/30 border border-amber-700/30' :
                      'bg-slate-800/50 border border-slate-700/30'}
                    transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt={player.name}
                          className="w-16 h-16 object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
                          <Users size={24} className="text-slate-400" />
                        </div>
                      )}
                      <div className={`
                        absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg
                        ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                          index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                          index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                          'bg-slate-600 text-white'}
                      `}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate text-lg">{player.name}</p>
                      <p className="text-sm text-slate-400">
                        {player.category_name} • {player.team_short_name}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xl font-bold text-emerald-400">
                          {formatIndianNumber(player.sold_price)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                          {player.multiplier}x
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {stats.top_purchases.length === 0 && (
                <div className="col-span-full p-10 text-center text-slate-500">
                  No players sold yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
