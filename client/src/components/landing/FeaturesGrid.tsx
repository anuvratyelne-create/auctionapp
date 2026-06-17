import {
  Gavel,
  Monitor,
  Users,
  FolderKanban,
  Database,
  FileSpreadsheet,
  Keyboard,
  Timer,
  Palette
} from 'lucide-react';

const features = [
  {
    icon: Gavel,
    title: 'Live Auction Panel',
    description: 'Real-time bidding with instant updates. Control your auction with an intuitive interface designed for speed.',
    color: 'from-amber-500 to-orange-500',
    highlights: ['Real-time sync', 'Keyboard shortcuts', 'Undo support']
  },
  {
    icon: Monitor,
    title: 'Broadcast Overlays',
    description: 'Professional OBS-ready overlays with 4 premium themes. Perfect for live streaming your auction.',
    color: 'from-purple-500 to-pink-500',
    highlights: ['4 premium themes', 'OBS compatible', 'Custom branding']
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Track budgets, player limits, and squad composition in real-time. Never exceed limits.',
    color: 'from-blue-500 to-cyan-500',
    highlights: ['Budget tracking', 'Player limits', 'Squad view']
  },
  {
    icon: FolderKanban,
    title: 'Multi-Tournament',
    description: 'Manage multiple auctions from a single account. Perfect for organizers running regular events.',
    color: 'from-green-500 to-emerald-500',
    highlights: ['Unlimited auctions', 'Quick switch', 'Separate data']
  },
  {
    icon: Database,
    title: 'Player Database',
    description: 'Import players via CSV with categories, base prices, and photos. Bulk operations made easy.',
    color: 'from-red-500 to-rose-500',
    highlights: ['CSV import', 'Categories', 'Player photos']
  },
  {
    icon: FileSpreadsheet,
    title: 'Export & Analytics',
    description: 'Export results to CSV/PDF. View bid history, team stats, and auction analytics.',
    color: 'from-indigo-500 to-violet-500',
    highlights: ['CSV/PDF export', 'Bid history', 'Team stats']
  }
];

const quickFeatures = [
  { icon: Keyboard, text: 'Keyboard shortcuts for fast bidding' },
  { icon: Timer, text: 'Built-in countdown timer' },
  { icon: Palette, text: 'Customizable themes & branding' },
];

export default function FeaturesGrid() {
  return (
    <section className="relative py-24 bg-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything You Need to Run
            <span className="block bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Professional Auctions
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Powerful features designed for tournament organizers. From small local events to large-scale professional auctions.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/50 hover:border-slate-700/50 rounded-2xl p-6 transition-all duration-300"
            >
              {/* Gradient glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`} />

              {/* Icon */}
              <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon size={24} className="text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm mb-4">{feature.description}</p>

              {/* Highlights */}
              <div className="flex flex-wrap gap-2">
                {feature.highlights.map((highlight) => (
                  <span
                    key={highlight}
                    className="px-2 py-1 bg-slate-800/50 text-slate-400 text-xs rounded-md"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick features bar */}
        <div className="flex flex-wrap justify-center gap-6">
          {quickFeatures.map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-slate-400">
              <item.icon size={18} className="text-amber-400" />
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
