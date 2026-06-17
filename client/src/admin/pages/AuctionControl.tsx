import { useEffect, useState } from 'react';
import {
  Gavel,
  Users,
  Timer,
  StopCircle,
  RotateCcw,
  Loader2,
  ExternalLink,
  RefreshCw,
  Play,
  Pause,
  User
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../utils/adminApi';

interface ActiveAuction {
  tournament: {
    id: string;
    name: string;
    share_code: string;
    status: string;
    owner?: { id: string; name: string; email: string };
  };
  auctionState: {
    status: string;
    currentPlayer?: { id: string; name: string; base_price: number };
    currentBid: number;
    currentTeam?: { id: string; name: string; short_name: string };
    timerRunning: boolean;
  };
}

function ActiveAuctionCard({
  auction,
  onForceStop,
  onUndoSale,
  onRefresh
}: {
  auction: ActiveAuction;
  onForceStop: () => void;
  onUndoSale: () => void;
  onRefresh: () => void;
}) {
  const { tournament, auctionState } = auction;
  const hasCurrentPlayer = auctionState.status === 'bidding' && auctionState.currentPlayer;

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Gavel className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{tournament.name}</h3>
            <p className="text-xs text-slate-500 font-mono">{tournament.share_code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <a
            href={`/live/${tournament.share_code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Open Live View"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Current Auction State */}
      <div className="p-4">
        {hasCurrentPlayer ? (
          <div className="space-y-4">
            {/* Current Player */}
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
              <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center">
                <User className="w-7 h-7 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-lg">{auctionState.currentPlayer?.name}</p>
                <p className="text-sm text-slate-400">
                  Base: {auctionState.currentPlayer?.base_price.toLocaleString()}
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 ${
                auctionState.timerRunning
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {auctionState.timerRunning ? <Play size={14} /> : <Pause size={14} />}
                <span className="text-sm font-medium">
                  {auctionState.timerRunning ? 'Live' : 'Paused'}
                </span>
              </div>
            </div>

            {/* Current Bid */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-rose-500/10 to-red-500/5 rounded-xl border border-rose-500/20">
              <div>
                <p className="text-sm text-slate-400">Current Bid</p>
                <p className="text-3xl font-bold text-rose-400">
                  {auctionState.currentBid.toLocaleString()}
                </p>
              </div>
              {auctionState.currentTeam && (
                <div className="text-right">
                  <p className="text-sm text-slate-400">Bidding Team</p>
                  <p className="text-lg font-semibold text-white">{auctionState.currentTeam.name}</p>
                  <p className="text-sm text-slate-500">{auctionState.currentTeam.short_name}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onForceStop}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
              >
                <StopCircle size={18} />
                Force Stop Auction
              </button>
              <button
                onClick={onUndoSale}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors"
              >
                <RotateCcw size={18} />
                Undo Last Sale
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Timer className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No active bidding</p>
            <p className="text-sm text-slate-500 mt-1">Waiting for next player...</p>
            <button
              onClick={onUndoSale}
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg mx-auto transition-colors"
            >
              <RotateCcw size={16} />
              Undo Last Sale
            </button>
          </div>
        )}
      </div>

      {/* Owner Info */}
      {tournament.owner && (
        <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-800 flex items-center gap-2 text-sm">
          <Users size={14} className="text-slate-500" />
          <span className="text-slate-400">Owner:</span>
          <span className="text-slate-300">{tournament.owner.name}</span>
          <span className="text-slate-500">({tournament.owner.email})</span>
        </div>
      )}
    </div>
  );
}

export default function AuctionControl() {
  const [auctions, setAuctions] = useState<ActiveAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAuctions = async () => {
    try {
      const data = await adminApi.getActiveAuctions();
      setAuctions(data);
    } catch (error) {
      console.error('Failed to load active auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();

    // Refresh every 10 seconds
    const interval = setInterval(loadAuctions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleForceStop = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to force stop this auction? The current player will be reset to available.')) {
      return;
    }

    setActionLoading(tournamentId);
    try {
      await adminApi.forceStopAuction(tournamentId);
      await loadAuctions();
    } catch (error) {
      console.error('Failed to force stop auction:', error);
      alert('Failed to force stop auction');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndoSale = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to undo the last sale? The player will be reset to available.')) {
      return;
    }

    setActionLoading(tournamentId);
    try {
      const result = await adminApi.undoSale(tournamentId);
      alert(`Undid sale of ${(result as any).player?.name || 'player'}`);
      await loadAuctions();
    } catch (error: any) {
      alert(error.message || 'Failed to undo sale');
    } finally {
      setActionLoading(null);
    }
  };

  const refreshAuction = async (tournamentId: string) => {
    try {
      const state = await adminApi.getAuctionState(tournamentId);
      setAuctions(prev => prev.map(a =>
        a.tournament.id === tournamentId
          ? { ...a, auctionState: state }
          : a
      ));
    } catch (error) {
      console.error('Failed to refresh auction state:', error);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Auction Control</h2>
          <p className="text-slate-400 mt-1">Monitor and control all active auctions in real-time</p>
        </div>
        <button
          onClick={loadAuctions}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw size={18} />
          Refresh All
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        </div>
      ) : auctions.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-12 text-center">
          <Gavel className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Active Auctions</h3>
          <p className="text-slate-400">There are no live auctions running at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {auctions.map(auction => (
            <div key={auction.tournament.id} className="relative">
              {actionLoading === auction.tournament.id && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                </div>
              )}
              <ActiveAuctionCard
                auction={auction}
                onForceStop={() => handleForceStop(auction.tournament.id)}
                onUndoSale={() => handleUndoSale(auction.tournament.id)}
                onRefresh={() => refreshAuction(auction.tournament.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {auctions.length > 0 && (
        <div className="mt-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-400">
                {auctions.filter(a => a.auctionState.timerRunning).length} actively bidding
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-slate-400">
                {auctions.filter(a => !a.auctionState.timerRunning).length} paused/idle
              </span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
