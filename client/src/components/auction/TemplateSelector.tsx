import { X, Check, Palette, Zap } from 'lucide-react';
import { auctionTemplates, AuctionTemplate } from '../../config/auctionTemplates';
import { useUIStore } from '../../stores/uiStore';
import AnimatedBackground from './AnimatedBackground';

interface TemplateSelectorProps {
  onClose: () => void;
}

export default function TemplateSelector({ onClose }: TemplateSelectorProps) {
  const { selectedTemplateId, setSelectedTemplate } = useUIStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center gap-3">
            <Palette className="text-amber-500" size={24} />
            <h2 className="text-xl font-bold text-white">Choose Auction Template</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {auctionTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => setSelectedTemplate(template.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: AuctionTemplate;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-video group ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-500/30'
          : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      {/* Background Preview */}
      {template.animatedBg ? (
        // Animated background preview
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
        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* LIVE Badge for animated templates */}
      {template.isAnimated && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-red-600 rounded-full">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-white uppercase">Live</span>
        </div>
      )}

      {/* Selected Check */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
          <Check size={14} className="text-black" />
        </div>
      )}

      {/* Template Name */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2">
          {template.isAnimated && <Zap size={12} className="text-amber-400" />}
          <p className="text-white font-semibold text-sm">{template.name}</p>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
