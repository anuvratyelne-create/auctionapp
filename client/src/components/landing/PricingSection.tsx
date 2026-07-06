import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Users } from 'lucide-react';

const pricingTiers = [
  {
    name: 'Starter',
    teams: '2-6',
    teamsLabel: 'Teams',
    price: 2000,
    popular: false,
    color: 'from-slate-600 to-slate-700',
    borderColor: 'border-slate-700',
  },
  {
    name: 'Standard',
    teams: '8',
    teamsLabel: 'Teams',
    price: 3000,
    popular: false,
    color: 'from-blue-600 to-blue-700',
    borderColor: 'border-blue-500/50',
  },
  {
    name: 'Pro',
    teams: '10',
    teamsLabel: 'Teams',
    price: 4000,
    popular: true,
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/50',
  },
  {
    name: 'Enterprise',
    teams: '12-22',
    teamsLabel: 'Teams',
    price: 5000,
    popular: false,
    color: 'from-purple-600 to-purple-700',
    borderColor: 'border-purple-500/50',
  },
];

const allFeatures = [
  'Unlimited players',
  'Real-time bidding',
  'All 4 broadcast themes',
  'Player self-registration',
  'CSV import/export',
  'Keyboard shortcuts',
  'Live viewer link',
  'No watermarks',
];

export default function PricingSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-24 bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full mb-6">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">Simple Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your <span className="text-amber-400">Plan</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Pay per auction based on team count. All features included in every plan.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-slate-900/80 border ${tier.borderColor} rounded-2xl p-6 backdrop-blur-xl transition-all hover:scale-105 ${
                tier.popular ? 'ring-2 ring-amber-500/50' : ''
              }`}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                </div>
              )}

              {/* Plan name */}
              <div className="text-center mb-6 pt-2">
                <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                <div className={`inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r ${tier.color} rounded-full`}>
                  <Users size={14} className="text-white" />
                  <span className="text-white text-sm font-medium">
                    {tier.teams} {tier.teamsLabel}
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-slate-400 text-lg">₹</span>
                  <span className="text-4xl font-bold text-white">{tier.price.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-slate-500 text-sm mt-1">per auction</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate('/register')}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>

        {/* Features included */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white text-center mb-6">
              All Plans Include
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {allFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check size={12} className="text-green-400" />
                  </div>
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact note */}
        <div className="text-center mt-10">
          <p className="text-slate-500 text-sm">
            Need more than 22 teams? <a href="#contact" className="text-amber-400 hover:underline">Contact us</a> for custom pricing.
          </p>
        </div>
      </div>
    </section>
  );
}
