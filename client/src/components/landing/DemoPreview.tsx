import { Play, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DemoPreview() {
  const navigate = useNavigate();

  return (
    <section id="demo" className="relative py-24 bg-slate-950">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Header */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          See It In
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"> Action</span>
        </h2>
        <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
          Try a live demo auction or watch how easy it is to run your own professional player auction.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/register')}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-amber-500/25"
          >
            <Play size={20} />
            Start Your Free Auction
          </button>
          <button
            onClick={() => window.open('/live/DEMO01', '_blank')}
            className="flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-lg rounded-xl transition-all"
          >
            <ExternalLink size={20} />
            View Live Demo
          </button>
        </div>

        {/* Note */}
        <p className="text-slate-500 text-sm mt-6">
          No signup required to view demo. Full features available after free registration.
        </p>
      </div>
    </section>
  );
}
