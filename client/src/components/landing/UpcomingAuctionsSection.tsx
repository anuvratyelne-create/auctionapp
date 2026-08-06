import { PublicTournament, SportsType } from '../../types';
import PublicAuctionCard from './PublicAuctionCard';
import { useCountdown } from '../../hooks/useCountdown';
import { Link } from 'react-router-dom';

interface UpcomingAuctionsSectionProps {
  auctions: PublicTournament[];
  loading?: boolean;
}

const sportsIcons: Record<SportsType, string> = {
  cricket: '🏏',
  football: '⚽',
  kabaddi: '🤼',
  basketball: '🏀',
  other: '🎯',
};

const sportsColors: Record<SportsType, string> = {
  cricket: 'from-green-500 to-emerald-500',
  football: 'from-blue-500 to-cyan-500',
  kabaddi: 'from-orange-500 to-red-500',
  basketball: 'from-amber-500 to-orange-500',
  other: 'from-purple-500 to-pink-500',
};

function FeaturedAuction({ auction }: { auction: PublicTournament }) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(auction.auction_date, auction.auction_time);
  const sportsType = auction.sports_type || 'other';

  return (
    <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-amber-500/30 rounded-2xl overflow-hidden">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none" />

      <div className="relative p-8 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
          {/* Left side - Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className={`bg-gradient-to-r ${sportsColors[sportsType]} rounded-full px-3 py-1 flex items-center gap-1.5`}>
                <span className="text-lg">{sportsIcons[sportsType]}</span>
                <span className="text-white text-sm font-medium capitalize">{sportsType}</span>
              </span>
              <span className="text-amber-400 text-sm font-semibold uppercase tracking-wider">Next Auction</span>
            </div>

            <div className="flex items-center gap-5 mb-4">
              {auction.logo_url ? (
                <img
                  src={auction.logo_url}
                  alt={auction.name}
                  className="w-20 h-20 rounded-xl object-cover bg-slate-700/50"
                />
              ) : (
                <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${sportsColors[sportsType]} flex items-center justify-center`}>
                  <span className="text-4xl">{sportsIcons[sportsType]}</span>
                </div>
              )}
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">{auction.name}</h3>
                <p className="text-slate-400">
                  {auction.auction_date && new Date(auction.auction_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {auction.auction_time && ` at ${auction.auction_time}`}
                </p>
              </div>
            </div>

            <Link
              to={`/live/${auction.share_code}`}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Set Reminder
            </Link>
          </div>

          {/* Right side - Countdown */}
          <div className="lg:text-right">
            <p className="text-slate-400 text-sm mb-3 uppercase tracking-wider">Starts In</p>
            {isExpired ? (
              <p className="text-2xl text-amber-400 font-bold">Starting Soon...</p>
            ) : (
              <div className="flex gap-3 lg:justify-end">
                {days > 0 && (
                  <div className="bg-slate-800/70 rounded-xl px-4 py-3 min-w-[70px]">
                    <span className="text-amber-400 font-bold text-3xl block">{days}</span>
                    <span className="text-slate-400 text-xs uppercase tracking-wider">Days</span>
                  </div>
                )}
                <div className="bg-slate-800/70 rounded-xl px-4 py-3 min-w-[70px]">
                  <span className="text-amber-400 font-bold text-3xl block">{hours.toString().padStart(2, '0')}</span>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Hours</span>
                </div>
                <div className="bg-slate-800/70 rounded-xl px-4 py-3 min-w-[70px]">
                  <span className="text-amber-400 font-bold text-3xl block">{minutes.toString().padStart(2, '0')}</span>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Mins</span>
                </div>
                <div className="bg-slate-800/70 rounded-xl px-4 py-3 min-w-[70px]">
                  <span className="text-amber-400 font-bold text-3xl block">{seconds.toString().padStart(2, '0')}</span>
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Secs</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UpcomingAuctionsSection({ auctions, loading }: UpcomingAuctionsSectionProps) {
  // Don't render section if no upcoming auctions
  if (!loading && auctions.length === 0) {
    return null;
  }

  const featuredAuction = auctions[0];
  const remainingAuctions = auctions.slice(1, 7); // Show up to 6 more

  return (
    <section className="relative py-16 bg-slate-900/50 border-y border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 mb-4">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-amber-400 text-sm font-semibold uppercase tracking-wider">Coming Soon</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Upcoming Auctions
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Mark your calendars for these exciting upcoming auctions. Set a reminder to never miss the action.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-6">
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl h-56 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800/30 border border-slate-700/30 rounded-xl h-48 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Featured auction */}
        {!loading && featuredAuction && (
          <div className="mb-10">
            <FeaturedAuction auction={featuredAuction} />
          </div>
        )}

        {/* Remaining auctions grid */}
        {!loading && remainingAuctions.length > 0 && (
          <>
            <h3 className="text-xl font-semibold text-white mb-6">More Upcoming Auctions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remainingAuctions.map((auction) => (
                <PublicAuctionCard key={auction.id} tournament={auction} variant="upcoming" />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
