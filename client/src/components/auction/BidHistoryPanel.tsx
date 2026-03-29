import { useAuctionStore } from '../../stores/auctionStore';
import { formatIndianNumber } from '../../utils/formatters';
import { History, TrendingUp, Users } from 'lucide-react';

interface BidHistoryPanelProps {
  teams: Array<{
    id: string;
    name: string;
    short_name: string;
    logo_url?: string;
  }>;
}

export default function BidHistoryPanel({ teams }: BidHistoryPanelProps) {
  const { bidHistory, currentPlayer, currentBid } = useAuctionStore();

  const getTeamInfo = (teamId: string) => {
    return teams.find(t => t.id === teamId);
  };

  const formatTimestamp = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  if (!currentPlayer) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
        <div className="p-6 text-center text-slate-400">
          <History size={48} className="mx-auto mb-3 opacity-50" />
          <p>No player in auction</p>
          <p className="text-sm mt-1">Bid history will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                <History size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Bid History</h3>
                <p className="text-xs text-slate-400">{currentPlayer.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Bids</p>
              <p className="text-lg font-bold text-white">{bidHistory.length}</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {bidHistory.length > 0 && (
          <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-700/50 bg-slate-800/30">
            <div className="text-center">
              <p className="text-xs text-slate-400">Base Price</p>
              <p className="font-semibold text-slate-300">
                {formatIndianNumber(currentPlayer.base_price)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Current Bid</p>
              <p className="font-semibold text-emerald-400">
                {formatIndianNumber(currentBid)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Increment</p>
              <p className="font-semibold text-amber-400">
                {formatIndianNumber(currentBid - currentPlayer.base_price)}
              </p>
            </div>
          </div>
        )}

        {/* Bid Timeline */}
        <div className="max-h-[300px] overflow-y-auto">
          {bidHistory.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No bids yet</p>
              <p className="text-xs mt-1">Waiting for teams to bid...</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {[...bidHistory].reverse().map((bid, index) => {
                const team = getTeamInfo(bid.teamId);
                const isLatest = index === 0;
                const bidNumber = bidHistory.length - index;

                return (
                  <div
                    key={`${bid.teamId}-${bid.amount}-${index}`}
                    className={`p-4 flex items-center gap-4 transition-colors ${
                      isLatest ? 'bg-emerald-500/10' : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Bid Number */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${isLatest
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                        : 'bg-slate-700/50 text-slate-400'}
                    `}>
                      {bidNumber}
                    </div>

                    {/* Team Info */}
                    <div className="flex items-center gap-3 flex-1">
                      {team?.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-10 h-10 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {team?.short_name || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">
                          {team?.name || 'Unknown Team'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatTimestamp(bid.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* Bid Amount */}
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isLatest ? 'text-emerald-400' : 'text-white'}`}>
                        {formatIndianNumber(bid.amount)}
                      </p>
                      {index < bidHistory.length - 1 && (
                        <p className="text-xs text-slate-500">
                          +{formatIndianNumber(bid.amount - bidHistory[bidHistory.length - index - 2].amount)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        {bidHistory.length > 1 && (
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                <Users size={14} className="inline mr-1" />
                {new Set(bidHistory.map(b => b.teamId)).size} teams participated
              </span>
              <span className="text-slate-400">
                {((currentBid / currentPlayer.base_price) * 100 - 100).toFixed(0)}% above base
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
