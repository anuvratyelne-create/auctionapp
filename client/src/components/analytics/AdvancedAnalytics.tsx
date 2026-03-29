import { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, PieChart, Target, Award, Zap,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { Team, Player, Category } from '../../types';
import { formatIndianNumber } from '../../utils/formatters';

interface AdvancedAnalyticsProps {
  teams: Team[];
  players: Player[];
  categories: Category[];
  tournamentTotalBudget?: number;
}

interface TeamEfficiency {
  team: Team;
  efficiencyScore: number;
  avgPriceVsCategory: number;
  budgetUtilization: number;
  categoryBalance: number;
  valuePerPlayer: number;
}

export default function AdvancedAnalytics({
  teams,
  players,
  categories,
}: AdvancedAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'efficiency' | 'trends' | 'predictions'>('efficiency');

  // Calculate team efficiency scores
  const teamEfficiencies = useMemo((): TeamEfficiency[] => {
    // Include both sold AND retained players
    const soldPlayers = players.filter(p => p.status === 'sold');
    const retainedPlayers = players.filter(p => p.is_retained);

    return teams.map(team => {
      const teamSoldPlayers = soldPlayers.filter(p => p.team_id === team.id);
      const teamRetainedPlayers = retainedPlayers.filter(p => p.team_id === team.id);
      const teamPlayers = [...teamSoldPlayers, ...teamRetainedPlayers.filter(rp => !teamSoldPlayers.find(sp => sp.id === rp.id))];

      const soldSpent = teamSoldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
      const retentionSpent = teamRetainedPlayers.reduce((sum, p) => sum + ((p as any).retention_price || p.sold_price || 0), 0);
      const totalSpent = soldSpent + retentionSpent;

      // Calculate avg price vs category average
      let avgPriceVsCategory = 0;
      if (teamPlayers.length > 0) {
        const priceComparisons = teamPlayers.map(p => {
          const category = categories.find(c => c.id === p.category_id);
          const categoryAvg = category?.avg_sold_price || p.base_price;
          return categoryAvg > 0 ? (p.sold_price || 0) / categoryAvg : 1;
        });
        avgPriceVsCategory = priceComparisons.reduce((a, b) => a + b, 0) / priceComparisons.length;
      }

      // Budget utilization
      const budgetUtilization = team.total_budget > 0 ? totalSpent / team.total_budget : 0;

      // Category balance (how evenly distributed across categories)
      const categoryDistribution = categories.map(cat => {
        return teamPlayers.filter(p => p.category_id === cat.id).length;
      });
      const maxInCategory = Math.max(...categoryDistribution, 1);
      const avgInCategory = categoryDistribution.reduce((a, b) => a + b, 0) / categories.length;
      const categoryBalance = avgInCategory > 0 ? 1 - (maxInCategory - avgInCategory) / maxInCategory : 0;

      // Value per player
      const valuePerPlayer = teamPlayers.length > 0 ? totalSpent / teamPlayers.length : 0;

      // Overall efficiency score (weighted)
      const efficiencyScore =
        (avgPriceVsCategory < 1 ? (1 - avgPriceVsCategory) * 40 : 0) + // Lower than avg is good
        (budgetUtilization * 30) + // Using budget is good
        (categoryBalance * 20) + // Balance is good
        (teamPlayers.length >= 7 ? 10 : teamPlayers.length * 1.4); // Meeting min players

      return {
        team,
        efficiencyScore: Math.min(100, Math.max(0, efficiencyScore)),
        avgPriceVsCategory,
        budgetUtilization,
        categoryBalance,
        valuePerPlayer
      };
    }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  }, [teams, players, categories]);

  // Calculate auction trends
  const auctionTrends = useMemo(() => {
    // Include both sold AND retained players
    const soldPlayers = players.filter(p => p.status === 'sold');
    const retainedPlayers = players.filter(p => p.is_retained);
    const acquiredPlayers = [...soldPlayers, ...retainedPlayers.filter(rp => !soldPlayers.find(sp => sp.id === rp.id))];

    // Price trend by category
    const categoryTrends = categories.map(cat => {
      const catSoldPlayers = soldPlayers.filter(p => p.category_id === cat.id);
      const catRetainedPlayers = retainedPlayers.filter(p => p.category_id === cat.id);
      const catAcquired = [...catSoldPlayers, ...catRetainedPlayers.filter(rp => !catSoldPlayers.find(sp => sp.id === rp.id))];

      const soldValue = catSoldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
      const retainedValue = catRetainedPlayers.reduce((sum, p) => sum + ((p as any).retention_price || p.sold_price || 0), 0);
      const totalCatValue = soldValue + retainedValue;

      const avgPrice = catAcquired.length > 0 ? totalCatValue / catAcquired.length : 0;
      const priceVsBase = cat.base_price > 0 ? avgPrice / cat.base_price : 0;

      return {
        category: cat,
        soldCount: catAcquired.length,
        avgPrice,
        priceVsBase,
        trend: priceVsBase > 1.5 ? 'hot' : priceVsBase > 1 ? 'normal' : 'cold'
      };
    });

    // Overall stats
    const totalSold = acquiredPlayers.length;
    const soldValue = soldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
    const retainedValue = retainedPlayers.reduce((sum, p) => sum + ((p as any).retention_price || p.sold_price || 0), 0);
    const totalValue = soldValue + retainedValue;
    const avgPrice = totalSold > 0 ? totalValue / totalSold : 0;
    const totalBudgetPool = teams.reduce((sum, t) => sum + t.total_budget, 0);
    const budgetUtilized = totalBudgetPool > 0 ? totalValue / totalBudgetPool : 0;

    return {
      categoryTrends,
      totalSold,
      totalValue,
      avgPrice,
      budgetUtilized
    };
  }, [players, categories, teams]);

  // Predictions
  const predictions = useMemo(() => {
    const availablePlayers = players.filter(p => p.status === 'available');
    const unsoldPlayers = players.filter(p => p.status === 'unsold');
    const soldPlayers = players.filter(p => p.status === 'sold');
    const retainedPlayers = players.filter(p => p.is_retained);
    const acquiredPlayers = [...soldPlayers, ...retainedPlayers.filter(rp => !soldPlayers.find(sp => sp.id === rp.id))];

    // Estimated remaining value (based on acquired player average)
    const soldValue = soldPlayers.reduce((sum, p) => sum + (p.sold_price || 0), 0);
    const retainedValue = retainedPlayers.reduce((sum, p) => sum + ((p as any).retention_price || p.sold_price || 0), 0);
    const totalValue = soldValue + retainedValue;

    const avgSoldPrice = acquiredPlayers.length > 0
      ? totalValue / acquiredPlayers.length
      : categories.reduce((sum, c) => sum + c.base_price, 0) / categories.length;

    const estimatedRemainingValue = availablePlayers.length * avgSoldPrice * 0.8; // 80% discount for uncertainty

    // Teams likely to spend
    const teamsWithBudget = teams
      .filter(t => t.remaining_budget > avgSoldPrice)
      .sort((a, b) => b.remaining_budget - a.remaining_budget);

    // Hot categories (likely to see high bids)
    const hotCategories = auctionTrends.categoryTrends
      .filter(ct => ct.trend === 'hot' && categories.find(c => c.id === ct.category.id))
      .map(ct => ct.category);

    return {
      availableCount: availablePlayers.length,
      unsoldCount: unsoldPlayers.length,
      estimatedRemainingValue,
      teamsWithBudget,
      hotCategories,
      avgSoldPrice
    };
  }, [players, categories, teams, auctionTrends]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-xl w-fit">
        {[
          { id: 'efficiency', label: 'Team Efficiency', icon: Target },
          { id: 'trends', label: 'Auction Trends', icon: TrendingUp },
          { id: 'predictions', label: 'Predictions', icon: Zap }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Efficiency Tab */}
      {activeTab === 'efficiency' && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
          <div className="p-5 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <Target size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Team Efficiency Rankings</h3>
                <p className="text-xs text-slate-400">Based on spending patterns and squad building</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-700/30">
            {teamEfficiencies.map((te, idx) => (
              <div key={te.team.id} className="p-5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                    idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-black' :
                    idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {idx + 1}
                  </div>
                  {te.team.logo_url ? (
                    <img src={te.team.logo_url} alt={te.team.name} className="w-12 h-12 object-contain" />
                  ) : (
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">
                      <span className="font-bold text-white">{te.team.short_name}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-white">{te.team.name}</p>
                    <p className="text-sm text-slate-400">{te.team.player_count} players</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-400">{te.efficiencyScore.toFixed(0)}</p>
                    <p className="text-xs text-slate-500">Efficiency Score</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Price vs Avg</p>
                    <div className="flex items-center gap-1">
                      {te.avgPriceVsCategory < 1 ? (
                        <ArrowDownRight size={14} className="text-emerald-400" />
                      ) : te.avgPriceVsCategory > 1 ? (
                        <ArrowUpRight size={14} className="text-red-400" />
                      ) : (
                        <Minus size={14} className="text-slate-400" />
                      )}
                      <span className={`font-semibold ${
                        te.avgPriceVsCategory < 1 ? 'text-emerald-400' :
                        te.avgPriceVsCategory > 1 ? 'text-red-400' : 'text-white'
                      }`}>
                        {((te.avgPriceVsCategory - 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Budget Used</p>
                    <p className="font-semibold text-white">{(te.budgetUtilization * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Cat. Balance</p>
                    <p className="font-semibold text-white">{(te.categoryBalance * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Avg/Player</p>
                    <p className="font-semibold text-white">{formatIndianNumber(te.valuePerPlayer)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overview Stats */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-400" />
              Auction Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-white">{auctionTrends.totalSold}</p>
                <p className="text-sm text-slate-400">Players Sold</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-400">{formatIndianNumber(auctionTrends.totalValue)}</p>
                <p className="text-sm text-slate-400">Total Value</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-amber-400">{formatIndianNumber(auctionTrends.avgPrice)}</p>
                <p className="text-sm text-slate-400">Avg Price</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-400">{(auctionTrends.budgetUtilized * 100).toFixed(0)}%</p>
                <p className="text-sm text-slate-400">Budget Used</p>
              </div>
            </div>
          </div>

          {/* Category Trends */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-primary-400" />
              Category Trends
            </h3>
            <div className="space-y-3">
              {auctionTrends.categoryTrends.map(ct => (
                <div key={ct.category.id} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    ct.trend === 'hot' ? 'bg-red-500' :
                    ct.trend === 'cold' ? 'bg-blue-500' : 'bg-slate-500'
                  }`} />
                  <span className="flex-1 text-white">{ct.category.name}</span>
                  <span className="text-sm text-slate-400">{ct.soldCount} sold</span>
                  <span className={`text-sm font-semibold ${
                    ct.trend === 'hot' ? 'text-red-400' :
                    ct.trend === 'cold' ? 'text-blue-400' : 'text-slate-300'
                  }`}>
                    {ct.priceVsBase > 0 ? `${(ct.priceVsBase * 100).toFixed(0)}%` : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Remaining Auction */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              Remaining Auction
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">Available Players</span>
                <span className="text-xl font-bold text-white">{predictions.availableCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">Unsold Players</span>
                <span className="text-xl font-bold text-red-400">{predictions.unsoldCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">Est. Remaining Value</span>
                <span className="text-xl font-bold text-emerald-400">
                  {formatIndianNumber(predictions.estimatedRemainingValue)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                <span className="text-slate-400">Avg Sold Price</span>
                <span className="text-xl font-bold text-amber-400">
                  {formatIndianNumber(predictions.avgSoldPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Teams with Budget */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Award size={18} className="text-emerald-400" />
              Teams with Budget
            </h3>
            <div className="space-y-3">
              {predictions.teamsWithBudget.slice(0, 5).map(team => (
                <div key={team.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{team.short_name}</span>
                    </div>
                  )}
                  <span className="flex-1 text-white font-medium">{team.short_name}</span>
                  <span className="text-emerald-400 font-semibold">
                    {formatIndianNumber(team.remaining_budget)}
                  </span>
                </div>
              ))}
              {predictions.teamsWithBudget.length === 0 && (
                <p className="text-center text-slate-500 py-4">No teams with significant budget remaining</p>
              )}
            </div>
          </div>

          {/* Hot Categories */}
          {predictions.hotCategories.length > 0 && (
            <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-900/20 to-orange-900/20 backdrop-blur-sm p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-red-400" />
                Hot Categories (Expect High Bids)
              </h3>
              <div className="flex flex-wrap gap-2">
                {predictions.hotCategories.map(cat => (
                  <span
                    key={cat.id}
                    className="px-4 py-2 rounded-full bg-red-500/20 text-red-300 font-medium"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
