import { Link } from 'react-router-dom';
import { PublicTournament, SportsType } from '../../types';
import { useCountdown } from '../../hooks/useCountdown';

interface PublicAuctionCardProps {
  tournament: PublicTournament;
  variant?: 'live' | 'upcoming' | 'completed';
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

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function CountdownDisplay({ targetDate, targetTime }: { targetDate?: string; targetTime?: string }) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate, targetTime);

  if (isExpired) {
    return <span className="text-slate-400 text-sm">Starting soon...</span>;
  }

  return (
    <div className="flex gap-2 text-center">
      {days > 0 && (
        <div className="bg-slate-800/50 rounded px-2 py-1">
          <span className="text-amber-400 font-bold text-lg">{days}</span>
          <span className="text-slate-400 text-xs block">days</span>
        </div>
      )}
      <div className="bg-slate-800/50 rounded px-2 py-1">
        <span className="text-amber-400 font-bold text-lg">{hours.toString().padStart(2, '0')}</span>
        <span className="text-slate-400 text-xs block">hrs</span>
      </div>
      <div className="bg-slate-800/50 rounded px-2 py-1">
        <span className="text-amber-400 font-bold text-lg">{minutes.toString().padStart(2, '0')}</span>
        <span className="text-slate-400 text-xs block">min</span>
      </div>
      <div className="bg-slate-800/50 rounded px-2 py-1">
        <span className="text-amber-400 font-bold text-lg">{seconds.toString().padStart(2, '0')}</span>
        <span className="text-slate-400 text-xs block">sec</span>
      </div>
    </div>
  );
}

export default function PublicAuctionCard({ tournament, variant = 'upcoming' }: PublicAuctionCardProps) {
  const isLive = variant === 'live';
  const sportsType = tournament.sports_type || 'other';

  return (
    <div
      className={`
        relative bg-slate-800/30 border rounded-xl overflow-hidden transition-all group
        ${isLive ? 'border-green-500/50 hover:border-green-400/70' : 'border-slate-700/30 hover:border-slate-600/50'}
      `}
    >
      {/* Live badge with pulse */}
      {isLive && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-green-500/20 border border-green-500/50 rounded-full px-2.5 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">Live</span>
        </div>
      )}

      {/* Sports badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className={`bg-gradient-to-r ${sportsColors[sportsType]} bg-opacity-20 rounded-full px-2.5 py-1 flex items-center gap-1.5`}>
          <span className="text-sm">{sportsIcons[sportsType]}</span>
          <span className="text-white text-xs font-medium capitalize">{sportsType}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 pt-12">
        {/* Logo and name */}
        <div className="flex items-center gap-4 mb-4">
          {tournament.logo_url ? (
            <img
              src={tournament.logo_url}
              alt={tournament.name}
              className="w-14 h-14 rounded-lg object-cover bg-slate-700/50"
            />
          ) : (
            <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${sportsColors[sportsType]} flex items-center justify-center`}>
              <span className="text-2xl">{sportsIcons[sportsType]}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg truncate group-hover:text-amber-400 transition-colors">
              {tournament.name}
            </h3>
            {!isLive && tournament.auction_date && (
              <p className="text-slate-400 text-sm">
                {formatDate(tournament.auction_date)}
                {tournament.auction_time && ` at ${formatTime(tournament.auction_time)}`}
              </p>
            )}
          </div>
        </div>

        {/* Countdown for upcoming */}
        {variant === 'upcoming' && tournament.auction_date && (
          <div className="mb-4">
            <CountdownDisplay targetDate={tournament.auction_date} targetTime={tournament.auction_time} />
          </div>
        )}

        {/* Action button */}
        <Link
          to={`/live/${tournament.share_code}`}
          className={`
            block w-full text-center py-2.5 rounded-lg font-medium transition-all
            ${isLive
              ? 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/25'
              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white'
            }
          `}
        >
          {isLive ? 'Watch Now' : variant === 'completed' ? 'View Results' : 'View Details'}
        </Link>
      </div>

      {/* Hover glow effect for live cards */}
      {isLive && (
        <div className="absolute inset-0 bg-gradient-to-t from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
    </div>
  );
}
