import { PlusCircle, Users, Play, Gavel, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: PlusCircle,
    title: 'Create Tournament',
    description: 'Set up your auction with budget limits, player requirements, and team configurations.',
    color: 'from-amber-500 to-orange-500'
  },
  {
    number: '02',
    icon: Users,
    title: 'Add Teams & Players',
    description: 'Import players via CSV or add manually. Create teams with logos and budgets.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    number: '03',
    icon: Play,
    title: 'Go Live',
    description: 'Start your broadcast with professional overlays. Share the viewer link with audience.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    number: '04',
    icon: Gavel,
    title: 'Run Auction',
    description: 'Conduct real-time bidding with instant updates. Export results when complete.',
    color: 'from-purple-500 to-pink-500'
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 bg-slate-900/50">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Get Started in
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"> Minutes</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Four simple steps to run your professional player auction
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full z-0">
                  <div className="flex items-center justify-center px-4">
                    <div className="h-[2px] w-full bg-gradient-to-r from-slate-700 to-transparent" />
                    <ArrowRight size={20} className="text-slate-600 -ml-2" />
                  </div>
                </div>
              )}

              {/* Step card */}
              <div className="relative bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 rounded-2xl p-6 transition-all group">
                {/* Step number */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center">
                  <span className="text-amber-400 font-bold text-sm">{step.number}</span>
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <step.icon size={28} className="text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Time indicator */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Average setup time: Under 10 minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
}
