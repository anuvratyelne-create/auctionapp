import { useState } from 'react';
import { Layers, Plus, Play, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { api } from '../../utils/api';
import { useSocket } from '../../hooks/useSocket';
import { formatIndianNumber } from '../../utils/formatters';

interface Round {
  id: string;
  number: number;
  name: string;
  status: 'pending' | 'active' | 'completed';
  playersAvailable: number;
  playersSold: number;
  playersUnsold: number;
  totalValue: number;
  startedAt?: Date;
  completedAt?: Date;
}

interface MultiRoundPanelProps {
  tournamentId: string;
  onRoundChange: (roundId: string) => void;
}

export default function MultiRoundPanel({ tournamentId, onRoundChange }: MultiRoundPanelProps) {
  const socket = useSocket();
  const [rounds, setRounds] = useState<Round[]>([
    {
      id: 'round-1',
      number: 1,
      name: 'Main Auction',
      status: 'active',
      playersAvailable: 0,
      playersSold: 0,
      playersUnsold: 0,
      totalValue: 0
    }
  ]);
  const [activeRound, setActiveRound] = useState<string>('round-1');
  const [showAddRound, setShowAddRound] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');

  // Add new round
  const handleAddRound = () => {
    if (!newRoundName.trim()) return;

    const newRound: Round = {
      id: `round-${Date.now()}`,
      number: rounds.length + 1,
      name: newRoundName.trim(),
      status: 'pending',
      playersAvailable: 0,
      playersSold: 0,
      playersUnsold: 0,
      totalValue: 0
    };

    setRounds(prev => [...prev, newRound]);
    setNewRoundName('');
    setShowAddRound(false);

    socket.emit('rounds:add', { tournamentId, round: newRound });
  };

  // Start a round
  const handleStartRound = (roundId: string) => {
    setRounds(prev => prev.map(r => ({
      ...r,
      status: r.id === roundId ? 'active' : r.status === 'active' ? 'completed' : r.status
    })));
    setActiveRound(roundId);
    onRoundChange(roundId);

    socket.emit('rounds:start', { tournamentId, roundId });
  };

  // Complete current round
  const handleCompleteRound = (roundId: string) => {
    setRounds(prev => prev.map(r =>
      r.id === roundId
        ? { ...r, status: 'completed', completedAt: new Date() }
        : r
    ));

    socket.emit('rounds:complete', { tournamentId, roundId });
  };

  // Carry forward unsold players to next round
  const handleCarryForward = async (fromRoundId: string, toRoundId: string) => {
    try {
      await api.reauctionUnsold();
      alert('Unsold players moved to available pool for next round');
      socket.emit('rounds:carryForward', { tournamentId, fromRoundId, toRoundId });
    } catch (error: any) {
      alert(error.message || 'Failed to carry forward players');
    }
  };

  const currentRound = rounds.find(r => r.id === activeRound);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700">
                <Layers size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Multi-Round Auction</h2>
                <p className="text-sm text-slate-400">{rounds.length} round{rounds.length !== 1 ? 's' : ''} configured</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddRound(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add Round
            </button>
          </div>
        </div>

        {/* Current Round */}
        {currentRound && (
          <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-indigo-900/20 to-blue-900/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide mb-1">Current Round</p>
                <h3 className="text-xl font-bold text-white">{currentRound.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {currentRound.status === 'active' && (
                  <button
                    onClick={() => handleCompleteRound(currentRound.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                  >
                    <CheckCircle size={16} />
                    Complete Round
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Available</p>
                <p className="text-xl font-bold text-blue-400">{currentRound.playersAvailable}</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Sold</p>
                <p className="text-xl font-bold text-emerald-400">{currentRound.playersSold}</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Unsold</p>
                <p className="text-xl font-bold text-red-400">{currentRound.playersUnsold}</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Total Value</p>
                <p className="text-xl font-bold text-amber-400">{formatIndianNumber(currentRound.totalValue)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Rounds List */}
        <div className="p-5">
          <p className="text-sm font-medium text-slate-400 mb-3">All Rounds</p>
          <div className="space-y-3">
            {rounds.map((round, idx) => (
              <div
                key={round.id}
                className={`p-4 rounded-xl border transition-all ${
                  round.status === 'active'
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : round.status === 'completed'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-slate-700/50 bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      round.status === 'active'
                        ? 'bg-indigo-600 text-white'
                        : round.status === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {round.number}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{round.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        {round.status === 'active' && (
                          <span className="flex items-center gap-1 text-indigo-400">
                            <Play size={10} className="fill-current" />
                            In Progress
                          </span>
                        )}
                        {round.status === 'completed' && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle size={10} />
                            Completed
                          </span>
                        )}
                        {round.status === 'pending' && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock size={10} />
                            Pending
                          </span>
                        )}
                        {round.status === 'completed' && round.totalValue > 0 && (
                          <span className="text-slate-500">
                            | {round.playersSold} sold for {formatIndianNumber(round.totalValue)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {round.status === 'pending' && (
                      <button
                        onClick={() => handleStartRound(round.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                      >
                        <Play size={14} />
                        Start
                      </button>
                    )}
                    {round.status === 'completed' && idx < rounds.length - 1 && rounds[idx + 1].status === 'pending' && (
                      <button
                        onClick={() => handleCarryForward(round.id, rounds[idx + 1].id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
                        title="Move unsold players to next round"
                      >
                        <ChevronRight size={14} />
                        Carry Forward
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Round Modal */}
        {showAddRound && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-4">Add New Round</h3>
              <input
                type="text"
                value={newRoundName}
                onChange={(e) => setNewRoundName(e.target.value)}
                placeholder="Round name (e.g., Accelerated Round)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mb-4 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddRound(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRound}
                  disabled={!newRoundName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Round
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
