import { useMemo } from 'react';
import { Lightbulb, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { Team, Player, Category } from '../../types';
import { formatIndianNumber } from '../../utils/formatters';

interface SmartBidSuggestionsProps {
  currentPlayer: Player | null;
  currentBid: number;
  teams: Team[];
  categories: Category[];
  tournamentMinPlayers: number;
}

interface BidSuggestion {
  team: Team;
  recommendedBid: number;
  maxAffordable: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  warnings: string[];
}

export default function SmartBidSuggestions({
  currentPlayer,
  currentBid,
  teams,
  categories,
  tournamentMinPlayers
}: SmartBidSuggestionsProps) {
  const suggestions = useMemo((): BidSuggestion[] => {
    if (!currentPlayer) return [];

    const category = categories.find(c => c.id === currentPlayer.category_id);
    const avgCategoryPrice = category?.avg_sold_price || currentPlayer.base_price;

    return teams.map(team => {
      const remainingSlots = Math.max(0, tournamentMinPlayers - team.player_count);
      const minReserve = remainingSlots * 1000; // Minimum base price reservation
      const maxAffordable = Math.max(0, team.remaining_budget - minReserve);

      const warnings: string[] = [];
      let priority: 'high' | 'medium' | 'low' = 'medium';
      let reasoning = '';

      // Calculate recommended bid
      let recommendedBid = currentBid;

      // Check if team can afford
      if (maxAffordable < currentBid) {
        warnings.push('Cannot afford current bid');
        priority = 'low';
        reasoning = 'Budget insufficient for this player';
      } else {
        // Calculate based on category needs
        const teamCategoryPlayers = team.players?.filter(
          p => p.category_id === currentPlayer.category_id
        ).length || 0;

        if (teamCategoryPlayers === 0 && category) {
          priority = 'high';
          reasoning = `No ${category.name} players yet`;
          recommendedBid = Math.min(avgCategoryPrice * 1.2, maxAffordable);
        } else if (team.player_count < tournamentMinPlayers - 3) {
          priority = 'high';
          reasoning = 'Need more players urgently';
          recommendedBid = Math.min(avgCategoryPrice, maxAffordable);
        } else if (team.remaining_budget > team.max_bid * 1.5) {
          priority = 'medium';
          reasoning = 'Good budget flexibility';
          recommendedBid = Math.min(avgCategoryPrice * 1.1, maxAffordable);
        } else {
          priority = 'low';
          reasoning = 'Conservative approach recommended';
          recommendedBid = Math.min(currentPlayer.base_price * 1.5, maxAffordable);
        }

        // Warnings
        if (team.remaining_budget < team.max_bid * 0.3) {
          warnings.push('Low remaining budget');
        }
        if (remainingSlots > 3) {
          warnings.push(`Still need ${remainingSlots} more players`);
        }
        if (recommendedBid > avgCategoryPrice * 1.5) {
          warnings.push('Above category average');
        }
      }

      return {
        team,
        recommendedBid: Math.max(currentBid, Math.round(recommendedBid / 1000) * 1000),
        maxAffordable,
        reasoning,
        priority,
        warnings
      };
    }).filter(s => s.maxAffordable >= currentBid)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [currentPlayer, currentBid, teams, categories, tournamentMinPlayers]);

  if (!currentPlayer) {
    return null;
  }

  const category = categories.find(c => c.id === currentPlayer.category_id);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Lightbulb size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Smart Bid Suggestions</h3>
              <p className="text-xs text-slate-400">AI-powered recommendations</p>
            </div>
          </div>
        </div>

        {/* Category Context */}
        {category && (
          <div className="px-4 py-3 border-b border-slate-700/30 bg-slate-800/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Category Average:</span>
              <span className="text-emerald-400 font-semibold">
                {formatIndianNumber(category.avg_sold_price || category.base_price)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-400">Sold in Category:</span>
              <span className="text-white">
                {category.sold_players} / {category.total_players}
              </span>
            </div>
          </div>
        )}

        {/* Suggestions List */}
        <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-700/30">
          {suggestions.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              <p>No teams can afford this bid</p>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.team.id}
                className="p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {suggestion.team.logo_url ? (
                      <img
                        src={suggestion.team.logo_url}
                        alt={suggestion.team.name}
                        className="w-10 h-10 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {suggestion.team.short_name}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white">{suggestion.team.short_name}</p>
                      <p className="text-xs text-slate-400">{suggestion.team.player_count} players</p>
                    </div>
                  </div>
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${suggestion.priority === 'high'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : suggestion.priority === 'medium'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-500/20 text-slate-400'}
                  `}>
                    {suggestion.priority === 'high' ? 'Recommended' :
                     suggestion.priority === 'medium' ? 'Possible' : 'Caution'}
                  </div>
                </div>

                {/* Recommendation */}
                <div className="bg-slate-800/50 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Target size={12} />
                      Suggested Bid
                    </span>
                    <span className="font-bold text-emerald-400">
                      {formatIndianNumber(suggestion.recommendedBid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <TrendingUp size={12} />
                      Max Affordable
                    </span>
                    <span className="text-sm text-slate-300">
                      {formatIndianNumber(suggestion.maxAffordable)}
                    </span>
                  </div>
                </div>

                {/* Reasoning */}
                <p className="text-xs text-slate-400 mb-2">{suggestion.reasoning}</p>

                {/* Warnings */}
                {suggestion.warnings.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {suggestion.warnings.map((warning, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs"
                      >
                        <AlertTriangle size={10} />
                        {warning}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
