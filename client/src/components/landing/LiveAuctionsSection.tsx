import { PublicTournament } from '../../types';
import PublicAuctionCard from './PublicAuctionCard';

interface LiveAuctionsSectionProps {
  auctions: PublicTournament[];
  loading?: boolean;
}

export default function LiveAuctionsSection({ auctions, loading }: LiveAuctionsSectionProps) {
  // Don't render section if no live auctions
  if (!loading && auctions.length === 0) {
    return null;
  }

  return (
    <section className="relative py-16 bg-slate-950">
      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-sm font-semibold uppercase tracking-wider">Live Now</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Live Auctions
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Watch exciting auctions happening right now. Click to join and see the bidding action live.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800/30 border border-slate-700/30 rounded-xl h-52 animate-pulse" />
            ))}
          </div>
        )}

        {/* Auctions grid */}
        {!loading && auctions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <PublicAuctionCard key={auction.id} tournament={auction} variant="live" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
