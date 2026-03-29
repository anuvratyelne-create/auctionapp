import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Player } from '../../types';
import { useSocket } from '../../hooks/useSocket';
import {
  Shield, Users, Wallet, Plus, X, Check, Settings,
  AlertCircle, Lock, Unlock
} from 'lucide-react';

interface RetentionSettings {
  retention_enabled: boolean;
  max_retentions_per_team: number;
  retention_price: number;
}

interface RetentionSummary {
  settings: RetentionSettings;
  teams: Array<{
    id: string;
    name: string;
    short_name: string;
    logo_url: string;
    total_budget: number;
    retention_spent: number;
    retained_count: number;
    max_retentions: number;
    remaining_slots: number;
    retained_players: Array<{
      id: string;
      name: string;
      photo_url: string;
      jersey_number: string;
      retention_price: number;
      category: string;
    }>;
  }>;
}

export default function RetentionPanel() {
  const [settings, setSettings] = useState<RetentionSettings>({
    retention_enabled: false,
    max_retentions_per_team: 2,
    retention_price: 10000
  });
  const [summary, setSummary] = useState<RetentionSummary | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [retainModalOpen, setRetainModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [customRetentionPrice, setCustomRetentionPrice] = useState<number>(0);
  const socket = useSocket();

  useEffect(() => {
    loadData();

    socket.onTeamsUpdated(loadData);
    socket.onPlayersUpdated(loadData);
  }, []);

  const loadData = async () => {
    try {
      const [summaryData, playersData] = await Promise.all([
        api.getRetentionSummary() as Promise<RetentionSummary>,
        api.getPlayers('available') as Promise<Player[]>
      ]);
      setSummary(summaryData);
      setSettings(summaryData.settings);
      setAvailablePlayers(playersData.filter(p => !p.is_retained));
    } catch (error) {
      console.error('Failed to load retention data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await api.updateRetentionSettings(settings);
      setShowSettings(false);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to update settings');
    }
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    // Default retention price to player's base price
    setCustomRetentionPrice(player.base_price || settings.retention_price);
  };

  const handleConfirmRetention = async () => {
    if (!selectedTeam || !selectedPlayer) return;

    const minPrice = selectedPlayer.base_price || 0;
    if (customRetentionPrice < minPrice) {
      alert(`Retention price must be at least ${minPrice.toLocaleString()} pts (player's base price)`);
      return;
    }

    try {
      await api.retainPlayer(selectedTeam, selectedPlayer.id, customRetentionPrice);
      setRetainModalOpen(false);
      setSelectedTeam(null);
      setSelectedPlayer(null);
      setCustomRetentionPrice(0);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to retain player');
    }
  };

  const handleCloseModal = () => {
    setRetainModalOpen(false);
    setSelectedTeam(null);
    setSelectedPlayer(null);
    setCustomRetentionPrice(0);
  };

  const handleRemoveRetention = async (playerId: string) => {
    if (!confirm('Remove this player from retention?')) return;

    try {
      await api.removeRetention(playerId);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to remove retention');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Player Retention</h2>
              <p className="text-slate-400 text-sm">Retain players before the auction starts</p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-auction-card border border-auction-border rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={18} />
              Retention Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Enable Retention
                </label>
                <button
                  onClick={() => setSettings({ ...settings, retention_enabled: !settings.retention_enabled })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    settings.retention_enabled
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {settings.retention_enabled ? <Unlock size={18} /> : <Lock size={18} />}
                  {settings.retention_enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Max Retentions Per Team
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.max_retentions_per_team}
                  onChange={(e) => setSettings({ ...settings, max_retentions_per_team: parseInt(e.target.value) || 2 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Retention Price (per player)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.retention_price}
                  onChange={(e) => setSettings({ ...settings, retention_price: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSettings}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Check size={18} />
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Status Banner */}
        {!settings.retention_enabled && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-amber-500" size={24} />
            <div>
              <p className="text-amber-200 font-medium">Retention is disabled</p>
              <p className="text-amber-300/70 text-sm">Enable retention in settings to allow teams to retain players.</p>
            </div>
          </div>
        )}

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary?.teams.map((team) => (
            <div
              key={team.id}
              className="bg-auction-card border border-auction-border rounded-xl overflow-hidden"
            >
              {/* Team Header */}
              <div className="p-4 border-b border-auction-border">
                <div className="flex items-center gap-3">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold">{team.short_name}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{team.name}</h3>
                    <p className="text-slate-400 text-sm">{team.short_name}</p>
                  </div>
                </div>
              </div>

              {/* Team Stats */}
              <div className="p-4 border-b border-auction-border">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                      <Shield size={12} />
                      Retained
                    </div>
                    <p className="text-lg font-bold text-white">
                      {team.retained_count} / {team.max_retentions}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                      <Wallet size={12} />
                      Spent
                    </div>
                    <p className="text-lg font-bold text-amber-400">
                      {(team.retention_spent / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
              </div>

              {/* Retained Players */}
              <div className="p-4">
                {team.retained_players.length > 0 ? (
                  <div className="space-y-2">
                    {team.retained_players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2"
                      >
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center">
                            <Users size={16} className="text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{player.name}</p>
                          <p className="text-xs text-slate-400">
                            {player.category} • {player.retention_price?.toLocaleString()} pts
                          </p>
                        </div>
                        {settings.retention_enabled && (
                          <button
                            onClick={() => handleRemoveRetention(player.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="Remove retention"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm text-center py-2">
                    No retained players
                  </p>
                )}

                {/* Add Retention Button */}
                {settings.retention_enabled && team.remaining_slots > 0 && (
                  <button
                    onClick={() => {
                      setSelectedTeam(team.id);
                      setRetainModalOpen(true);
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 bg-primary-600/20 hover:bg-primary-600/40 text-primary-400 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                    Retain Player ({team.remaining_slots} slots)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Retain Player Modal */}
        {retainModalOpen && selectedTeam && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-auction-card border border-auction-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-auction-border flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Shield size={20} />
                  {selectedPlayer ? 'Set Retention Price' : 'Select Player to Retain'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {selectedPlayer ? (
                  /* Step 2: Set Retention Price */
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-slate-800/50 rounded-lg p-4">
                      {selectedPlayer.photo_url ? (
                        <img
                          src={selectedPlayer.photo_url}
                          alt={selectedPlayer.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                          <Users size={24} className="text-slate-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white text-lg">{selectedPlayer.name}</p>
                        <p className="text-slate-400">
                          {selectedPlayer.categories?.name} • #{selectedPlayer.jersey_number || 'N/A'}
                        </p>
                        <p className="text-amber-400 font-medium mt-1">
                          Base Price: {selectedPlayer.base_price?.toLocaleString()} pts
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Retention Price <span className="text-amber-400">(minimum: {selectedPlayer.base_price?.toLocaleString()} pts)</span>
                      </label>
                      <input
                        type="number"
                        min={selectedPlayer.base_price || 0}
                        step="1000"
                        value={customRetentionPrice}
                        onChange={(e) => setCustomRetentionPrice(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg"
                      />
                      {customRetentionPrice < (selectedPlayer.base_price || 0) && (
                        <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                          <AlertCircle size={14} />
                          Price must be at least {selectedPlayer.base_price?.toLocaleString()} pts
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setSelectedPlayer(null)}
                        className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleConfirmRetention}
                        disabled={customRetentionPrice < (selectedPlayer.base_price || 0)}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors font-medium"
                      >
                        <Check size={18} />
                        Retain for {customRetentionPrice.toLocaleString()} pts
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Step 1: Select Player */
                  <>
                    <p className="text-slate-400 text-sm mb-4">
                      Select a player, then set the retention price (must be at least the player's base price)
                    </p>

                    {availablePlayers.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No available players</p>
                    ) : (
                      <div className="space-y-2">
                        {availablePlayers.map((player) => (
                          <button
                            key={player.id}
                            onClick={() => handleSelectPlayer(player)}
                            className="w-full flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg p-3 transition-colors text-left"
                          >
                            {player.photo_url ? (
                              <img
                                src={player.photo_url}
                                alt={player.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                                <Users size={20} className="text-slate-500" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-white">{player.name}</p>
                              <p className="text-sm text-slate-400">
                                {player.categories?.name} • #{player.jersey_number || 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-amber-400 font-semibold">{player.base_price?.toLocaleString()}</p>
                              <p className="text-xs text-slate-500">min price</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
