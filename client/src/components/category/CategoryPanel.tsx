import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Category } from '../../types';
import { useAuctionStore } from '../../stores/auctionStore';
import { Tag, Users, TrendingUp, Check } from 'lucide-react';

export default function CategoryPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedCategoryId, setSelectedCategory } = useAuctionStore();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories() as Category[];
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
    Platinum: { bg: 'bg-slate-200/10', border: 'border-slate-200', text: 'text-slate-200' },
    Gold: { bg: 'bg-amber-400/10', border: 'border-amber-400', text: 'text-amber-400' },
    Silver: { bg: 'bg-slate-400/10', border: 'border-slate-400', text: 'text-slate-400' },
    Bronze: { bg: 'bg-orange-600/10', border: 'border-orange-600', text: 'text-orange-500' },
  };

  const defaultColors = { bg: 'bg-primary-600/10', border: 'border-primary-600', text: 'text-primary-400' };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Categories</h2>
          <p className="text-slate-400 text-sm">
            Select a category to filter "New Player" in auction
          </p>
        </div>

        {/* All Players Option */}
        <button
          onClick={() => setSelectedCategory(null)}
          className={`w-full mb-4 bg-auction-card border rounded-xl p-6 text-left transition-all ${
            selectedCategoryId === null
              ? 'border-primary-500 ring-2 ring-primary-500/50'
              : 'border-auction-border hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-600/20 rounded-lg flex items-center justify-center">
                <Tag size={24} className="text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">All Categories</h3>
                <p className="text-slate-400 text-sm">
                  Shuffle from all available players
                </p>
              </div>
            </div>
            {selectedCategoryId === null && (
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <Check size={18} className="text-white" />
              </div>
            )}
          </div>
        </button>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => {
            const colors = categoryColors[category.name] || defaultColors;
            const isSelected = selectedCategoryId === category.id;

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`bg-auction-card border rounded-xl p-6 text-left transition-all ${
                  isSelected
                    ? `${colors.border} ring-2 ring-opacity-50`
                    : 'border-auction-border hover:border-slate-600'
                }`}
                style={{
                  borderColor: isSelected ? undefined : undefined,
                  boxShadow: isSelected ? `0 0 20px ${colors.border.replace('border-', '')}20` : undefined,
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                      <Tag size={20} className={colors.text} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${colors.text}`}>
                        {category.name}
                      </h3>
                      <p className="text-slate-500 text-sm">
                        Base: {category.base_price.toLocaleString()} pts
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${colors.bg}`}>
                      <Check size={14} className={colors.text} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
                      <Users size={12} />
                      Total
                    </div>
                    <p className="text-lg font-bold text-white">{category.total_players}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Available</div>
                    <p className="text-lg font-bold text-blue-400">{category.available_players}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">Sold</div>
                    <p className="text-lg font-bold text-green-400">{category.sold_players}</p>
                  </div>
                </div>

                {category.sold_players > 0 && (
                  <div className="mt-4 pt-4 border-t border-auction-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 flex items-center gap-1">
                        <TrendingUp size={14} />
                        Avg. Sold Price
                      </span>
                      <span className="font-semibold text-primary-400">
                        {category.avg_sold_price.toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="bg-auction-card border border-auction-border rounded-xl p-12 text-center">
            <Tag size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No categories created yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Categories are created automatically on registration
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
