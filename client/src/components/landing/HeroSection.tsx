import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, Zap, Users } from 'lucide-react';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

        {/* Stadium light effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-green-500/15 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-orange-500/10 rounded-full blur-[80px] animate-pulse delay-500" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 w-full">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-10">
            <img
              src="/logo.png"
              alt="Game Auction"
              className="w-auto mx-auto object-contain"
              style={{ height: '25rem', filter: 'drop-shadow(0 0 60px rgba(6, 182, 212, 0.6))' }}
            />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full mb-6">
            <Zap size={16} className="text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">Now Live for Tournament Organizers</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Run Professional
            <span className="block bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Player Auctions
            </span>
            Like the Pros
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Real-time bidding, stunning broadcast overlays, and complete team management.
            Everything you need for cricket, football & kabaddi player auctions.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
            >
              Start Free Auction
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-lg rounded-xl transition-all"
            >
              <Play size={20} className="text-amber-400" />
              Watch Demo
            </button>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-6 mt-10 justify-center">
            <div className="flex items-center gap-2 text-slate-400">
              <div className="flex -space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-slate-900 flex items-center justify-center">
                    <Users size={14} className="text-slate-400" />
                  </div>
                ))}
              </div>
              <span className="text-sm">150+ Players Auctioned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-slate-500 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}
