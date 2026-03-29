import { useState } from 'react';
import { Shield, Check, X, AlertCircle } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { Team, Player } from '../../types';
import { formatIndianNumber } from '../../utils/formatters';

interface RTMPanelProps {
  tournamentId: string;
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  rtmEnabled: boolean;
  rtmTeam: Team | null;
  previousTeam?: Team | null; // The team that previously had the player
  onClose: () => void;
}

export default function RTMPanel({
  tournamentId,
  currentPlayer,
  currentBid,
  currentTeam,
  rtmEnabled,
  rtmTeam,
  previousTeam,
  onClose
}: RTMPanelProps) {
  const socket = useSocket();
  const [confirming, setConfirming] = useState<'match' | 'decline' | null>(null);

  const handleEnableRTM = (team: Team) => {
    socket.emit('rtm:enable', { tournamentId, team });
  };

  const handleMatch = () => {
    setConfirming('match');
  };

  const handleDecline = () => {
    setConfirming('decline');
  };

  const confirmMatch = () => {
    socket.emit('rtm:match', { tournamentId });
    setConfirming(null);
    onClose();
  };

  const confirmDecline = () => {
    socket.emit('rtm:decline', { tournamentId });
    setConfirming(null);
    onClose();
  };

  if (!currentPlayer || !currentTeam) {
    return null;
  }

  // RTM is active - show match/decline options
  if (rtmEnabled && rtmTeam) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/50 bg-gradient-to-br from-slate-900 to-slate-950 w-full max-w-lg shadow-2xl">
          {/* Animated border glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 animate-pulse pointer-events-none" />

          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4">
                <Shield size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Right to Match</h2>
              <p className="text-slate-400">
                {rtmTeam.name} can match the winning bid to retain the player
              </p>
            </div>

            {/* Player & Bid Info */}
            <div className="bg-slate-800/50 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-4 mb-4">
                {currentPlayer.photo_url ? (
                  <img
                    src={currentPlayer.photo_url}
                    alt={currentPlayer.name}
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {currentPlayer.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-xl font-bold text-white">{currentPlayer.name}</p>
                  <p className="text-slate-400">{currentPlayer.categories?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Winning Bid</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatIndianNumber(currentBid)}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">Winning Team</p>
                  <p className="text-xl font-bold text-white">{currentTeam.short_name}</p>
                </div>
              </div>
            </div>

            {/* RTM Team Info */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                {rtmTeam.logo_url ? (
                  <img
                    src={rtmTeam.logo_url}
                    alt={rtmTeam.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{rtmTeam.short_name}</span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-white">{rtmTeam.name}</p>
                  <p className="text-sm text-amber-400">Has Right to Match</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Remaining Budget:</span>
                <span className="text-white font-semibold">
                  {formatIndianNumber(rtmTeam.remaining_budget)}
                </span>
              </div>
            </div>

            {/* Confirmation Dialog */}
            {confirming && (
              <div className="bg-slate-800/80 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold">
                      {confirming === 'match'
                        ? 'Confirm Match?'
                        : 'Confirm Decline?'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {confirming === 'match'
                        ? `${rtmTeam.name} will acquire ${currentPlayer.name} for ${formatIndianNumber(currentBid)}`
                        : `${currentTeam.name} will acquire ${currentPlayer.name}`}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={confirming === 'match' ? confirmMatch : confirmDecline}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          confirming === 'match'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!confirming && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMatch}
                  disabled={rtmTeam.remaining_budget < currentBid}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={20} />
                  Match ({formatIndianNumber(currentBid)})
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white"
                >
                  <X size={20} />
                  Decline
                </button>
              </div>
            )}

            {rtmTeam.remaining_budget < currentBid && (
              <p className="text-center text-red-400 text-sm mt-3">
                {rtmTeam.short_name} cannot afford to match this bid
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RTM trigger button (shown in auction panel when applicable)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20 backdrop-blur-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Right to Match (RTM)</h3>
          <p className="text-xs text-amber-400/80">Allow previous team to match winning bid</p>
        </div>
      </div>

      {previousTeam ? (
        <button
          onClick={() => handleEnableRTM(previousTeam)}
          className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium transition-all"
        >
          Offer RTM to {previousTeam.short_name}
        </button>
      ) : (
        <p className="text-sm text-slate-400 text-center py-2">
          No previous team for this player
        </p>
      )}
    </div>
  );
}
