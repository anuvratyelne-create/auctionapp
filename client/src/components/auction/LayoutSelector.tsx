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
};

export default function LayoutSelector({ onClose }: LayoutSelectorProps) {
  const { selectedLayout, setSelectedLayout } = useUIStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-700/50 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30">
              <Layout className="text-amber-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Layout</h2>
              <p className="text-sm text-slate-400">Screen arrangement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all"
          >
            <X size={22} />
          </button>
        </div>

        {/* Layouts Grid - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 gap-4">
            {layoutTemplates.map((layout) => (
              <button
                key={layout.id}
                onClick={() => {
                  setSelectedLayout(layout.id);
                  onClose();
                }}
                className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                  selectedLayout === layout.id
                    ? 'border-amber-500 bg-amber-500/10 ring-4 ring-amber-500/20'
                    : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
              >
                {selectedLayout === layout.id && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                    <Check size={18} className="text-black" />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      selectedLayout === layout.id
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {layoutIcons[layout.id]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{layout.name}</h3>
                    <p className="text-sm text-slate-400">{layout.description}</p>
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
