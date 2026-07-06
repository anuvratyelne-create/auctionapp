import { Sparkles, Zap, PartyPopper, Palette, Volume2, Shuffle, Crown } from 'lucide-react';

const uniqueFeatures = [
  {
    icon: Zap,
    title: 'Animated Player Entry',
    description: 'Players enter the auction stage with stunning animations. Create excitement before every bid starts.',
    gradient: 'from-amber-500 to-orange-500',
    tag: 'Exclusive',
  },
  {
    icon: PartyPopper,
    title: 'Animated Sold Celebrations',
    description: 'Fireworks, confetti, and celebratory effects when a player is sold. Makes every sale memorable.',
    gradient: 'from-pink-500 to-purple-500',
    tag: 'Exclusive',
  },
  {
    icon: Palette,
    title: '4 Premium Themes',
    description: 'Classic, Premium, Fire & City themes. Professional broadcast-ready overlays for live streaming.',
    gradient: 'from-blue-500 to-cyan-500',
    tag: 'Included',
  },
  {
    icon: Volume2,
    title: 'Sound Effects',
    description: 'Bid sounds, sold announcements, and background music. Full audio experience for your auction.',
    gradient: 'from-green-500 to-emerald-500',
    tag: 'Included',
  },
  {
    icon: Shuffle,
    title: 'Fortune Wheel',
    description: 'Random player selection with spinning wheel animation. Adds drama and fairness to player picks.',
    gradient: 'from-violet-500 to-purple-500',
    tag: 'Exclusive',
  },
  {
    icon: Crown,
    title: 'IPL-Style Experience',
    description: 'Professional auction interface inspired by IPL mega auctions. Run auctions like the pros.',
    gradient: 'from-yellow-500 to-amber-500',
    tag: 'Premium',
  },
];

export default function UniqueFeatures() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full mb-6">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-purple-400 text-sm font-medium">What Makes Us Different</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Features <span className="text-amber-400">No One Else</span> Has
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            We've built features that turn a simple auction into an unforgettable experience.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all hover:bg-slate-900/80"
              >
                {/* Tag */}
                <div className="absolute top-4 right-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    feature.tag === 'Exclusive'
                      ? 'bg-amber-500/20 text-amber-400'
                      : feature.tag === 'Premium'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {feature.tag}
                  </span>
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={28} className="text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-slate-400 mb-4">
            All these features come <span className="text-amber-400 font-semibold">included</span> with every plan.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-slate-300 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            No extra charges for animations or themes
          </div>
        </div>
      </div>
    </section>
  );
}
