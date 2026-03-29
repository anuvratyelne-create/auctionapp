import { useState, useEffect, useMemo } from 'react';
import { Shuffle, ArrowRight, ArrowLeft, Users, CheckCircle, RotateCcw } from 'lucide-react';
import { Team, Player, Category } from '../../types';
import { api } from '../../utils/api';
import { useSocket } from '../../hooks/useSocket';

type DraftType = 'snake' | 'standard';

interface DraftState {
  type: DraftType;
  currentRound: number;
  currentPickIndex: number;
  draftOrder: string[]; // team IDs in order
  picks: Array<{
    round: number;
    pick: number;
    teamId: string;
    playerId: string;
    playerName: string;
  }>;
  isActive: boolean;
  isPaused: boolean;
}

interface DraftModePanelProps {
  teams: Team[];
  players: Player[];
  categories: Category[];
  tournamentId: string;
  onPlayerPicked: () => void;
}

export default function DraftModePanel({
  teams,
  players,
  categories,
  tournamentId,
  onPlayerPicked
}: DraftModePanelProps) {
  const socket = useSocket();
  const [draftState, setDraftState] = useState<DraftState>({
    type: 'snake',
    currentRound: 1,
    currentPickIndex: 0,
    draftOrder: [],
    picks: [],
    isActive: false,
    isPaused: false
  });
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize draft order from teams
  useEffect(() => {
    if (teams.length > 0 && draftState.draftOrder.length === 0) {
      setDraftState(prev => ({
        ...prev,
        draftOrder: teams.map(t => t.id)
      }));
    }
  }, [teams]);

  // Get current picking team
  const currentTeam = useMemo(() => {
    if (!draftState.isActive || draftState.draftOrder.length === 0) return null;

    let pickIndex = draftState.currentPickIndex;
    const round = draftState.currentRound;
    const numTeams = draftState.draftOrder.length;

    // Snake draft reverses order on odd rounds
    if (draftState.type === 'snake' && round % 2 === 0) {
      pickIndex = numTeams - 1 - pickIndex;
    }

    const teamId = draftState.draftOrder[pickIndex];
    return teams.find(t => t.id === teamId) || null;
  }, [draftState, teams]);

  // Filter available players
  const availablePlayers = useMemo(() => {
    let filtered = players.filter(p => p.status === 'available');

    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category_id === filterCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.jersey_number?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [players, filterCategory, searchQuery]);

  // Randomize draft order
  const randomizeOrder = () => {
    const shuffled = [...draftState.draftOrder].sort(() => Math.random() - 0.5);
    setDraftState(prev => ({ ...prev, draftOrder: shuffled }));
  };

  // Move team in order
  const moveTeam = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...draftState.draftOrder];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newOrder.length) return;

    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setDraftState(prev => ({ ...prev, draftOrder: newOrder }));
  };

  // Start draft
  const startDraft = () => {
    setDraftState(prev => ({ ...prev, isActive: true, isPaused: false }));
    socket.emit('draft:start', { tournamentId, state: draftState });
  };

  // Pause/Resume draft
  const togglePause = () => {
    setDraftState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    socket.emit('draft:pause', { tournamentId, isPaused: !draftState.isPaused });
  };

  // Make pick
  const makePick = async () => {
    if (!selectedPlayer || !currentTeam) return;

    try {
      // Assign player to team
      await api.markSold(selectedPlayer.id, currentTeam.id, selectedPlayer.base_price);

      // Record pick
      const newPick = {
        round: draftState.currentRound,
        pick: draftState.currentPickIndex + 1,
        teamId: currentTeam.id,
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name
      };

      // Advance to next pick
      const numTeams = draftState.draftOrder.length;
      let nextPickIndex = draftState.currentPickIndex + 1;
      let nextRound = draftState.currentRound;

      if (nextPickIndex >= numTeams) {
        nextPickIndex = 0;
        nextRound++;
      }

      setDraftState(prev => ({
        ...prev,
        picks: [...prev.picks, newPick],
        currentPickIndex: nextPickIndex,
        currentRound: nextRound
      }));

      setSelectedPlayer(null);
      onPlayerPicked();

      socket.emit('draft:pick', { tournamentId, pick: newPick });
    } catch (error: any) {
      alert(error.message || 'Failed to make pick');
    }
  };

  // Reset draft
  const resetDraft = () => {
    if (!confirm('Are you sure you want to reset the draft?')) return;

    setDraftState({
      type: draftState.type,
      currentRound: 1,
      currentPickIndex: 0,
      draftOrder: teams.map(t => t.id),
      picks: [],
      isActive: false,
      isPaused: false
    });
    setSelectedPlayer(null);
    socket.emit('draft:reset', { tournamentId });
  };

  return (
    <div className="space-y-6">
      {/* Draft Setup (shown when not active) */}
      {!draftState.isActive && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10 p-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-pink-700">
                <Shuffle size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Draft Mode Setup</h2>
                <p className="text-sm text-slate-400">Configure your draft settings</p>
              </div>
            </div>

            {/* Draft Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">Draft Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDraftState(prev => ({ ...prev, type: 'snake' }))}
                  className={`p-4 rounded-xl border transition-all ${
                    draftState.type === 'snake'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className="font-semibold text-white mb-1">Snake Draft</p>
                  <p className="text-xs text-slate-400">Order reverses each round (1-8, 8-1, 1-8...)</p>
                </button>
                <button
                  onClick={() => setDraftState(prev => ({ ...prev, type: 'standard' }))}
                  className={`p-4 rounded-xl border transition-all ${
                    draftState.type === 'standard'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className="font-semibold text-white mb-1">Standard Draft</p>
                  <p className="text-xs text-slate-400">Same order every round (1-8, 1-8, 1-8...)</p>
                </button>
              </div>
            </div>

            {/* Draft Order */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-300">Draft Order</label>
                <button
                  onClick={randomizeOrder}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-white transition-colors"
                >
                  <Shuffle size={14} />
                  Randomize
                </button>
              </div>
              <div className="space-y-2">
                {draftState.draftOrder.map((teamId, index) => {
                  const team = teams.find(t => t.id === teamId);
                  return (
                    <div
                      key={teamId}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
                    >
                      <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      {team?.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{team?.short_name}</span>
                        </div>
                      )}
                      <span className="flex-1 font-medium text-white">{team?.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveTeam(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowLeft size={14} className="text-white rotate-90" />
                        </button>
                        <button
                          onClick={() => moveTeam(index, 'down')}
                          disabled={index === draftState.draftOrder.length - 1}
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowRight size={14} className="text-white rotate-90" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startDraft}
              disabled={draftState.draftOrder.length < 2}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Draft
            </button>
          </div>
        </div>
      )}

      {/* Active Draft */}
      {draftState.isActive && (
        <>
          {/* Current Pick Info */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary-500/50 bg-gradient-to-br from-primary-900/30 to-purple-900/30 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-purple-500/10 pointer-events-none" />

            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-400">Round {draftState.currentRound}, Pick {draftState.currentPickIndex + 1}</p>
                  <p className="text-2xl font-bold text-white">On the Clock</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePause}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      draftState.isPaused
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    {draftState.isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={resetDraft}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                    title="Reset Draft"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>

              {currentTeam && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50">
                  {currentTeam.logo_url ? (
                    <img src={currentTeam.logo_url} alt={currentTeam.name} className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{currentTeam.short_name}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-xl font-bold text-white">{currentTeam.name}</p>
                    <p className="text-sm text-slate-400">{currentTeam.player_count} players drafted</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Player Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Players */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="font-semibold text-white mb-3">Available Players</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-700/30">
                {availablePlayers.map(player => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    disabled={draftState.isPaused}
                    className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                      selectedPlayer?.id === player.id
                        ? 'bg-primary-500/20'
                        : 'hover:bg-white/5'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {player.photo_url ? (
                      <img src={player.photo_url} alt={player.name} className="w-10 h-10 object-cover rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Users size={16} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{player.name}</p>
                      <p className="text-xs text-slate-400">{player.categories?.name}</p>
                    </div>
                    {selectedPlayer?.id === player.id && (
                      <CheckCircle size={20} className="text-primary-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Make Pick */}
            <div className="space-y-4">
              {selectedPlayer ? (
                <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-green-900/20 backdrop-blur-sm p-6">
                  <h3 className="font-semibold text-white mb-4">Selected Player</h3>
                  <div className="flex items-center gap-4 mb-6">
                    {selectedPlayer.photo_url ? (
                      <img src={selectedPlayer.photo_url} alt={selectedPlayer.name} className="w-20 h-20 object-cover rounded-xl" />
                    ) : (
                      <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{selectedPlayer.name.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-xl font-bold text-white">{selectedPlayer.name}</p>
                      <p className="text-slate-400">{selectedPlayer.categories?.name}</p>
                      {selectedPlayer.jersey_number && (
                        <p className="text-sm text-slate-500">#{selectedPlayer.jersey_number}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={makePick}
                    disabled={draftState.isPaused}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Pick for {currentTeam?.short_name}
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-10 text-center">
                  <Users size={48} className="mx-auto text-slate-500 mb-3" />
                  <p className="text-slate-400">Select a player to draft</p>
                </div>
              )}

              {/* Recent Picks */}
              {draftState.picks.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
                  <div className="p-4 border-b border-slate-700/50">
                    <h3 className="font-semibold text-white">Recent Picks</h3>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-700/30">
                    {[...draftState.picks].reverse().slice(0, 10).map((pick, idx) => {
                      const team = teams.find(t => t.id === pick.teamId);
                      return (
                        <div key={idx} className="p-3 flex items-center gap-3">
                          <span className="text-xs text-slate-500">R{pick.round} P{pick.pick}</span>
                          <span className="font-medium text-white">{team?.short_name}</span>
                          <ArrowRight size={14} className="text-slate-500" />
                          <span className="text-slate-300">{pick.playerName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
