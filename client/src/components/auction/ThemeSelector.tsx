import { X, Check, Palette, Zap } from 'lucide-react';
import { auctionTemplates, AuctionTemplate } from '../../config/auctionTemplates';
import { useUIStore } from '../../stores/uiStore';
import AnimatedBackground from './AnimatedBackground';
import { useState } from 'react';

interface ThemeSelectorProps {
  onClose: () => void;
}

export default function ThemeSelector({ onClose }: ThemeSelectorProps) {
  const { selectedThemeId, setSelectedTheme } = useUIStore();
  const [category, setCategory] = useState<'all' | 'animated' | 'stadium' | 'image' | 'minimal'>('all');

  const animatedTemplates = auctionTemplates.filter(t => t.isAnimated);
  const stadiumTemplates = auctionTemplates.filter(t => t.animatedBg && ['stadium-spotlight', 'championship-gold', 'world-cup-night', 'electric-arena'].includes(t.animatedBg));
  const imageTemplates = auctionTemplates.filter(t => t.background && !t.isAnimated);
  const minimalTemplates = auctionTemplates.filter(t => !t.background && !t.isAnimated);

  const filteredTemplates = category === 'all'
    ? auctionTemplates
    : category === 'animated'
    ? animatedTemplates
    : category === 'stadium'
    ? stadiumTemplates
    : category === 'image'
    ? imageTemplates
    : minimalTemplates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-700/50 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/10 border border-purple-500/30">
              <Palette className="text-purple-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Choose Theme</h2>
              <p className="text-sm text-slate-400">Background wallpapers and accent colors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all"
          >
            <X size={22} />
          </button>
        </div>

        {/* Category Filter */}
        <div className="px-8 py-4 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'all', label: 'All Themes', count: auctionTemplates.length },
              { key: 'animated', label: 'Animated', count: animatedTemplates.length },
              { key: 'stadium', label: 'Stadium', count: stadiumTemplates.length },
              { key: 'image', label: 'Image', count: imageTemplates.length },
              { key: 'minimal', label: 'Minimal', count: minimalTemplates.length },
            ] as const).map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  category === cat.key
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                {cat.label}
                <span className="ml-2 opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Themes Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <ThemeCard
                key={template.id}
                template={template}
                isSelected={selectedThemeId === template.id}
                onSelect={() => {
                  setSelectedTheme(template.id);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ThemeCardProps {
  template: AuctionTemplate;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeCard({ template, isSelected, onSelect }: ThemeCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-2xl overflow-hidden border-2 transition-all aspect-video group ${
        isSelected
          ? 'border-purple-500 ring-4 ring-purple-500/20 scale-[1.02]'
          : 'border-slate-700/50 hover:border-slate-500 hover:scale-[1.02]'
      }`}
    >
      {/* Background Preview */}
      {template.animatedBg ? (
        <div className="w-full h-full bg-slate-950 relative overflow-hidden">
          <AnimatedBackground
            type={template.animatedBg}
            accentColor={template.accentColor}
            intensity="low"
          />
        </div>
      ) : template.background ? (
        <img
          src={template.background}
          alt={template.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full"
          style={{ background: `linear-gradient(135deg, #0f172a, #1e293b)` }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full opacity-30"
            style={{ background: template.accentColor, filter: 'blur(20px)' }}
          />
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* LIVE Badge */}
      {template.isAnimated && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-600 rounded-lg shadow-lg">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase">Live</span>
        </div>
      )}

      {/* Selected Check */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
          <Check size={16} className="text-white" />
        </div>
      )}

      {/* Theme Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border-2 border-white/30 flex-shrink-0"
            style={{ background: template.accentColor }}
          />
          <p className="text-white font-semibold text-sm truncate">{template.name}</p>
          {template.isAnimated && <Zap size={12} className="text-amber-400 flex-shrink-0" />}
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
