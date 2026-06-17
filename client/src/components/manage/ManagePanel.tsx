import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../utils/api';
import { useAuthStore } from '../../stores/authStore';
import { Team, Category, Player, OverlaySettings, OverlayTheme, OverlayMode } from '../../types';
import { formatCompactIndian } from '../../utils/formatters';
import { PLAYER_CATEGORIES, getRoleShortLabel, getRoleIcon, getRoleLabel, convertLegacyRole } from '../../config/playerRoles';
import ExportSection from '../export/ExportSection';
import ImageUpload from '../common/ImageUpload';
import LayoutSelector from '../auction/LayoutSelector';
import ThemeSelector from '../auction/ThemeSelector';
import { cityBackgrounds } from '../../config/cityBackgrounds';
import { premiumBackgrounds } from '../../config/premiumBackgrounds';
import { defaultOverlaySettings } from '../../config/overlayThemes';
import { socketClient } from '../../socket/client';
import {
  Users,
  UserPlus,
  Tag,
  RefreshCw,
  RotateCcw,
  Trash2,
  Settings,
  LogOut,
  Shuffle,
  List,
  Plus,
  X,
  Edit3,
  Search,
  QrCode,
  Copy,
  Check,
  Link,
  Timer,
  Volume2,
  Palette,
  Layout,
  FileSpreadsheet,
  Download,
  Monitor,
  Eye,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import ExcelImportModal from '../import/ExcelImportModal';
import { downloadExcelTemplate } from '../import/ExcelTemplateGenerator';
import { useUIStore } from '../../stores/uiStore';

type Tab = 'teams' | 'players' | 'categories' | 'settings';

export default function ManagePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const { tournament, logout, updateTournament } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teamsData, categoriesData] = await Promise.all([
        api.getTeams(),
        api.getCategories(),
      ]);
      setTeams(teamsData as Team[]);
      setCategories(categoriesData as Category[]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleUpdatePoints = async () => {
    setLoading(true);
    try {
      await api.updatePoints();
      alert('Points updated successfully');
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to update points');
    } finally {
      setLoading(false);
    }
  };

  const handleReauctionUnsold = async () => {
    if (!confirm('Move all unsold players back to available pool?')) return;
    setLoading(true);
    try {
      const result = await api.reauctionUnsold() as { count: number };
      alert(`${result.count} players moved to available pool`);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to re-auction');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAuction = async () => {
    if (!confirm('This will reset ALL auction data. Are you sure?')) return;
    if (!confirm('This action cannot be undone. Continue?')) return;
    setLoading(true);
    try {
      await api.resetAuction();
      alert('Auction reset successfully');
      loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to reset auction');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDisplayMode = async () => {
    if (!tournament) return;
    const newMode = tournament.player_display_mode === 'random' ? 'sequential' : 'random';
    try {
      const updated = await api.updateTournament({ player_display_mode: newMode }) as any;
      updateTournament(updated);
    } catch (error: any) {
      alert(error.message || 'Failed to update display mode');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs = [
    { key: 'teams', label: 'Teams', icon: Users },
    { key: 'players', label: 'Players', icon: UserPlus },
    { key: 'categories', label: 'Categories', icon: Tag },
    { key: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const isCompleted = tournament?.status === 'completed';

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Auction Completed Banner */}
        {isCompleted && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/30 rounded-full flex items-center justify-center">
                <Check size={24} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400">Auction Completed</h3>
                <p className="text-sm text-slate-400">This auction has been marked as completed. Data is now read-only.</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Manage {isCompleted && <span className="text-sm text-green-400 ml-2">(View Only)</span>}</h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={handleUpdatePoints}
            disabled={loading || isCompleted}
            className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 transition-all group ${isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-500/50'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <RefreshCw size={24} className="text-primary-400 mb-2" />
            <p className="font-medium text-white">Update Points</p>
            <p className="text-xs text-slate-500">Recalculate team budgets</p>
          </button>

          <button
            onClick={handleReauctionUnsold}
            disabled={loading || isCompleted}
            className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 transition-all group ${isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-500/50'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <RotateCcw size={24} className="text-amber-400 mb-2" />
            <p className="font-medium text-white">Re-auction Unsold</p>
            <p className="text-xs text-slate-500">Move unsold to available</p>
          </button>

          <button
            onClick={handleToggleDisplayMode}
            disabled={isCompleted}
            className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 transition-all group ${isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:border-green-500/50'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            {tournament?.player_display_mode === 'random' ? (
              <Shuffle size={24} className="text-green-400 mb-2" />
            ) : (
              <List size={24} className="text-green-400 mb-2" />
            )}
            <p className="font-medium text-white">Display Mode</p>
            <p className="text-xs text-slate-500">
              {tournament?.player_display_mode === 'random' ? 'Random' : 'Sequential'}
            </p>
          </button>

          <button
            onClick={handleResetAuction}
            disabled={loading || isCompleted}
            className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 transition-all group ${isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500/50'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Trash2 size={24} className="text-red-400 mb-2" />
            <p className="font-medium text-white">Reset Auction</p>
            <p className="text-xs text-slate-500">Clear all sold data</p>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-glow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80 border border-slate-700/50'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'teams' && (
          <TeamsTab teams={teams} onRefresh={loadData} />
        )}
        {activeTab === 'players' && (
          <PlayersTab categories={categories} onRefresh={loadData} />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab categories={categories} onRefresh={loadData} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
      </div>
    </div>
  );
}

function TeamsTab({ teams, onRefresh }: { teams: Team[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const { tournament } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    keyboard_key: '',
    logo_url: '',
    owner_name: '',
    total_budget: tournament?.total_points || 50000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTeam({
        ...formData,
        total_budget: Number(formData.total_budget),
      });
      setFormData({
        name: '',
        short_name: '',
        keyboard_key: '',
        logo_url: '',
        owner_name: '',
        total_budget: tournament?.total_points || 50000,
      });
      setShowForm(false);
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to create team');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team? Players will be moved to available.')) return;
    try {
      await api.deleteTeam(id);
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to delete team');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-lg">Teams ({teams.length})</h3>
            <p className="text-sm text-slate-400">Add teams with their budget for the auction</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              showForm
                ? 'bg-slate-700 text-slate-300'
                : 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
            }`}
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Cancel' : 'Add Team'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="p-5 border-b border-slate-700/50 bg-slate-800/30">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Team Name *</label>
                <input
                  type="text"
                  placeholder="Chennai Super Kings"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Short Name * (3-5 chars)</label>
                <input
                  type="text"
                  placeholder="CSK"
                  value={formData.short_name}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Keyboard Key</label>
                <input
                  type="text"
                  placeholder="C"
                  value={formData.keyboard_key}
                  onChange={(e) => setFormData({ ...formData, keyboard_key: e.target.value.toUpperCase().slice(0, 1) })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-center font-mono text-lg focus:border-primary-500 transition-all"
                  maxLength={1}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Owner Name</label>
                <input
                  type="text"
                  placeholder="Team Owner"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Budget (Points) *</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: Number(e.target.value) })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                  required
                />
              </div>
              <div className="lg:col-span-2">
                <ImageUpload
                  label="Team Logo"
                  value={formData.logo_url}
                  onChange={(url) => setFormData({ ...formData, logo_url: url })}
                  folder="team-logos"
                  placeholder="Upload team logo"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-success hover:scale-105 transition-transform"
              >
                Create Team
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {teams.map((team) => (
            <div key={team.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-12 h-12 object-contain rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="font-bold text-white">{team.short_name}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{team.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span>{team.short_name}</span>
                      {team.keyboard_key && (
                        <span className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono">{team.keyboard_key}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(team.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/50 rounded-lg p-2.5">
                  <p className="text-slate-500 text-xs">Budget</p>
                  <p className="text-emerald-400 font-semibold">{formatCompactIndian(team.total_budget)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2.5">
                  <p className="text-slate-500 text-xs">Spent</p>
                  <p className="text-amber-400 font-semibold">{formatCompactIndian(team.spent_points)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2.5">
                  <p className="text-slate-500 text-xs">Remaining</p>
                  <p className="text-blue-400 font-semibold">{formatCompactIndian(team.remaining_budget)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2.5">
                  <p className="text-slate-500 text-xs">Players</p>
                  <p className="text-white font-semibold">{team.player_count}</p>
                </div>
              </div>
              {team.owner_name && (
                <p className="mt-2 text-xs text-slate-500">Owner: {team.owner_name}</p>
              )}
            </div>
          ))}
          {teams.length === 0 && (
            <div className="col-span-full p-12 text-center">
              <Users size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 mb-2">No teams created yet</p>
              <p className="text-slate-500 text-sm">Click "Add Team" to create your first team</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PendingPlayer {
  id: string;
  name: string;
  player_uid?: string;
  jersey_number?: string;
  photo_url?: string;
  stats?: { role?: string };
  created_at?: string;
}

function PlayersTab({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pendingPlayers, setPendingPlayers] = useState<PendingPlayer[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedRoleCategory, setSelectedRoleCategory] = useState('');
  const [approvingPlayer, setApprovingPlayer] = useState<PendingPlayer | null>(null);
  const [approvalData, setApprovalData] = useState({ category_id: '', base_price: '' });
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    jersey_number: '',
    category_id: '',
    base_price: '',
    photo_url: '',
    role: '',
  });

  useEffect(() => {
    loadPlayers();
    loadPendingPlayers();
  }, []);

  const loadPlayers = async () => {
    const data = await api.getPlayers() as Player[];
    setPlayers(data);
  };

  const loadPendingPlayers = async () => {
    try {
      const data = await api.getPendingPlayers() as PendingPlayer[];
      setPendingPlayers(data);
    } catch (error) {
      console.error('Failed to load pending players:', error);
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingPlayer || !approvalData.category_id) return;

    try {
      await api.approvePlayer(approvingPlayer.id, {
        category_id: approvalData.category_id,
        base_price: approvalData.base_price ? Number(approvalData.base_price) : undefined,
      });
      setApprovingPlayer(null);
      setApprovalData({ category_id: '', base_price: '' });
      loadPendingPlayers();
      loadPlayers();
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to approve player');
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Reject registration for "${name}"? This cannot be undone.`)) return;
    try {
      await api.rejectPlayer(id);
      loadPendingPlayers();
    } catch (error: any) {
      alert(error.message || 'Failed to reject player');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', jersey_number: '', category_id: '', base_price: '', photo_url: '', role: '' });
    setSelectedRoleCategory('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPlayer({
        name: formData.name,
        jersey_number: formData.jersey_number,
        category_id: formData.category_id,
        base_price: formData.base_price ? Number(formData.base_price) : undefined,
        photo_url: formData.photo_url || undefined,
        stats: formData.role ? { role: formData.role } : undefined,
      });
      resetForm();
      setShowForm(false);
      loadPlayers();
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to create player');
    }
  };

  const handleEdit = (player: Player) => {
    const role = player.stats?.role ? convertLegacyRole(player.stats.role) : '';
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      jersey_number: player.jersey_number || '',
      category_id: player.category_id,
      base_price: player.base_price?.toString() || '',
      photo_url: player.photo_url || '',
      role: role || '',
    });
    // Find the category for the role
    const roleCat = PLAYER_CATEGORIES.find(cat => cat.roles.some(r => r.value === role));
    setSelectedRoleCategory(roleCat?.id || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    try {
      await api.updatePlayer(editingPlayer.id, {
        name: formData.name,
        jersey_number: formData.jersey_number,
        category_id: formData.category_id,
        base_price: formData.base_price ? Number(formData.base_price) : undefined,
        photo_url: formData.photo_url || undefined,
        stats: formData.role ? { role: formData.role } : undefined,
      });
      setEditingPlayer(null);
      resetForm();
      loadPlayers();
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to update player');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePlayer(id);
      loadPlayers();
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to delete player');
    }
  };

  const handleReset = async (id: string, name: string) => {
    if (!confirm(`Reset "${name}" to available? This will remove them from their team.`)) return;
    try {
      await api.resetPlayer(id);
      loadPlayers();
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to reset player');
    }
  };

  const filteredPlayers = players.filter(p => {
    // Check for pending via stats.pending
    const isPending = p.stats?.pending === true;

    if (filterCategory && p.category_id !== filterCategory) return false;
    if (filterStatus) {
      if (filterStatus === 'pending') {
        if (!isPending) return false;
      } else {
        if (isPending) return false; // Exclude pending from other filters
        if (p.status !== filterStatus) return false;
      }
    } else {
      // When no filter, exclude pending (they show in separate section)
      if (isPending) return false;
    }
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getRolesForCategory = (catId: string) => {
    const cat = PLAYER_CATEGORIES.find(c => c.id === catId);
    return cat?.roles || [];
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white text-lg">Players ({players.length})</h3>
              <p className="text-sm text-slate-400">Add players with detailed role information</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Download Template Button */}
              <button
                onClick={async () => {
                  setDownloadingTemplate(true);
                  try {
                    await downloadExcelTemplate(categories);
                  } catch (err) {
                    console.error('Failed to download template:', err);
                  } finally {
                    setDownloadingTemplate(false);
                  }
                }}
                disabled={downloadingTemplate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white border border-slate-600/50"
                title="Download Excel template with dropdowns"
              >
                {downloadingTemplate ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Template
              </button>

              {/* Import Excel Button */}
              <button
                onClick={() => setShowExcelImport(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30"
                title="Import players from Excel file"
              >
                <FileSpreadsheet size={16} />
                Import Excel
              </button>

              {/* Add Player Button */}
              <button
                onClick={() => { setShowForm(!showForm); resetForm(); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  showForm
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                }`}
              >
                {showForm ? <X size={18} /> : <Plus size={18} />}
                {showForm ? 'Cancel' : 'Add Player'}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white text-sm focus:border-primary-500 transition-all w-48"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2 text-sm text-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2 text-sm text-white"
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="unsold">Unsold</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Pending Registrations Section */}
        {pendingPlayers.length > 0 && (
          <div className="border-b border-slate-700/50 bg-amber-500/5">
            <div className="p-4 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <h4 className="font-semibold text-amber-400">Pending Registrations ({pendingPlayers.length})</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">Players awaiting approval - assign category and base price</p>
            </div>

            <div className="p-4 space-y-3">
              {pendingPlayers.map((player) => {
                const roleValue = player.stats?.role;
                return (
                  <div key={player.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    {approvingPlayer?.id === player.id ? (
                      // Approval Form
                      <form onSubmit={handleApprove} className="space-y-4">
                        <div className="flex items-center gap-3 mb-3">
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} className="w-12 h-12 object-cover rounded-xl" />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl flex items-center justify-center text-white font-bold">
                              {player.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white">{player.name}</p>
                            <p className="text-xs text-slate-400">
                              {player.player_uid && <span className="text-cyan-400 font-medium">{player.player_uid}</span>}
                              {player.player_uid && roleValue && ' • '}
                              {roleValue && <span>{getRoleLabel(roleValue)}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Category *</label>
                            <select
                              value={approvalData.category_id}
                              onChange={(e) => setApprovalData({ ...approvalData, category_id: e.target.value })}
                              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:border-primary-500 transition-all"
                              required
                            >
                              <option value="">Select Category</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name} ({formatCompactIndian(cat.base_price)} pts)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Base Price (optional)</label>
                            <input
                              type="number"
                              placeholder="Uses category price"
                              value={approvalData.base_price}
                              onChange={(e) => setApprovalData({ ...approvalData, base_price: e.target.value })}
                              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:border-primary-500 transition-all"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setApprovingPlayer(null); setApprovalData({ category_id: '', base_price: '' }); }}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:scale-105 transition-transform"
                          >
                            Approve
                          </button>
                        </div>
                      </form>
                    ) : (
                      // Player Info with Action Buttons
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} className="w-12 h-12 object-cover rounded-xl" />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl flex items-center justify-center text-white font-bold">
                              {player.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white">{player.name}</p>
                            <p className="text-xs text-slate-400">
                              {player.player_uid && <span className="text-cyan-400 font-medium">{player.player_uid}</span>}
                              {player.player_uid && roleValue && ' • '}
                              {roleValue && <span>{getRoleIcon(roleValue)} {getRoleLabel(roleValue)}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setApprovingPlayer(player)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(player.id, player.name)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {(showForm || editingPlayer) && (
          <form onSubmit={editingPlayer ? handleUpdate : handleSubmit} className="p-5 border-b border-slate-700/50 bg-slate-800/30">
            <h4 className="text-white font-medium mb-4">
              {editingPlayer ? `Edit Player: ${editingPlayer.name}` : 'Add New Player'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Player Name *</label>
                <input
                  type="text"
                  placeholder="Virat Kohli"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Jersey Number</label>
                <input
                  type="text"
                  placeholder="18"
                  value={formData.jersey_number}
                  onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Category *</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({formatCompactIndian(cat.base_price)} pts)
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Type Selection */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Role Type *</label>
                <select
                  value={selectedRoleCategory}
                  onChange={(e) => {
                    setSelectedRoleCategory(e.target.value);
                    setFormData({ ...formData, role: '' });
                  }}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                  required
                >
                  <option value="">Select Role Type</option>
                  {PLAYER_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specific Role Selection */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Specific Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                  required
                  disabled={!selectedRoleCategory}
                >
                  <option value="">{selectedRoleCategory ? 'Select Specific Role' : 'Select Role Type First'}</option>
                  {getRolesForCategory(selectedRoleCategory).map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label} ({role.shortLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Base Price (optional)</label>
                <input
                  type="number"
                  placeholder="Uses category base price"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                />
              </div>
              <div className="lg:col-span-2">
                <ImageUpload
                  label="Player Photo"
                  value={formData.photo_url}
                  onChange={(url) => setFormData({ ...formData, photo_url: url })}
                  folder="player-photos"
                  placeholder="Upload player photo"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              {editingPlayer && (
                <button
                  type="button"
                  onClick={() => { setEditingPlayer(null); resetForm(); }}
                  className="px-6 py-2.5 rounded-xl font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-success hover:scale-105 transition-transform"
              >
                {editingPlayer ? 'Update Player' : 'Create Player'}
              </button>
            </div>
          </form>
        )}

        {/* Players List */}
        <div className="max-h-[600px] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
            {filteredPlayers.slice(0, 100).map((player) => {
              const roleValue = convertLegacyRole(player.stats?.role);
              return (
                <div key={player.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all group">
                  <div className="flex items-start gap-3">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.name}
                        className="w-14 h-14 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center text-2xl">
                        {getRoleIcon(roleValue)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-white truncate">{player.name}</p>
                          <p className="text-xs text-slate-400">
                            {player.player_uid && <span className="text-cyan-400 font-medium">{player.player_uid}</span>}
                            {player.player_uid && player.categories?.name && ' • '}
                            {player.categories?.name}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(player)}
                            className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
                            title="Edit player"
                          >
                            <Edit3 size={14} />
                          </button>
                          {player.status !== 'available' && (
                            <button
                              onClick={() => handleReset(player.id, player.name)}
                              className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                              title="Reset to available"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(player.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete player"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-amber-400">
                            {formatCompactIndian(player.base_price)} pts
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            player.stats?.pending ? 'bg-orange-500/20 text-orange-400' :
                            player.status === 'available' ? 'bg-blue-500/20 text-blue-400' :
                            player.status === 'sold' ? 'bg-green-500/20 text-green-400' :
                            player.status === 'bidding' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {player.stats?.pending ? 'pending' : player.status}
                          </span>
                        </div>
                        {roleValue && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{getRoleIcon(roleValue)}</span>
                            <span className="text-xs text-slate-400">{getRoleShortLabel(roleValue)}</span>
                            <span className="text-xs text-slate-500">• {getRoleLabel(roleValue)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredPlayers.length === 0 && (
            <div className="p-12 text-center">
              <UserPlus size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 mb-2">No players found</p>
              <p className="text-slate-500 text-sm">
                {players.length === 0 ? 'Click "Add Player" to create your first player' : 'Try adjusting your filters'}
              </p>
            </div>
          )}
          {filteredPlayers.length > 100 && (
            <div className="p-4 text-center text-slate-500 text-sm border-t border-slate-700/50">
              Showing first 100 of {filteredPlayers.length} players
            </div>
          )}
        </div>
      </div>

      {/* Excel Import Modal */}
      {showExcelImport && (
        <ExcelImportModal
          categories={categories}
          onClose={() => setShowExcelImport(false)}
          onSuccess={() => {
            loadPlayers();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function CategoriesTab({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', base_price: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCategory({
        name: formData.name,
        base_price: Number(formData.base_price),
      });
      setFormData({ name: '', base_price: '' });
      setShowForm(false);
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to create category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? (Only if no players use it)')) return;
    try {
      await api.deleteCategory(id);
      onRefresh();
    } catch (error: any) {
      alert(error.message || 'Failed to delete category');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="font-semibold text-white text-lg">Categories ({categories.length})</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              showForm
                ? 'bg-slate-700 text-slate-300'
                : 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
            }`}
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Cancel' : 'Add Category'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="p-5 border-b border-slate-700/50 bg-slate-800/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Category Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                required
              />
              <input
                type="number"
                placeholder="Base Price"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
                required
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium hover:scale-105 transition-transform"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-700/30">
          {categories.map((cat) => (
            <div key={cat.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div>
                <p className="font-semibold text-white text-lg">{cat.name}</p>
                <p className="text-sm text-slate-400">
                  Base: {formatCompactIndian(cat.base_price)} pts • {cat.total_players} players
                </p>
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="p-12 text-center">
              <Tag size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 mb-2">No categories created yet</p>
              <p className="text-slate-500 text-sm">Click "Add Category" to create your first category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { tournament, updateTournament } = useAuthStore();
  const [formData, setFormData] = useState({
    name: tournament?.name || '',
    logo_url: tournament?.logo_url || '',
    total_points: tournament?.total_points || 100000,
    min_players: tournament?.min_players || 7,
    max_players: tournament?.max_players || 15,
    bid_increment: tournament?.bid_increment || 1000,
  });
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Auto-fetch current tournament to ensure we have share_code
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const data = await api.getTournament() as any;
        if (data) {
          updateTournament(data);
          setFormData({
            name: data.name || '',
            logo_url: data.logo_url || '',
            total_points: data.total_points || 100000,
            min_players: data.min_players || 7,
            max_players: data.max_players || 15,
            bid_increment: data.bid_increment || 1000,
          });
        }
      } catch (error) {
        console.error('Failed to fetch tournament:', error);
      }
    };
    fetchTournament();
  }, []);

  // Generate URLs - ensure share_code is valid and not "undefined"
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareCode = tournament?.share_code && tournament.share_code !== 'undefined' ? tournament.share_code : '';
  const registrationUrl = shareCode ? `${baseUrl}/register/${shareCode}` : '';
  const liveUrl = shareCode ? `${baseUrl}/live/${shareCode}` : '';
  const overlayUrl = shareCode ? `${baseUrl}/overlay/${shareCode}` : '';

  const copyToClipboard = async (url: string, linkType: string) => {
    // Don't copy empty or invalid URLs
    if (!url || url.includes('undefined')) {
      alert('No valid share code found. Please save your tournament settings first.');
      return;
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(linkType);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Show the URL in an alert as fallback
      alert(`Copy this URL:\n${url}`);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateTournament({
        name: formData.name,
        logo_url: formData.logo_url || undefined,
        total_points: Number(formData.total_points),
        min_players: Number(formData.min_players),
        max_players: Number(formData.max_players),
        bid_increment: Number(formData.bid_increment),
      }) as any;
      updateTournament(updated);
      alert('Settings saved!');
    } catch (error: any) {
      alert(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <h3 className="font-semibold text-white text-lg mb-6">Tournament Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Tournament Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <ImageUpload
                label="Tournament Logo"
                value={formData.logo_url}
                onChange={(url) => setFormData({ ...formData, logo_url: url })}
                folder="tournament-logos"
                placeholder="Upload tournament logo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Team Budget (Points)</label>
              <input
                type="number"
                value={formData.total_points}
                onChange={(e) => setFormData({ ...formData, total_points: Number(e.target.value) })}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Min Players per Team</label>
              <input
                type="number"
                value={formData.min_players}
                onChange={(e) => setFormData({ ...formData, min_players: Number(e.target.value) })}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Max Players per Team</label>
              <input
                type="number"
                value={formData.max_players}
                onChange={(e) => setFormData({ ...formData, max_players: Number(e.target.value) })}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Bid Increment</label>
              <input
                type="number"
                value={formData.bid_increment}
                onChange={(e) => setFormData({ ...formData, bid_increment: Number(e.target.value) })}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Share Code</label>
              <input
                type="text"
                value={tournament?.share_code || ''}
                disabled
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-400"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-primary-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-glow-sm hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Auction Settings - Timer & Sound */}
      <AuctionSettingsCard />

      {/* Overlay Settings - OBS/Streaming customization */}
      <OverlaySettingsCard />

      {/* Player Registration QR Code & Share Links */}
      {(shareCode || tournament) && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary-600/20">
                <QrCode size={24} className="text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Player Self-Registration</h3>
                <p className="text-sm text-slate-400">Share this QR code to let players register themselves</p>
              </div>
            </div>

            {!shareCode ? (
              <div className="col-span-full text-center py-8">
                <p className="text-slate-400">Loading share links...</p>
                <p className="text-sm text-slate-500 mt-2">If this persists, try logging out and logging back in.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={registrationUrl || 'loading'}
                    size={200}
                    level="H"
                  />
                </div>
                <p className="mt-3 text-sm text-slate-400 text-center">
                  Scan to register for auction
                </p>
              </div>

              {/* Links */}
              <div className="space-y-4">
                {/* Registration Link */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
                    <UserPlus size={14} />
                    Player Registration Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={registrationUrl || 'Loading...'}
                      readOnly
                      className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(registrationUrl, 'registration')}
                      disabled={!shareCode}
                      className="px-4 py-2.5 bg-primary-600/20 text-primary-400 rounded-xl hover:bg-primary-600/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {copiedLink === 'registration' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Live View Link with QR */}
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <label className="block text-sm text-slate-400 mb-3 flex items-center gap-2">
                    <Link size={14} />
                    Live Auction View
                  </label>
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-2 rounded-lg shrink-0">
                      <QRCodeSVG
                        value={liveUrl || 'https://loading'}
                        size={80}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-slate-500">Scan to view live auction on any device</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={liveUrl || 'Loading...'}
                          readOnly
                          className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs"
                        />
                        <button
                          onClick={() => copyToClipboard(liveUrl, 'live')}
                          disabled={!shareCode}
                          className="px-3 py-2 bg-primary-600/20 text-primary-400 rounded-lg hover:bg-primary-600/30 transition-colors disabled:opacity-50"
                        >
                          {copiedLink === 'live' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlay Link with QR */}
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <label className="block text-sm text-slate-400 mb-3 flex items-center gap-2">
                    <Link size={14} />
                    OBS Overlay URL
                  </label>
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-2 rounded-lg shrink-0">
                      <QRCodeSVG
                        value={overlayUrl || 'https://loading'}
                        size={80}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-slate-500">For streaming software (OBS, StreamLabs)</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={overlayUrl || 'Loading...'}
                          readOnly
                          className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-xs"
                        />
                        <button
                          onClick={() => copyToClipboard(overlayUrl, 'overlay')}
                          disabled={!shareCode}
                          className="px-3 py-2 bg-primary-600/20 text-primary-400 rounded-lg hover:bg-primary-600/30 transition-colors disabled:opacity-50"
                        >
                          {copiedLink === 'overlay' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        Add <code className="bg-slate-700 px-1 py-0.5 rounded text-xs">?mode=premium</code> for enhanced overlay
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      <ExportSection />
    </div>
  );
}

// Overlay Settings Card for OBS/Streaming overlays
function OverlaySettingsCard() {
  const { tournament, updateTournament } = useAuthStore();
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>(
    tournament?.overlay_settings || defaultOverlaySettings
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareCode = tournament?.share_code || '';
  const baseUrl = window.location.origin;

  // Update local state when tournament changes
  useEffect(() => {
    if (tournament?.overlay_settings) {
      setOverlaySettings(tournament.overlay_settings);
    }
  }, [tournament?.overlay_settings]);

  const handleSettingChange = async <K extends keyof OverlaySettings>(
    key: K,
    value: OverlaySettings[K]
  ) => {
    const newSettings = { ...overlaySettings, [key]: value };
    setOverlaySettings(newSettings);

    // Save to server
    setSaving(true);
    try {
      await api.updateTournament({ overlay_settings: newSettings });
      // Update local auth store
      if (tournament) {
        updateTournament({ ...tournament, overlay_settings: newSettings });
      }
      // Broadcast to connected overlays
      if (tournament?.id) {
        socketClient.emit('overlay:settingsUpdate', { tournamentId: tournament.id, settings: newSettings });
      }
    } catch (error) {
      console.error('Failed to save overlay settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const getOverlayUrl = () => {
    const params = new URLSearchParams();
    if (overlaySettings.theme !== 'auto') {
      params.set('theme', overlaySettings.theme);
    }
    // Map 'full' to 'premium' for URL (OverlayView uses 'premium' for full broadcast mode)
    if (overlaySettings.mode !== 'standard') {
      const modeParam = overlaySettings.mode === 'full' ? 'premium' : overlaySettings.mode;
      params.set('mode', modeParam);
    }
    if (overlaySettings.accentColor !== '#22c55e') {
      params.set('color', overlaySettings.accentColor);
    }
    const queryString = params.toString();
    return `${baseUrl}/overlay/${shareCode}${queryString ? `?${queryString}` : ''}`;
  };

  const copyOverlayUrl = () => {
    navigator.clipboard.writeText(getOverlayUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPreview = () => {
    window.open(getOverlayUrl(), '_blank', 'width=1280,height=720');
  };

  const themeOptions: { value: OverlayTheme; label: string; description: string; colors: string[] }[] = [
    { value: 'auto', label: 'Auto-sync', description: 'Match admin layout', colors: ['#22c55e', '#0ea5e9'] },
    { value: 'classic', label: 'Classic', description: 'Clean, professional', colors: ['#22c55e', '#3b82f6'] },
    { value: 'fire', label: 'Fire', description: 'Embers & flames', colors: ['#f97316', '#ef4444', '#fbbf24'] },
    { value: 'city', label: 'City', description: 'Neon cyberpunk', colors: ['#06b6d4', '#a855f7', '#ec4899'] },
    { value: 'premium', label: 'Premium', description: 'Luxury gold', colors: ['#d4af37', '#ffd700', '#b8860b'] },
  ];

  const modeOptions: { value: OverlayMode; label: string; description: string }[] = [
    { value: 'minimal', label: 'Minimal', description: 'Small floating card' },
    { value: 'standard', label: 'Standard', description: 'Balanced layout' },
    { value: 'full', label: 'Full', description: 'Full broadcast view' },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Monitor size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Overlay Settings</h3>
              <p className="text-xs text-slate-400">Customize OBS/streaming overlays</p>
            </div>
          </div>
          {saving && (
            <span className="text-xs text-cyan-400 animate-pulse">Saving...</span>
          )}
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette size={18} className="text-purple-400" />
              <label className="text-sm text-slate-400">Overlay Theme</label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {themeOptions.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => handleSettingChange('theme', theme.value)}
                  className={`relative p-3 rounded-xl text-left transition-all ${
                    overlaySettings.theme === theme.value
                      ? 'bg-gradient-to-br from-slate-700 to-slate-800 ring-2 ring-cyan-500 scale-[1.02]'
                      : 'bg-slate-700/30 hover:bg-slate-700/50 hover:scale-[1.01]'
                  }`}
                >
                  {/* Color preview dots */}
                  <div className="flex gap-1 mb-2">
                    {theme.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{ background: color, boxShadow: `0 0 8px ${color}50` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-white">{theme.label}</p>
                  <p className="text-xs text-slate-400">{theme.description}</p>
                  {overlaySettings.theme === theme.value && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layout size={18} className="text-blue-400" />
              <label className="text-sm text-slate-400">Display Mode</label>
            </div>
            <div className="flex gap-2">
              {modeOptions.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => handleSettingChange('mode', mode.value)}
                  className={`flex-1 p-3 rounded-xl text-center transition-all ${
                    overlaySettings.mode === mode.value
                      ? 'bg-blue-600/30 border border-blue-500/50 text-white'
                      : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <p className="font-medium">{mode.label}</p>
                  <p className="text-xs opacity-70">{mode.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Effect Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Particles */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <span className="text-sm text-white">Particles</span>
              </div>
              <button
                onClick={() => handleSettingChange('showParticles', !overlaySettings.showParticles)}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  overlaySettings.showParticles ? 'bg-amber-500' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    overlaySettings.showParticles ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30">
              <div className="flex items-center gap-2">
                <Timer size={18} className="text-green-400" />
                <span className="text-sm text-white">Timer</span>
              </div>
              <button
                onClick={() => handleSettingChange('showTimer', !overlaySettings.showTimer)}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  overlaySettings.showTimer ? 'bg-green-500' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    overlaySettings.showTimer ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Team Logo */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                <span className="text-sm text-white">Team Logo</span>
              </div>
              <button
                onClick={() => handleSettingChange('showTeamLogo', !overlaySettings.showTeamLogo)}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  overlaySettings.showTeamLogo ? 'bg-blue-500' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    overlaySettings.showTeamLogo ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette size={18} className="text-pink-400" />
              <label className="text-sm text-slate-400">Accent Color</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={overlaySettings.accentColor}
                onChange={(e) => handleSettingChange('accentColor', e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <input
                type="text"
                value={overlaySettings.accentColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    handleSettingChange('accentColor', e.target.value);
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white text-sm font-mono"
                placeholder="#22c55e"
              />
              <div
                className="w-10 h-10 rounded-lg"
                style={{ background: overlaySettings.accentColor, boxShadow: `0 0 20px ${overlaySettings.accentColor}50` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-700/50">
            <button
              onClick={openPreview}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              <Eye size={18} />
              Preview Overlay
            </button>
            <button
              onClick={copyOverlayUrl}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                copied
                  ? 'bg-green-600/20 border-green-500/50 text-green-400'
                  : 'bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-700'
              }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>

          {/* URL Display */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">OBS Browser Source URL</span>
              <ExternalLink size={12} className="text-slate-500" />
            </div>
            <p className="text-xs text-cyan-400 font-mono break-all">{getOverlayUrl()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuctionSettingsCard() {
  const {
    timerDuration, setTimerDuration,
    soundEnabled, toggleSound,
    soundVolume, setSoundVolume,
    acceleratedMode, toggleAcceleratedMode,
    acceleratedTimerDuration, setAcceleratedTimerDuration,
    showLayoutSelector, toggleLayoutSelector,
    showThemeSelector, toggleThemeSelector,
    showSponsors, toggleSponsors,
    selectedLayout,
    cityBackgroundId, setCityBackground,
    premiumBackgroundId, setPremiumBackground
  } = useUIStore();

  const timerOptions = [15, 20, 30, 45, 60, 90];
  const acceleratedOptions = [5, 10, 15, 20];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <h3 className="font-semibold text-white text-lg mb-6">Auction Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timer Duration */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Timer size={18} className="text-primary-400" />
              <label className="text-sm text-slate-400">Default Timer Duration</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {timerOptions.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => setTimerDuration(seconds)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timerDuration === seconds
                      ? 'bg-primary-600 text-white shadow-glow-sm'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white'
                  }`}
                >
                  {seconds}s
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Time allowed for bidding before timer expires
            </p>
          </div>

          {/* Sound Settings */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Volume2 size={18} className="text-primary-400" />
              <label className="text-sm text-slate-400">Sound Effects</label>
            </div>

            <div className="space-y-4">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Enable Sounds</span>
                <button
                  onClick={toggleSound}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    soundEnabled ? 'bg-primary-600' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      soundEnabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Volume Slider */}
              {soundEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Volume</span>
                    <span className="text-xs text-slate-400">{Math.round(soundVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sponsor Display Settings */}
          <div className="md:col-span-2 pt-4 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                <div>
                  <label className="text-sm text-white font-medium">Show Sponsors</label>
                  <p className="text-xs text-slate-500">Display sponsor banner on auction layouts</p>
                </div>
              </div>
              <button
                onClick={toggleSponsors}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  showSponsors ? 'bg-amber-500' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    showSponsors ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Accelerated Mode Settings */}
          <div className="md:col-span-2 pt-4 border-t border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
                <polygon points="5 4 15 12 5 20 5 4" />
                <polygon points="13 4 23 12 13 20 13 4" />
              </svg>
              <label className="text-sm text-slate-400">Accelerated Auction Mode</label>
              <span className="px-2 py-0.5 text-xs rounded bg-orange-500/20 text-orange-400 font-medium">
                Fast Track
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {/* Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-white">Enable</span>
                <button
                  onClick={toggleAcceleratedMode}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    acceleratedMode ? 'bg-orange-500' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      acceleratedMode ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Accelerated Timer Duration */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Quick Timer:</span>
                {acceleratedOptions.map((seconds) => (
                  <button
                    key={seconds}
                    onClick={() => setAcceleratedTimerDuration(seconds)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      acceleratedTimerDuration === seconds
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white'
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Use accelerated mode for quick re-auctions of unsold players with shorter timers
            </p>
          </div>

          {/* Layout & Theme Selectors */}
          <div className="md:col-span-2 pt-4 border-t border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Layout Selector */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layout size={18} className="text-amber-400" />
                  <label className="text-sm text-slate-400">Layout Template</label>
                </div>
                <button
                  onClick={toggleLayoutSelector}
                  className="w-full flex items-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 text-white hover:from-amber-600/30 hover:to-orange-600/30 transition-all hover:scale-[1.02]"
                >
                  <Layout size={24} className="text-amber-400" />
                  <div className="text-left">
                    <span className="font-bold block">Change Layout</span>
                    <span className="text-xs text-slate-400">How elements are arranged</span>
                  </div>
                </button>
              </div>

              {/* Theme Selector - Only shows when Classic layout is selected */}
              {selectedLayout === 'classic' && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette size={18} className="text-purple-400" />
                    <label className="text-sm text-slate-400">Visual Theme</label>
                  </div>
                  <button
                    onClick={toggleThemeSelector}
                    className="w-full flex items-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-white hover:from-purple-600/30 hover:to-pink-600/30 transition-all hover:scale-[1.02]"
                  >
                    <Palette size={24} className="text-purple-400" />
                    <div className="text-left">
                      <span className="font-bold block">Change Theme</span>
                      <span className="text-xs text-slate-400">Backgrounds and colors</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* City Background Selector - Only shows when City layout is selected */}
          {selectedLayout === 'city' && (
            <div className="md:col-span-2 pt-4 border-t border-slate-700/50">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🌃</span>
                <div>
                  <label className="text-sm text-white font-medium">City Background</label>
                  <p className="text-xs text-slate-500">Choose a background for the City layout</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {cityBackgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setCityBackground(bg.id)}
                    className={`relative group rounded-xl overflow-hidden transition-all ${
                      cityBackgroundId === bg.id
                        ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 scale-105'
                        : 'hover:scale-105 hover:ring-1 hover:ring-slate-500'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video relative">
                      <img
                        src={bg.thumbnail}
                        alt={bg.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Video indicator */}
                      {bg.type === 'video' && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-medium flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          Video
                        </div>
                      )}
                      {/* Selected indicator */}
                      {cityBackgroundId === bg.id && (
                        <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                            <Check size={14} className="text-white" />
                          </div>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Name */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-xs text-white font-medium truncate">{bg.name}</p>
                      {bg.description && (
                        <p className="text-[10px] text-slate-400 truncate">{bg.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Select an image or video background for the City layout. Video backgrounds will loop continuously.
              </p>
            </div>
          )}

          {/* Premium Background Selector - Only shows when Premium Broadcast layout is selected */}
          {selectedLayout === 'premium-broadcast' && (
            <div className="md:col-span-2 pt-4 border-t border-slate-700/50">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✨</span>
                <div>
                  <label className="text-sm text-white font-medium">Premium Background</label>
                  <p className="text-xs text-slate-500">Choose a luxury background for the Premium layout</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {premiumBackgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setPremiumBackground(bg.id)}
                    className={`relative group rounded-xl overflow-hidden transition-all ${
                      premiumBackgroundId === bg.id
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-105'
                        : 'hover:scale-105 hover:ring-1 hover:ring-slate-500'
                    }`}
                  >
                    {/* Background Preview */}
                    <div
                      className="aspect-video relative"
                      style={{
                        background: bg.type === 'gradient' ? bg.value : `url(${bg.value})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: bg.type === 'image' ? `brightness(${bg.brightness || 0.5})` : undefined,
                      }}
                    >
                      {/* Gold particle preview overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-amber-400/40" />
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-300/30 absolute top-2 left-3" />
                        <div className="w-1 h-1 rounded-full bg-amber-500/50 absolute bottom-3 right-2" />
                      </div>

                      {/* Selected indicator */}
                      {premiumBackgroundId === bg.id && (
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                            <Check size={14} className="text-white" />
                          </div>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Name */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-xs text-white font-medium truncate">{bg.name}</p>
                    </div>
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Select a luxury background for the Premium layout. Image backgrounds include Trophy Room, Grand Ballroom, VIP Lounge, Award Stage & Dark Marble.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Layout Selector Modal */}
      {showLayoutSelector && (
        <LayoutSelector onClose={toggleLayoutSelector} />
      )}

      {/* Theme Selector Modal */}
      {showThemeSelector && (
        <ThemeSelector onClose={toggleThemeSelector} />
      )}
    </div>
  );
}
