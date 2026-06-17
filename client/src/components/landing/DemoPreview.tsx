import { Play, Monitor, Smartphone, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DemoPreview() {
  const navigate = useNavigate();

  return (
    <section id="demo" className="relative py-24 bg-slate-950">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            See It In
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"> Action</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Watch how easy it is to run a professional player auction
          </p>
        </div>

        {/* Demo container */}
        <div className="max-w-5xl mx-auto">
          {/* Browser frame */}
          <div className="relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl shadow-black/50">
            {/* Browser header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 px-4 py-1 bg-slate-900/50 rounded-lg">
                  <Monitor size={14} className="text-slate-500" />
                  <span className="text-slate-400 text-sm">auctionapp.live/demo</span>
                </div>
              </div>
            </div>

            {/* Content area - placeholder for demo */}
            <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center group cursor-pointer"
              onClick={() => navigate('/register')}
            >
              {/* Mockup preview */}
              <div className="absolute inset-0 p-8 opacity-30">
                <div className="h-full border border-slate-700/50 rounded-xl flex">
                  {/* Left panel mock */}
                  <div className="w-1/3 border-r border-slate-700/50 p-4">
                    <div className="h-4 w-24 bg-slate-700 rounded mb-4" />
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-slate-700/50 rounded-lg" />
                      ))}
                    </div>
                  </div>
                  {/* Main content mock */}
                  <div className="flex-1 p-4">
                    <div className="h-32 bg-slate-700/50 rounded-xl mb-4" />
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-700/30 rounded-lg" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Play button overlay */}
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                  <Play size={36} className="text-white ml-1" fill="white" />
                </div>
                <span className="text-white font-semibold">Try Live Demo</span>
                <span className="text-slate-400 text-sm">No signup required</span>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Demo options */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl transition-all"
            >
              <Play size={18} />
              Start Your Own Auction
            </button>
            <button
              onClick={() => window.open('/overlay/DEMO01', '_blank')}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold rounded-xl transition-all"
            >
              <ExternalLink size={18} />
              View Broadcast Overlay
            </button>
          </div>

          {/* Device compatibility note */}
          <div className="flex items-center justify-center gap-6 mt-8 text-slate-500 text-sm">
            <div className="flex items-center gap-2">
              <Monitor size={16} />
              <span>Desktop</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone size={16} />
              <span>Tablet</span>
            </div>
            <span className="text-slate-600">•</span>
            <span>Works on all modern browsers</span>
          </div>
        </div>
      </div>
    </section>
  );
}
