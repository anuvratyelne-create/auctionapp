import { useState } from 'react';
import { Team, Player } from '../../types';
import { TrendingUp, Wallet, Users, ArrowUp, Sparkles, Edit3 } from 'lucide-react';
import { formatAmountCompact } from '../../utils/formatters';
import AnimatedBidAmount from './AnimatedBidAmount';
import { getBidIncrement, formatIncrement } from '../../config/budgetPresets';
import { useUIStore } from '../../stores/uiStore';

interface BidDisplayProps {
  currentBid: number;
  currentTeam: Team | null;
  player: Player | null;
  teamBudget?: number;
  onManualBid?: (amount: number) => Promise<boolean>;
  disabled?: boolean;
}

export default function BidDisplay({ currentBid, currentTeam, player, teamBudget, onManualBid, disabled }: BidDisplayProps) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextIncrement = getBidIncrement(currentBid, teamBudget);
  const { displayMode } = useUIStore();
  const usePoints = displayMode === 'points';

  if (!player) {
    return (
      <div className="relative h-full min-h-[450px]">
        {/* Outer golden border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-[2px]">
          <div className="h-full w-full rounded-2xl bg-gradient-to-br from-slate-900 via-[#1a1a2e] to-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600">
                <Users size={32} className="text-slate-500" />
              </div>
              <p className="text-slate-400 text-lg">Select a player to</p>
              <p className="text-slate-500">start bidding</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[450px]">
      {/* Outer golden border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-[2px] shadow-2xl">
        <div className="h-full w-full rounded-2xl bg-gradient-to-br from-slate-900 via-[#1a1a2e] to-slate-900 overflow-hidden flex flex-col">

          {/* Inner decorative border */}
          <div className="absolute inset-3 rounded-xl border border-amber-500/20 pointer-events-none" />

          {/* Corner decorations */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-500/50 rounded-tl-lg" />
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-500/50 rounded-tr-lg" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-500/50 rounded-bl-lg" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-500/50 rounded-br-lg" />

          {/* Current Bid Section */}
          <div className="relative p-6 text-center flex-shrink-0">
            <p className="text-amber-400/80 text-xs uppercase tracking-[0.2em] mb-2">Current Bid</p>

            {/* Big Number with Glow and Animation */}
            <div className="relative inline-block">
              <div className="text-6xl font-black text-white tracking-tight">
                <AnimatedBidAmount value={currentBid} duration={400} usePoints={usePoints} />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 text-6xl font-black text-amber-400 blur-xl opacity-30 tracking-tight pointer-events-none">
                <AnimatedBidAmount value={currentBid} duration={400} usePoints={usePoints} />
              </div>
            </div>

            {/* Increment Badge */}
            <div className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600/20 to-green-600/20 border border-emerald-500/30 px-4 py-1.5 rounded-full">
              <ArrowUp size={14} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-bold">{formatIncrement(nextIncrement)}</span>
            </div>
          </div>

          {/* Decorative Divider */}
          <div className="flex items-center gap-3 px-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            <Sparkles size={12} className="text-amber-500/60" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          </div>

          {/* Current Bidder Section */}
          <div className="flex-1 p-6">
            <p className="text-amber-400/60 text-xs uppercase tracking-[0.2em] text-center mb-4">Current Bidder</p>

            {currentTeam ? (
              <div className="text-center">
                {/* Team Logo */}
                <div className="relative inline-block mb-4">
                  <div className="absolute -inset-3 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-lg" />
                  {currentTeam.logo_url ? (
                    <img
                      src={currentTeam.logo_url}
                      alt={currentTeam.name}
                      className="relative w-20 h-20 object-contain mx-auto drop-shadow-lg"
                    />
                  ) : (
                    <div className="relative w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center border border-slate-500">
                      <span className="text-xl font-bold text-white">
                        {currentTeam.short_name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Team Name */}
                <h3 className="text-xl font-bold text-white mb-1">{currentTeam.name}</h3>
                <p className="text-slate-500 text-sm mb-5">{currentTeam.short_name}</p>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                      <Wallet size={12} />
                      <span className="text-[10px] uppercase tracking-wider">Balance</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {formatAmountCompact(currentTeam.remaining_budget, usePoints)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-1">
                      <Users size={12} />
                      <span className="text-[10px] uppercase tracking-wider">Squad Size</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {currentTeam.player_count || 0}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-600">
                  <Users size={32} className="text-slate-500" />
                </div>
                <p className="text-slate-400">No bids yet</p>
                <p className="text-slate-500 text-sm mt-1">Click a team to place first bid</p>
              </div>
            )}
          </div>

          {/* Next Bid Section */}
          <div className="px-6 pb-6 flex-shrink-0">
            <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp size={16} className="text-amber-400" />
                <span className="text-amber-400 font-bold">Bid Step: {formatIncrement(nextIncrement)}</span>
              </div>
              <p className="text-amber-200/50 text-xs">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-700/80 border border-slate-600 text-emerald-300 font-mono mx-1">↑</kbd> to increase
                <span className="mx-2">|</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-700/80 border border-slate-600 text-red-300 font-mono mx-1">↓</kbd> to decrease
              </p>
            </div>

            {/* Manual Bid Section */}
            {onManualBid && (
              <div className="mt-3">
                {!showManualInput ? (
                  <button
                    onClick={() => setShowManualInput(true)}
                    disabled={disabled}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl py-2.5 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit3 size={14} />
                    <span className="text-sm font-medium">Set Manual Amount</span>
                  </button>
                ) : (
                  <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-3">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={manualAmount}
                          onChange={(e) => setManualAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="w-full bg-slate-800/80 border border-purple-500/50 rounded-lg py-2 pl-8 pr-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && manualAmount) {
                              handleManualSubmit();
                            } else if (e.key === 'Escape') {
                              setShowManualInput(false);
                              setManualAmount('');
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={handleManualSubmit}
                        disabled={!manualAmount || isSubmitting}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-sm font-semibold hover:from-purple-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSubmitting ? '...' : 'Set'}
                      </button>
                      <button
                        onClick={() => {
                          setShowManualInput(false);
                          setManualAmount('');
                        }}
                        className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 text-sm hover:bg-slate-700 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-purple-300/50 text-xs mt-2 text-center">
                      Min: ₹{(currentBid + 1).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  async function handleManualSubmit() {
    const amount = parseInt(manualAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      const success = await onManualBid?.(amount);
      if (success) {
        setShowManualInput(false);
        setManualAmount('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }
}
