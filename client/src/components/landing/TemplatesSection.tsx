import { useState } from 'react';
import { Palette, Sparkles, Flame, Building2, Crown, X, ZoomIn } from 'lucide-react';

const templates = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean and professional look perfect for corporate tournaments',
    icon: Crown,
    gradient: 'from-slate-600 to-slate-800',
    accent: 'amber',
    colors: ['#1e293b', '#334155', '#f59e0b'],
    screenshot: '/images/themes/classic.png',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Elegant gold accents for a luxurious auction experience',
    icon: Sparkles,
    gradient: 'from-amber-600 to-yellow-700',
    accent: 'yellow',
    colors: ['#78350f', '#fbbf24', '#fef3c7'],
    screenshot: '/images/themes/premium.png',
  },
  {
    id: 'fire',
    name: 'Fire',
    description: 'Bold and energetic theme for high-intensity auctions',
    icon: Flame,
    gradient: 'from-red-600 to-orange-600',
    accent: 'red',
    colors: ['#7f1d1d', '#dc2626', '#f97316'],
    screenshot: '/images/themes/fire.png',
  },
  {
    id: 'city',
    name: 'City',
    description: 'Modern urban aesthetics with cool blue tones',
    icon: Building2,
    gradient: 'from-blue-600 to-cyan-600',
    accent: 'blue',
    colors: ['#1e3a5f', '#0ea5e9', '#22d3ee'],
    screenshot: '/images/themes/city.png',
  },
];

export default function TemplatesSection() {
  const [activeTemplate, setActiveTemplate] = useState('classic');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const active = templates.find((t) => t.id === activeTemplate) || templates[0];

  return (
    <>
      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} className="text-white" />
          </button>

          {/* Theme name */}
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${active.gradient} flex items-center justify-center`}>
              <active.icon size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{active.name} Theme</h3>
              <p className="text-slate-400 text-sm">Click anywhere to close</p>
            </div>
          </div>

          {/* Full size image */}
          <img
            src={active.screenshot}
            alt={`${active.name} theme full preview`}
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navigation dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTemplate(template.id);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  activeTemplate === template.id
                    ? 'bg-amber-400 scale-125'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    <section id="templates" className="relative py-24 bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full mb-6">
            <Palette size={16} className="text-purple-400" />
            <span className="text-purple-400 text-sm font-medium">Broadcast Themes</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            4 Stunning <span className="text-amber-400">Templates</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Choose the perfect look for your auction broadcast. All themes included free.
          </p>
        </div>

        {/* Template Preview */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Preview Card */}
          <div className="order-2 lg:order-1">
            <div className="relative">
              {/* Glow effect */}
              <div className={`absolute -inset-4 bg-gradient-to-r ${active.gradient} opacity-20 rounded-3xl blur-2xl transition-all duration-500`} />

              {/* Preview Frame */}
              <div className="relative bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden">
                {/* Browser header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-slate-500 text-sm">Broadcast Overlay - {active.name} Theme</span>
                  </div>
                </div>

                {/* Theme Screenshot */}
                <div
                  className="relative aspect-video overflow-hidden cursor-pointer group"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={active.screenshot}
                    alt={`${active.name} theme preview`}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                    onError={(e) => {
                      // Fallback to gradient if image not found
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.classList.add('bg-gradient-to-br', active.gradient.split(' ')[0], active.gradient.split(' ')[1]);
                    }}
                  />
                  {/* Hover overlay with zoom icon */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 backdrop-blur-sm rounded-full p-4">
                      <ZoomIn size={32} className="text-white" />
                    </div>
                  </div>
                  {/* Overlay for loading state / fallback */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${active.gradient} opacity-0 -z-10`} />
                </div>
              </div>
            </div>

            {/* Color palette */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className="text-slate-500 text-sm">Color Palette:</span>
              <div className="flex gap-2">
                {active.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border-2 border-slate-700"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Template Selector */}
          <div className="order-1 lg:order-2 space-y-4">
            {templates.map((template) => {
              const Icon = template.icon;
              const isActive = activeTemplate === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => setActiveTemplate(template.id)}
                  className={`w-full p-5 rounded-xl border transition-all text-left ${
                    isActive
                      ? 'bg-slate-800/80 border-amber-500/50'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.gradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold text-lg">{template.name}</h3>
                        {isActive && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">{template.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}

            <p className="text-slate-500 text-sm text-center pt-4">
              All themes are fully customizable with your tournament logo and branding.
            </p>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
