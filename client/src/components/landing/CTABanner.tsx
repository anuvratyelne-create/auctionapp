import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

export default function CTABanner() {
  const navigate = useNavigate();

  const benefits = [
    'Free to start',
    'No credit card required',
    'Setup in minutes',
    'Unlimited players'
  ];

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Stadium lights background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        {/* Light beams */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent" />
        <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-orange-500/20 via-orange-500/5 to-transparent" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-transparent" />

        {/* Glowing orbs */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-amber-500/30 rounded-full blur-[60px]" />
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-orange-500/30 rounded-full blur-[60px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/40 rounded-full blur-[80px]" />

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full mb-8">
          <Sparkles size={16} className="text-amber-400" />
          <span className="text-amber-400 text-sm font-medium">Join 500+ successful auctions</span>
        </div>

        {/* Headline */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Ready to Run Your
          <span className="block bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
            Professional Auction?
          </span>
        </h2>

        {/* Subheadline */}
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Join thousands of tournament organizers who trust our platform for their player auctions.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/register')}
          className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xl rounded-2xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105"
        >
          Get Started Free
          <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Benefits */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-slate-300">
              <CheckCircle size={18} className="text-green-400" />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
