import { X, Check, Layout } from 'lucide-react';
import { layoutTemplates, LayoutType } from '../../config/auctionLayouts';
import { useUIStore } from '../../stores/uiStore';

interface LayoutSelectorProps {
  onClose: () => void;
}

const layoutIcons: Record<LayoutType, React.ReactNode> = {
  'classic': <Layout size={28} />,
  'premium-broadcast': <Layout size={28} />,
  'minimal-card': <Layout size={28} />,
  'ipl-style': <Layout size={28} />,
  'fire': <span className="text-2xl">🔥</span>,
  'city': <span className="text-2xl">🌃</span>,
};

export default function LayoutSelector({ onClose }: LayoutSelectorProps) {
  const { selectedLayout, setSelectedLayout } = useUIStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-700/50 shadow-2xl w-full max-w-2xl overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30">
              <Layout className="text-amber-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Choose Layout</h2>
              <p className="text-xs text-slate-400">Select screen arrangement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Layouts Grid */}
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {layoutTemplates.map((layout) => (
              <button
                key={layout.id}
                onClick={() => {
                  setSelectedLayout(layout.id);
                  onClose();
                }}
                className={`relative p-4 rounded-xl border-2 transition-all text-left group ${
                  selectedLayout === layout.id
                    ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
                    : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
              >
                {selectedLayout === layout.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-black" />
                  </div>
                )}

                <div className="flex flex-col items-center text-center gap-2">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      selectedLayout === layout.id
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-700/50 text-slate-300 group-hover:bg-slate-600/50'
                    }`}
                  >
                    {layoutIcons[layout.id]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{layout.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{layout.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
