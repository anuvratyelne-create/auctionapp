import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';
import { api } from '../utils/api';
import { Team, Player, Category } from '../types';
import ProAuctionLayout from '../components/auction/ProAuctionLayout';
import ManagePanel from '../components/manage/ManagePanel';
import SummaryPanel from '../components/summary/SummaryPanel';
import PlayersPanel from '../components/players/PlayersPanel';
import CategoryPanel from '../components/category/CategoryPanel';
import StatsPanel from '../components/stats/StatsPanel';
import RetentionPanel from '../components/retention/RetentionPanel';
import TeamComparisonModal from '../components/comparison/TeamComparisonModal';
import { auctionTemplates } from '../config/auctionTemplates';
import { PLAYER_CATEGORIES } from '../config/playerRoles';
import AnimatedBackground from '../components/auction/AnimatedBackground';
import {
  LayoutDashboard,
  Plus,
  History,
  Gavel,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Users,
  TrendingUp,
  Calendar,
  Sparkles,
  Upload,
  Clock,
  Copy,
  ExternalLink,
  Trash2,
  Edit3,
  UserPlus,
  Grid3X3,
  ToggleLeft,
  ToggleRight,
  Link,
  AlertCircle,
  ArrowRight,
  Settings,
  FileSpreadsheet,
  FileText,
  List,
  ArrowLeft,
  Image,
  Stamp,
  PartyPopper,
  Volume2,
  VolumeX,
  Check,
  Play,
  LayoutGrid,
  Tags,
  Shield,
  BarChart3,
  Maximize,
  GitCompare,
} from 'lucide-react';

type SidebarPanel = 'dashboard' | 'new-auction' | 'my-auctions' | 'auction-detail' | 'auction-panel' | 'profile' | 'teams' | 'create-team' | 'categories' | 'create-category' | 'players-list' | 'create-player' | 'customize-theme';

// Get initial panel from localStorage or default to 'dashboard'
const getInitialPanel = (): SidebarPanel => {
  try {
    const saved = localStorage.getItem('dashboard-panel');
    if (saved && ['dashboard', 'new-auction', 'my-auctions', 'auction-detail', 'auction-panel', 'profile', 'teams', 'create-team', 'categories', 'create-category', 'players-list', 'create-player', 'customize-theme'].includes(saved)) {
      return saved as SidebarPanel;
    }
  } catch {}
  return 'dashboard';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { tournament, user, logout } = useAuthStore();
  const socket = useSocket();

  const [activePanel, setActivePanelState] = useState<SidebarPanel>(getInitialPanel);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Persist panel state
  const setActivePanel = (panel: SidebarPanel) => {
    setActivePanelState(panel);
    try {
      localStorage.setItem('dashboard-panel', panel);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    socket.onTeamsUpdated(() => loadData());
    socket.onPlayersUpdated(() => loadData());
  }, [socket]);

  const loadData = async () => {
    try {
      const [teamsData, playersData, categoriesData] = await Promise.all([
        api.getTeams(),
        api.getPlayers(),
        api.getCategories()
      ]);
      setTeams(teamsData as Team[]);
      setPlayers(playersData as Player[]);
      setCategories(categoriesData as Category[]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { id: 'dashboard' as SidebarPanel, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-auction' as SidebarPanel, label: 'New Auction', icon: Plus },
    { id: 'my-auctions' as SidebarPanel, label: 'My Auctions', icon: History },
    { id: 'auction-panel' as SidebarPanel, label: 'Auction Panel', icon: Gavel },
    { id: 'profile' as SidebarPanel, label: 'My Profile', icon: User },
  ];

  // Stats for dashboard
  const soldPlayers = players.filter(p => p.status === 'sold').length;
  const totalSpent = players.filter(p => p.status === 'sold').reduce((sum, p) => sum + (p.sold_price || 0), 0);

  const renderContent = () => {
    switch (activePanel) {
      case 'dashboard':
        return <DashboardHome
          tournament={tournament}
          teams={teams}
          players={players}
          soldPlayers={soldPlayers}
          totalSpent={totalSpent}
          onNavigate={setActivePanel}
        />;
      case 'new-auction':
        return <NewAuctionPanel onNavigate={setActivePanel} onTournamentCreated={loadData} />;
      case 'my-auctions':
        return <MyAuctionsPanel tournament={tournament} onNavigate={setActivePanel} />;
      case 'auction-detail':
        return <AuctionDetailPanel tournament={tournament} teams={teams} players={players} categories={categories} onNavigate={setActivePanel} />;
      case 'teams':
        return <TeamsListPanel tournament={tournament} teams={teams} onNavigate={setActivePanel} onRefresh={loadData} />;
      case 'create-team':
        return <CreateTeamPanel tournament={tournament} onNavigate={setActivePanel} onTeamCreated={loadData} />;
      case 'categories':
        return <CategoriesListPanel tournament={tournament} categories={categories} onNavigate={setActivePanel} onRefresh={loadData} />;
      case 'create-category':
        return <CreateCategoryPanel tournament={tournament} onNavigate={setActivePanel} onCategoryCreated={loadData} />;
      case 'players-list':
        return <PlayersListPanel tournament={tournament} players={players} categories={categories} onNavigate={setActivePanel} onRefresh={loadData} />;
      case 'create-player':
        return <CreatePlayerPanel tournament={tournament} categories={categories} onNavigate={setActivePanel} onPlayerCreated={loadData} />;
      case 'customize-theme':
        return <CustomizeThemePanel tournament={tournament} onNavigate={setActivePanel} />;
      case 'auction-panel':
        return <ProAuctionLayout />;
      case 'profile':
        return <ProfilePanel user={user} tournament={tournament} />;
      default:
        return <DashboardHome
          tournament={tournament}
          teams={teams}
          players={players}
          soldPlayers={soldPlayers}
          totalSpent={totalSpent}
          onNavigate={setActivePanel}
        />;
    }
  };

  // Full screen mode for auction panel - with all features
  if (activePanel === 'auction-panel') {
    return <FullAuctionLayout onBack={() => setActivePanel('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-40 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-800">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Gavel size={20} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-white text-lg">Auction Pro</h1>
                <p className="text-xs text-slate-500">Management System</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${sidebarCollapsed ? 'justify-center px-3' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={20} className={isActive ? 'text-amber-400' : ''} />
                {!sidebarCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all ${
              sidebarCollapsed ? 'justify-center px-3' : ''
            }`}
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">
                {menuItems.find(m => m.id === activePanel)?.label || 'Dashboard'}
              </p>
              <h2 className="text-2xl font-bold text-white">
                {tournament?.name || 'Player Auction'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {tournament?.share_code && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                  <span className="text-sm text-slate-400">Share Code:</span>
                  <span className="font-mono font-bold text-amber-400">{tournament.share_code}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.mobile?.charAt(0).toUpperCase() || 'U'}
                </div>
                {!sidebarCollapsed && (
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-white">{user?.mobile}</p>
                    <p className="text-xs text-slate-500">Admin</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Dashboard Home Component
interface DashboardHomeProps {
  tournament: any;
  teams: Team[];
  players: Player[];
  soldPlayers: number;
  totalSpent: number;
  onNavigate: (panel: SidebarPanel) => void;
}

function DashboardHome({ tournament, teams, players, soldPlayers, totalSpent, onNavigate }: DashboardHomeProps) {
  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="text-blue-400" />}
          label="Total Teams"
          value={teams.length}
          color="blue"
        />
        <StatCard
          icon={<Trophy className="text-amber-400" />}
          label="Players Sold"
          value={soldPlayers}
          subtext={`of ${players.length}`}
          color="amber"
        />
        <StatCard
          icon={<TrendingUp className="text-green-400" />}
          label="Total Spent"
          value={`₹${totalSpent.toLocaleString('en-IN')}`}
          color="green"
        />
        <StatCard
          icon={<Calendar className="text-purple-400" />}
          label="Status"
          value={tournament?.status || 'Setup'}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            icon={<Plus size={32} />}
            title="New"
            subtitle="Auction"
            onClick={() => onNavigate('new-auction')}
            color="amber"
          />
          <ActionCard
            icon={<History size={32} />}
            title="My"
            subtitle="Auctions"
            onClick={() => onNavigate('my-auctions')}
            color="blue"
          />
          <ActionCard
            icon={<Gavel size={32} />}
            title="Auction"
            subtitle="Panel"
            onClick={() => onNavigate('auction-panel')}
            color="green"
          />
          <ActionCard
            icon={<User size={32} />}
            title="My"
            subtitle="Profile"
            onClick={() => onNavigate('profile')}
            color="purple"
          />
        </div>
      </div>

      {/* Current Auction Info */}
      {tournament && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Current Auction</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              tournament.status === 'live'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {tournament.status?.toUpperCase() || 'SETUP'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-500">Tournament</p>
              <p className="text-white font-medium">{tournament.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Team Budget</p>
              <p className="text-white font-medium">₹{tournament.total_points?.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Min Players</p>
              <p className="text-white font-medium">{tournament.min_players}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Max Players</p>
              <p className="text-white font-medium">{tournament.max_players}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('auction-panel')}
            className="mt-6 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Gavel size={20} />
            Open Auction Panel
          </button>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: 'blue' | 'amber' | 'green' | 'purple';
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-slate-900/50 rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-sm text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">
        {value}
        {subtext && <span className="text-sm text-slate-500 font-normal ml-1">{subtext}</span>}
      </p>
    </div>
  );
}

// Action Card Component
interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  color: 'amber' | 'blue' | 'green' | 'purple';
}

function ActionCard({ icon, title, subtitle, onClick, color }: ActionCardProps) {
  const colorClasses = {
    amber: 'hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-400',
    blue: 'hover:border-blue-500/50 hover:bg-blue-500/5 text-blue-400',
    green: 'hover:border-green-500/50 hover:bg-green-500/5 text-green-400',
    purple: 'hover:border-purple-500/50 hover:bg-purple-500/5 text-purple-400',
  };

  return (
    <button
      onClick={onClick}
      className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] ${colorClasses[color]}`}
    >
      <div className="mb-4 opacity-80">{icon}</div>
      <p className="text-2xl font-bold text-white">{title}</p>
      <p className="text-slate-400">{subtitle}</p>
    </button>
  );
}

// New Auction Panel with Form
function NewAuctionPanel({ onNavigate, onTournamentCreated }: { onNavigate: (panel: SidebarPanel) => void; onTournamentCreated: () => void }) {
  const { user, setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    logo: null as File | null,
    logoPreview: '',
    auctionName: '',
    auctionDate: '',
    auctionTime: '',
    pointsPerTeam: 1000000,
    baseBid: 10000,
    bidIncreaseBy: 5000,
    maxPlayersPerTeam: 18,
    minPlayersPerTeam: 15,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file)
      }));
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      // For now, we'll use a data URL as a fallback if no upload service is configured
      // In production, this should upload to Supabase storage
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.error('Logo upload failed:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.auctionName.trim()) {
      setError('Auction name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload logo if provided
      let logoUrl: string | null = null;
      if (formData.logo) {
        logoUrl = await uploadLogo(formData.logo);
      }

      // Create tournament
      const response = await api.createTournament({
        name: formData.auctionName,
        logo_url: logoUrl,
        sports_type: 'cricket',
        auction_date: formData.auctionDate || null,
        auction_time: formData.auctionTime || null,
        total_points: formData.pointsPerTeam,
        default_base_bid: formData.baseBid,
        bid_increment: formData.bidIncreaseBy,
        min_players: formData.minPlayersPerTeam,
        max_players: formData.maxPlayersPerTeam,
      });

      // Update auth store with new token and tournament
      api.setToken(response.token);
      if (user) {
        setAuth(user, response.tournament, response.token);
      }

      // Refresh data and navigate to auction detail
      onTournamentCreated();
      onNavigate('auction-detail');
    } catch (err: any) {
      setError(err.message || 'Failed to create auction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
          CREATE AUCTION
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Auction Logo */}
        <div className="flex items-start gap-8">
          <label className="text-slate-400 w-40 pt-2 flex-shrink-0">Auction Logo</label>
          <div className="flex-1">
            <label className="cursor-pointer block">
              <div className="w-32 h-32 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center hover:border-amber-500/50 transition-colors overflow-hidden bg-slate-800/50">
                {formData.logoPreview ? (
                  <img src={formData.logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload size={32} className="text-slate-500 mb-2" />
                    <span className="text-xs text-slate-500">Upload Logo</span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Sports Type (Cricket Only) */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Sports Type*</label>
          <div className="flex-1">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white flex items-center gap-2">
              <span>🏏</span>
              <span>Cricket</span>
              <span className="ml-auto text-xs text-slate-500">(Fixed)</span>
            </div>
          </div>
        </div>

        {/* Auction Name */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Auction Name*</label>
          <div className="flex-1">
            <input
              type="text"
              value={formData.auctionName}
              onChange={(e) => setFormData(prev => ({ ...prev, auctionName: e.target.value }))}
              placeholder="Enter auction name"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              required
            />
          </div>
        </div>

        {/* Auction Date & Time */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Auction Date*</label>
          <div className="flex-1 flex gap-4">
            <div className="flex-1 relative">
              <input
                type="date"
                value={formData.auctionDate}
                onChange={(e) => setFormData(prev => ({ ...prev, auctionDate: e.target.value }))}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                required
              />
            </div>
            <div className="flex-1">
              <div className="relative">
                <input
                  type="time"
                  value={formData.auctionTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, auctionTime: e.target.value }))}
                  placeholder="hh:mm"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-500 mt-1">Auction Time</p>
            </div>
          </div>
        </div>

        {/* Points Per Team */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Points Per Team*</label>
          <div className="flex-1">
            <input
              type="number"
              value={formData.pointsPerTeam}
              onChange={(e) => setFormData(prev => ({ ...prev, pointsPerTeam: parseInt(e.target.value) || 0 }))}
              placeholder="Points"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Default: ₹10,00,000</p>
          </div>
        </div>

        {/* Base Bid */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Base Bid*</label>
          <div className="flex-1">
            <input
              type="number"
              value={formData.baseBid}
              onChange={(e) => setFormData(prev => ({ ...prev, baseBid: parseInt(e.target.value) || 0 }))}
              placeholder="Minimum Bid"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Default: ₹10,000</p>
          </div>
        </div>

        {/* Bid Increase By */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Bid Increase by*</label>
          <div className="flex-1">
            <input
              type="number"
              value={formData.bidIncreaseBy}
              onChange={(e) => setFormData(prev => ({ ...prev, bidIncreaseBy: parseInt(e.target.value) || 0 }))}
              placeholder="Bid Increase"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Default: ₹5,000</p>
          </div>
        </div>

        {/* Player Per Team (Max) */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Player Per Team*</label>
          <div className="flex-1 flex items-center gap-4">
            <input
              type="number"
              value={formData.maxPlayersPerTeam}
              onChange={(e) => setFormData(prev => ({ ...prev, maxPlayersPerTeam: parseInt(e.target.value) || 0 }))}
              placeholder="Max players"
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              required
            />
            <span className="text-slate-500 text-sm">(Max Limit)</span>
          </div>
        </div>

        {/* Player Per Team (Min) */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Player Per Team</label>
          <div className="flex-1 flex items-center gap-4">
            <input
              type="number"
              value={formData.minPlayersPerTeam}
              onChange={(e) => setFormData(prev => ({ ...prev, minPlayersPerTeam: parseInt(e.target.value) || 0 }))}
              placeholder="Min players"
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            <span className="text-slate-500 text-sm">(Min Limit)</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-8">
            <div className="w-40 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center gap-8 pt-4">
          <div className="w-40 flex-shrink-0"></div>
          <div className="flex-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-12 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creating...
                </>
              ) : (
                'SUBMIT'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// My Auctions Panel
function MyAuctionsPanel({ tournament, onNavigate }: { tournament: any; onNavigate: (panel: SidebarPanel) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Your Auctions</h3>

      {tournament ? (
        <div
          className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-amber-500/50 transition-all"
          onClick={() => onNavigate('auction-detail')}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl flex items-center justify-center border border-amber-500/30">
              <Trophy size={28} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-white">{tournament.name}</h4>
              <p className="text-slate-400">Share Code: {tournament.share_code}</p>
            </div>
            <span className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tournament.status === 'live'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : tournament.status === 'completed'
                ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {tournament.status?.toUpperCase() || 'SETUP'}
            </span>
            <ArrowRight size={20} className="text-slate-500" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">₹{tournament.total_points?.toLocaleString('en-IN')}</p>
              <p className="text-sm text-slate-500">Budget per Team</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{tournament.min_players}-{tournament.max_players}</p>
              <p className="text-sm text-slate-500">Players Range</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">₹{tournament.bid_increment?.toLocaleString('en-IN')}</p>
              <p className="text-sm text-slate-500">Bid Increment</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
          <History size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No auctions found</p>
        </div>
      )}
    </div>
  );
}

// Auction Detail Panel - Based on superplayerauction.com reference
interface AuctionDetailPanelProps {
  tournament: any;
  teams: Team[];
  players: Player[];
  categories: Category[];
  onNavigate: (panel: SidebarPanel) => void;
}

function AuctionDetailPanel({ tournament, teams, players, categories, onNavigate }: AuctionDetailPanelProps) {
  const [selfRegistrationEnabled, setSelfRegistrationEnabled] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const baseUrl = window.location.origin;
  const publicViewUrl = `${baseUrl}/live/${tournament?.share_code}`;
  const overlayUrl = `${baseUrl}/overlay/${tournament?.share_code}`;
  const registrationUrl = `${baseUrl}/register/${tournament?.share_code}`;

  const copyToClipboard = (text: string, linkType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(linkType);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const soldPlayers = players.filter(p => p.status === 'sold').length;
  const availablePlayers = players.filter(p => p.status === 'available').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">
          HOME
        </button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">
          DASHBOARD
        </button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('my-auctions')} className="text-slate-500 hover:text-white transition-colors">
          MY AUCTION
        </button>
        <span className="text-slate-600">&gt;</span>
        <span className="text-amber-400">AUCTION DETAIL</span>
      </div>

      {/* Go to Auction Panel Link */}
      <div className="flex justify-end">
        <button
          onClick={() => onNavigate('auction-panel')}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span>Go to Auction Panel</span>
          <ExternalLink size={16} />
        </button>
      </div>

      {/* Auction Info Card */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Auction Logo */}
          <div className="w-24 h-24 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl flex items-center justify-center border border-amber-500/30 flex-shrink-0">
            {tournament?.logo_url ? (
              <img src={tournament.logo_url} alt={tournament.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Trophy size={40} className="text-amber-400" />
            )}
          </div>

          {/* Auction Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{tournament?.name || 'Auction'}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">A-Code:</span>
                <span className="font-mono text-amber-400 font-bold">{tournament?.share_code}</span>
              </div>
              {tournament?.auction_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-500" />
                  <span className="text-slate-400">{tournament.auction_date}</span>
                </div>
              )}
              {tournament?.auction_time && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-500" />
                  <span className="text-slate-400">{tournament.auction_time}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('teams')}
              className="w-12 h-12 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 transition-colors relative"
              title="Teams"
            >
              <Users size={20} />
              {teams.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                  {teams.length}
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('categories')}
              className="w-12 h-12 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl flex items-center justify-center text-purple-400 transition-colors relative"
              title="Categories"
            >
              <Grid3X3 size={20} />
              {categories.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                  {categories.length}
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('players-list')}
              className="w-12 h-12 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl flex items-center justify-center text-green-400 transition-colors relative"
              title="Players"
            >
              <UserPlus size={20} />
              {players.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                  {players.length}
                </span>
              )}
            </button>
            <button
              className="w-12 h-12 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 transition-colors"
              title="Edit"
            >
              <Edit3 size={20} />
            </button>
            <button
              className="w-12 h-12 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats and Links Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Stats */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">Balance / Team</p>
              <p className="text-xl font-bold text-white">₹{tournament?.total_points?.toLocaleString('en-IN') || '10,00,000'}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">Base Bid</p>
              <p className="text-xl font-bold text-white">₹{tournament?.default_base_bid?.toLocaleString('en-IN') || '10,000'}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">Bid Increment</p>
              <p className="text-xl font-bold text-white">₹{tournament?.bid_increment?.toLocaleString('en-IN') || '5,000'}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">Players</p>
              <p className="text-xl font-bold text-white">{tournament?.min_players || 15} - {tournament?.max_players || 18}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="pt-4 border-t border-slate-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-400">{teams.length}</p>
                <p className="text-xs text-slate-500">Teams</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{soldPlayers}</p>
                <p className="text-xs text-slate-500">Sold</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{availablePlayers}</p>
                <p className="text-xs text-slate-500">Available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Links */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          {/* Auction Panel Link */}
          <button
            onClick={() => onNavigate('auction-panel')}
            className="w-full flex items-center justify-between bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Gavel size={24} className="text-amber-400" />
              <span className="font-semibold text-white">Auction Panel</span>
            </div>
            <ArrowRight size={20} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Public View URL */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Public View URL</span>
              <a href={publicViewUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                <ExternalLink size={16} />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={publicViewUrl}
                readOnly
                className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono"
              />
              <button
                onClick={() => copyToClipboard(publicViewUrl, 'public')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  copiedLink === 'public'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {copiedLink === 'public' ? 'Copied!' : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Overlay URL */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Overlay Link (OBS/Streaming)</span>
              <a href={overlayUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                <ExternalLink size={16} />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={overlayUrl}
                readOnly
                className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono"
              />
              <button
                onClick={() => copyToClipboard(overlayUrl, 'overlay')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  copiedLink === 'overlay'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {copiedLink === 'overlay' ? 'Copied!' : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Player Self Registration Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Player Self Registration</h3>
            <p className="text-sm text-slate-500">Allow players to register themselves for the auction</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm transition-colors">
              Set Limit
            </button>
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm transition-colors flex items-center gap-2">
              <Settings size={16} />
              Form Customization
            </button>
            <button
              onClick={() => setSelfRegistrationEnabled(!selfRegistrationEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                selfRegistrationEnabled
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {selfRegistrationEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              {selfRegistrationEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {selfRegistrationEnabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
              <AlertCircle size={18} className="text-green-400" />
              <span className="text-sm text-green-400">Player self-registration is now active. Share the link below with players.</span>
            </div>

            {/* Registration Link */}
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Registration Link</span>
                <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                  <ExternalLink size={16} />
                </a>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={registrationUrl}
                  readOnly
                  className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono"
                />
                <button
                  onClick={() => copyToClipboard(registrationUrl, 'registration')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    copiedLink === 'registration'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {copiedLink === 'registration' ? 'Copied!' : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Share Options */}
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-white text-sm transition-colors">
                <span>WhatsApp</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm transition-colors">
                <span>Telegram</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white text-sm transition-colors">
                <Link size={16} />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customize Auction Theme Section */}
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border-l-4 border-purple-500 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-white text-lg">
              <span className="font-semibold">Customize your Auction Theme</span>, also various things
              <span className="text-slate-300"> (Background, Stamps, Sold Effects, audio)</span>
            </p>
          </div>
          <button
            onClick={() => onNavigate('customize-theme')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
          >
            Customize
          </button>
        </div>
      </div>

      {/* Start Auction Section */}
      <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Gavel size={24} className="text-amber-400" />
              Start Auction
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Review the requirements below before starting the auction
            </p>

            {/* Requirements Checklist */}
            <div className="space-y-3">
              {/* Teams Requirement */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  teams.length >= 2 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {teams.length >= 2 ? '✓' : '✗'}
                </div>
                <span className="text-slate-300">
                  Teams: <span className={teams.length >= 2 ? 'text-green-400' : 'text-red-400'}>{teams.length}</span>
                  <span className="text-slate-500"> / Min: 2, Max: 20</span>
                </span>
                {teams.length < 2 && (
                  <button
                    onClick={() => onNavigate('create-team')}
                    className="text-xs text-amber-400 hover:text-amber-300 underline"
                  >
                    Add Teams
                  </button>
                )}
              </div>

              {/* Players Requirement */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  players.length >= 22 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {players.length >= 22 ? '✓' : '✗'}
                </div>
                <span className="text-slate-300">
                  Players: <span className={players.length >= 22 ? 'text-green-400' : 'text-red-400'}>{players.length}</span>
                  <span className="text-slate-500"> / Min: 22, Max: 300</span>
                </span>
                {players.length < 22 && (
                  <button
                    onClick={() => onNavigate('create-player')}
                    className="text-xs text-amber-400 hover:text-amber-300 underline"
                  >
                    Add Players
                  </button>
                )}
              </div>

              {/* Categories Requirement */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  categories.length >= 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {categories.length >= 1 ? '✓' : '✗'}
                </div>
                <span className="text-slate-300">
                  Categories: <span className={categories.length >= 1 ? 'text-green-400' : 'text-red-400'}>{categories.length}</span>
                  <span className="text-slate-500"> / Min: 1</span>
                </span>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="flex flex-col items-center gap-3">
            {(() => {
              const teamsOk = teams.length >= 2 && teams.length <= 20;
              const playersOk = players.length >= 22 && players.length <= 300;
              const categoriesOk = categories.length >= 1;
              const canStart = teamsOk && playersOk && categoriesOk;

              return (
                <>
                  <button
                    onClick={() => canStart && onNavigate('auction-panel')}
                    disabled={!canStart}
                    className={`px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-3 ${
                      canStart
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Gavel size={24} />
                    START AUCTION
                  </button>
                  {!canStart && (
                    <p className="text-xs text-red-400">
                      Complete all requirements to start
                    </p>
                  )}
                  {canStart && (
                    <p className="text-xs text-green-400">
                      All requirements met! Ready to start
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-6 pt-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{teams.length}</p>
            <p className="text-xs text-slate-500">Teams Ready</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{players.filter(p => p.status === 'available').length}</p>
            <p className="text-xs text-slate-500">Players Available</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{categories.length}</p>
            <p className="text-xs text-slate-500">Categories</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">₹{tournament?.total_points?.toLocaleString('en-IN') || '0'}</p>
            <p className="text-xs text-slate-500">Budget / Team</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Panel
function ProfilePanel({ user, tournament }: { user: any; tournament: any }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Card */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
            {user?.mobile?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{user?.mobile || 'User'}</h3>
            <p className="text-slate-400">Tournament Admin</p>
            <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm border border-green-500/30">
              <Sparkles size={14} />
              Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-500 mb-1">User ID</p>
            <p className="text-white font-mono text-sm">{user?.id || 'N/A'}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-500 mb-1">Mobile</p>
            <p className="text-white">{user?.mobile || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Tournament Info */}
      {tournament && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Current Tournament</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Name</span>
              <span className="text-white">{tournament.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Share Code</span>
              <span className="text-amber-400 font-mono">{tournament.share_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className="text-white capitalize">{tournament.status}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Teams List Panel
function TeamsListPanel({ tournament, teams, onNavigate, onRefresh }: { tournament: any; teams: Team[]; onNavigate: (panel: SidebarPanel) => void; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    setDeleting(teamId);
    try {
      await api.deleteTeam(teamId);
      onRefresh();
    } catch (err) {
      alert('Failed to delete team');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">HOME</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('my-auctions')} className="text-slate-500 hover:text-white transition-colors">MY AUCTION</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('auction-detail')} className="text-slate-500 hover:text-white transition-colors">AUCTION DETAIL</button>
        <span className="text-slate-600">&gt;</span>
        <span className="text-amber-400">TEAM</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-amber-400 uppercase">{tournament?.name}</p>
          <h2 className="text-3xl font-bold text-white">TEAM</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors" title="Copy">
            <Copy size={18} />
          </button>
          <button className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors flex items-center gap-2">
            <FileSpreadsheet size={18} />
            EXCEL
          </button>
          <button className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors flex items-center gap-2">
            <FileText size={18} />
            PDF
          </button>
          <button className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors" title="List View">
            <List size={18} />
          </button>
          <button
            onClick={() => onNavigate('create-team')}
            className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-xl text-white font-semibold transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            ADD
          </button>
        </div>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <Users size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No teams added yet</p>
          <button
            onClick={() => onNavigate('create-team')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-xl text-white font-semibold transition-colors"
          >
            Add First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-500">{team.short_name}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{team.name}</h3>
                  <p className="text-sm text-slate-400">{team.short_name} • Key: {team.keyboard_key || '-'}</p>
                  <p className="text-sm text-green-400">₹{team.remaining_budget?.toLocaleString('en-IN') || team.total_budget?.toLocaleString('en-IN')}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition-colors">
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    disabled={deleting === team.id}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => onNavigate('auction-detail')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Auction Detail
      </button>
    </div>
  );
}

// Create Team Panel
function CreateTeamPanel({ tournament, onNavigate, onTeamCreated }: { tournament: any; onNavigate: (panel: SidebarPanel) => void; onTeamCreated: () => void }) {
  const [formData, setFormData] = useState({
    logo: null as File | null,
    logoPreview: '',
    name: '',
    shortName: '',
    shortcutKey: '',
    ownerName: '',
    totalBudget: tournament?.total_points || 1000000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availableKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file)
      }));
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }
    if (!formData.shortName.trim()) {
      setError('Short name is required');
      return;
    }
    if (formData.shortName.length > 5) {
      setError('Short name must be 5 characters or less');
      return;
    }

    setIsSubmitting(true);

    try {
      let logoUrl: string | undefined;
      if (formData.logo) {
        logoUrl = await uploadLogo(formData.logo) || undefined;
      }

      await api.createTeam({
        name: formData.name,
        short_name: formData.shortName.toUpperCase(),
        logo_url: logoUrl,
        keyboard_key: formData.shortcutKey || undefined,
        owner_name: formData.ownerName || undefined,
        total_budget: formData.totalBudget,
      });

      onTeamCreated();

      if (addAnother) {
        // Reset form for adding another
        setFormData({
          logo: null,
          logoPreview: '',
          name: '',
          shortName: '',
          shortcutKey: '',
          ownerName: '',
          totalBudget: tournament?.total_points || 1000000,
        });
      } else {
        onNavigate('teams');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">HOME</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('auction-detail')} className="text-slate-500 hover:text-white transition-colors">AUCTION DETAIL</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('teams')} className="text-slate-500 hover:text-white transition-colors">TEAM</button>
        <span className="text-slate-600">&gt;</span>
        <span className="text-amber-400">CREATE TEAM</span>
      </div>

      {/* Header */}
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
        CREATE TEAM
      </h2>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Team Logo */}
        <div className="flex items-start gap-8">
          <label className="text-slate-400 w-40 pt-2 flex-shrink-0">Team Logo</label>
          <div className="flex-1">
            <label className="cursor-pointer block">
              <div className="w-32 h-32 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center hover:border-blue-500/50 transition-colors overflow-hidden bg-slate-800/50">
                {formData.logoPreview ? (
                  <img src={formData.logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload size={32} className="text-slate-500 mb-2" />
                    <span className="text-xs text-slate-500">Upload Logo</span>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
          </div>
        </div>

        {/* Team Name */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Team Name *</label>
          <div className="flex-1">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter team name"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>
        </div>

        {/* Short Name */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Team Short Name *</label>
          <div className="flex-1">
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value.toUpperCase().slice(0, 5) }))}
              placeholder="e.g., CSK"
              maxLength={5}
              className="w-48 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors uppercase"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Max 5 characters</p>
          </div>
        </div>

        {/* Shortcut Key */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Shortcut Key *</label>
          <div className="flex-1">
            <select
              value={formData.shortcutKey}
              onChange={(e) => setFormData(prev => ({ ...prev, shortcutKey: e.target.value }))}
              className="w-32 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
            >
              <option value="">Select</option>
              {availableKeys.map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Keyboard shortcut for quick bidding</p>
          </div>
        </div>

        {/* Owner Name (Optional) */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Owner Name</label>
          <div className="flex-1">
            <input
              type="text"
              value={formData.ownerName}
              onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
              placeholder="Enter owner name (optional)"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-8">
            <div className="w-40 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-8 pt-4">
          <div className="w-40 flex-shrink-0"></div>
          <div className="flex-1 flex gap-4">
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, true)}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-xl transition-all"
            >
              {isSubmitting ? 'SAVING...' : 'SAVE AND ADD NEW'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-xl transition-all"
            >
              {isSubmitting ? 'ADDING...' : 'ADD TEAM'}
            </button>
          </div>
        </div>
      </form>

      {/* Back Button */}
      <button
        onClick={() => onNavigate('teams')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Teams
      </button>
    </div>
  );
}

// Categories List Panel
function CategoriesListPanel({ tournament, categories, onNavigate, onRefresh }: { tournament: any; categories: Category[]; onNavigate: (panel: SidebarPanel) => void; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    setDeleting(categoryId);
    try {
      await api.deleteCategory(categoryId);
      onRefresh();
    } catch (err) {
      alert('Failed to delete category');
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateStandardPrices = async () => {
    if (!confirm('Update all categories to standard prices?\n\nPlatinum: 50,000\nGold: 30,000\nSilver: 20,000\nBronze: 10,000')) return;
    setUpdating(true);
    try {
      await api.updateStandardCategoryPrices();
      onRefresh();
      alert('Categories updated successfully!');
    } catch (err) {
      alert('Failed to update categories');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">HOME</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('auction-detail')} className="text-slate-500 hover:text-white transition-colors">AUCTION DETAIL</button>
        <span className="text-slate-600">&gt;</span>
        <span className="text-amber-400">CATEGORY</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-amber-400 uppercase">{tournament?.name}</p>
          <h2 className="text-3xl font-bold text-white">CATEGORY</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpdateStandardPrices}
            disabled={updating}
            className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl text-white font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Set Standard Prices'}
          </button>
          <button
            onClick={() => onNavigate('create-category')}
            className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-xl text-white font-semibold transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            ADD
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <Grid3X3 size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No categories added yet</p>
          <button
            onClick={() => onNavigate('create-category')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold"
          >
            Add First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <div key={category.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white">{category.name}</h3>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400">
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    disabled={deleting === category.id}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-lg font-semibold text-green-400">₹{category.base_price?.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500">Base Price</p>
            </div>
          ))}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => onNavigate('auction-detail')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Auction Detail
      </button>
    </div>
  );
}

// Create Category Panel
function CreateCategoryPanel({ tournament: _tournament, onNavigate, onCategoryCreated }: { tournament: any; onNavigate: (panel: SidebarPanel) => void; onCategoryCreated: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    basePrice: 10000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.createCategory({
        name: formData.name,
        base_price: formData.basePrice,
      });

      onCategoryCreated();

      if (addAnother) {
        setFormData({ name: '', basePrice: 10000 });
      } else {
        onNavigate('categories');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">HOME</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('auction-detail')} className="text-slate-500 hover:text-white transition-colors">AUCTION DETAIL</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('categories')} className="text-slate-500 hover:text-white transition-colors">CATEGORY</button>
        <span className="text-slate-600">&gt;</span>
        <span className="text-amber-400">CREATE CATEGORY</span>
      </div>

      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
        CREATE CATEGORY
      </h2>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Category Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Platinum, Gold"
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            required
          />
        </div>

        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Base Price *</label>
          <div className="flex-1">
            <input
              type="number"
              value={formData.basePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 0 }))}
              className="w-48 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Starting bid price for players in this category</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any, true)}
            disabled={isSubmitting}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
          >
            SAVE AND ADD NEW
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-xl transition-all"
          >
            {isSubmitting ? 'ADDING...' : 'ADD CATEGORY'}
          </button>
        </div>
      </form>

      <button
        onClick={() => onNavigate('categories')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Categories
      </button>
    </div>
  );
}

// Players List Panel
function PlayersListPanel({ tournament, players, categories, onNavigate, onRefresh }: { tournament: any; players: Player[]; categories: Category[]; onNavigate: (panel: SidebarPanel) => void; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (playerId: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;
    setDeleting(playerId);
    try {
      await api.deletePlayer(playerId);
      onRefresh();
    } catch (err) {
      alert('Failed to delete player');
    } finally {
      setDeleting(null);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">HOME</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('auction-detail')} className="text-slate-500 hover:text-white transition-colors">AUCTION DETAIL</button>
        <span className="text-slate-600">&gt;</span>
        <span className="text-amber-400">PLAYERS</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-amber-400 uppercase">{tournament?.name}</p>
          <h2 className="text-3xl font-bold text-white">PLAYERS</h2>
        </div>
        <button
          onClick={() => onNavigate('create-player')}
          className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl text-white font-semibold transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          ADD
        </button>
      </div>

      {/* Players Grid */}
      {players.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <UserPlus size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No players added yet</p>
          <button
            onClick={() => onNavigate('create-player')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-semibold"
          >
            Add First Player
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => (
            <div key={player.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {player.photo_url ? (
                    <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{player.name}</h3>
                  <p className="text-sm text-slate-400">{getCategoryName(player.category_id)} • #{player.jersey_number || '-'}</p>
                  <p className="text-sm text-green-400">₹{player.base_price?.toLocaleString('en-IN')}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`text-xs px-2 py-1 rounded ${
                    player.status === 'sold' ? 'bg-green-500/20 text-green-400' :
                    player.status === 'unsold' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {player.status}
                  </span>
                  <button
                    onClick={() => handleDelete(player.id)}
                    disabled={deleting === player.id}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 disabled:opacity-50 self-end"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onNavigate('auction-detail')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Auction Detail
      </button>
    </div>
  );
}

// Create Player Panel
function CreatePlayerPanel({ tournament, categories, onNavigate, onPlayerCreated }: { tournament: any; categories: Category[]; onNavigate: (panel: SidebarPanel) => void; onPlayerCreated: () => void }) {
  const [formData, setFormData] = useState({
    photo: null as File | null,
    photoPreview: '',
    formNo: '',
    name: '',
    fatherName: '',
    age: '',
    mobileNo: '',
    roleCategory: '',
    role: '',
    categoryId: categories[0]?.id || '',
    basePrice: categories[0]?.base_price || 10000,
    jerseyNumber: '',
    jerseyName: '',
    tshirtSize: '',
    trouserSize: '',
    detail: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const baseUrl = window.location.origin;
  const registrationUrl = `${baseUrl}/register/${tournament?.share_code}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(registrationUrl)}`;

  const sizes = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  const getRolesForCategory = (catId: string) => {
    const cat = PLAYER_CATEGORIES.find(c => c.id === catId);
    return cat?.roles || [];
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        photo: file,
        photoPreview: URL.createObjectURL(file)
      }));
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setFormData(prev => ({
      ...prev,
      categoryId,
      basePrice: category?.base_price || prev.basePrice,
    }));
  };

  const copyRegistrationLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Player name is required');
      return;
    }
    if (!formData.categoryId) {
      setError('Please select a category');
      return;
    }
    if (!formData.role) {
      setError('Please select a playing role');
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl: string | undefined;
      if (formData.photo) {
        photoUrl = await uploadPhoto(formData.photo) || undefined;
      }

      await api.createPlayer({
        name: formData.name,
        jersey_number: formData.jerseyNumber || undefined,
        photo_url: photoUrl,
        category_id: formData.categoryId,
        base_price: formData.basePrice,
        stats: {
          formNo: formData.formNo,
          fatherName: formData.fatherName,
          age: formData.age,
          mobileNo: formData.mobileNo,
          role: formData.role,
          jerseyName: formData.jerseyName,
          tshirtSize: formData.tshirtSize,
          trouserSize: formData.trouserSize,
          detail: formData.detail,
        },
      });

      onPlayerCreated();

      if (addAnother) {
        setFormData(prev => ({
          ...prev,
          photo: null,
          photoPreview: '',
          formNo: '',
          name: '',
          fatherName: '',
          age: '',
          mobileNo: '',
          role: '',
          jerseyNumber: '',
          jerseyName: '',
          detail: '',
        }));
      } else {
        onNavigate('players-list');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create player');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">HOME</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('auction-detail')} className="text-slate-500 hover:text-white transition-colors">AUCTION DETAIL</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('players-list')} className="text-slate-500 hover:text-white transition-colors">PLAYERS</button>
        <span className="text-slate-600">&gt;</span>
        <span className="text-amber-400">ADD PLAYER</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-6">
            ADD PLAYERS
          </h2>

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
            {/* Row 1: Photo + Form No/Age */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <label className="text-slate-400 w-24 pt-2 flex-shrink-0 text-sm">Profile Pic</label>
                <label className="cursor-pointer">
                  <div className="w-24 h-28 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center hover:border-green-500/50 transition-colors overflow-hidden bg-slate-800/50">
                    {formData.photoPreview ? (
                      <img src={formData.photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={24} className="text-slate-500" />
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Form No</label>
                  <input
                    type="text"
                    value={formData.formNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, formNo: e.target.value }))}
                    placeholder="Enter Form Number"
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 text-sm"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="Age"
                    className="w-24 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Name + Father Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter Name"
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 text-sm"
                  required
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Father Name</label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fatherName: e.target.value }))}
                  placeholder="Enter Father Name"
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 text-sm"
                />
              </div>
            </div>

            {/* Row 3: Mobile + Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Mobile No</label>
                <input
                  type="tel"
                  value={formData.mobileNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, mobileNo: e.target.value }))}
                  placeholder="Mobile Number"
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 text-sm"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Category *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500/50 text-sm"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} - {cat.base_price.toLocaleString('en-IN')} pts
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Playing Role - Two-step selection like ManagePanel */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Role Type</label>
                <div className="flex gap-2 flex-wrap">
                  {PLAYER_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, roleCategory: cat.id, role: '' }))}
                      className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all text-sm ${
                        formData.roleCategory === cat.id
                          ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                          : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Role dropdown - appears when role type is selected */}
              {formData.roleCategory && (
                <div className="flex items-center gap-4">
                  <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Specific Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/50"
                    required
                  >
                    <option value="">Select Specific Role</option>
                    {getRolesForCategory(formData.roleCategory).map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label} ({role.shortLabel})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Row 4: T-shirt Size + Jersey Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">T-shirt Size</label>
                <select
                  value={formData.tshirtSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, tshirtSize: e.target.value }))}
                  className="w-32 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500/50 text-sm"
                >
                  <option value="">Select</option>
                  {sizes.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Jersey Name</label>
                <input
                  type="text"
                  value={formData.jerseyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, jerseyName: e.target.value }))}
                  placeholder="Jersey Name"
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 text-sm"
                />
              </div>
            </div>

            {/* Row 5: Jersey Number + Trouser Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Jersey Number</label>
                <input
                  type="text"
                  value={formData.jerseyNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, jerseyNumber: e.target.value }))}
                  placeholder="Jersey Number"
                  className="w-32 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 text-sm"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Trouser Size</label>
                <select
                  value={formData.trouserSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, trouserSize: e.target.value }))}
                  className="w-32 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500/50 text-sm"
                >
                  <option value="">Select</option>
                  {sizes.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Detail */}
            <div className="flex items-start gap-4">
              <label className="text-slate-400 w-24 flex-shrink-0 text-sm pt-2">Detail</label>
              <textarea
                value={formData.detail}
                onChange={(e) => setFormData(prev => ({ ...prev, detail: e.target.value }))}
                placeholder="Additional details about the player..."
                rows={2}
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 text-sm resize-none"
              />
            </div>

            {/* Base Value - Read only, comes from category */}
            <div className="flex items-center gap-4">
              <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Base Value</label>
              <div className="flex items-center gap-2">
                <div className="w-40 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-green-400 font-semibold text-sm">
                  {formData.basePrice.toLocaleString('en-IN')} pts
                </div>
                <span className="text-xs text-slate-500">(Auto-set from category)</span>
              </div>
              <span className="text-xs text-slate-500">(If different from Category Base Value)</span>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-xl transition-all"
              >
                {isSubmitting ? 'SAVING...' : 'SAVE AND ADD NEW'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold rounded-xl transition-all"
              >
                {isSubmitting ? 'ADDING...' : 'ADD PLAYER'}
              </button>
            </div>
          </form>

          {/* Back Button */}
          <button
            onClick={() => onNavigate('players-list')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mt-6"
          >
            <ArrowLeft size={18} />
            Back to Players
          </button>
        </div>

        {/* Self Registration Panel */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-green-400" />
              Player Self Registration
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Share this link or QR code with players to let them register themselves for the auction.
            </p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="Registration QR Code"
                className="w-36 h-36"
              />
            </div>

            {/* Registration Link */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={registrationUrl}
                  readOnly
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono"
                />
                <button
                  onClick={copyRegistrationLink}
                  className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                    copiedLink
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {copiedLink ? 'Copied!' : <Copy size={16} />}
                </button>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Register for ${tournament?.name} auction: ${registrationUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm transition-colors"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(registrationUrl)}&text=${encodeURIComponent(`Register for ${tournament?.name} auction`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm transition-colors"
                >
                  Telegram
                </a>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                Players who register will appear in the "Pending Registrations" section for your approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Customize Theme Panel
function CustomizeThemePanel({ tournament: _tournament, onNavigate }: { tournament: any; onNavigate: (panel: SidebarPanel) => void }) {
  const { selectedThemeId, setSelectedTheme, soundEnabled, toggleSound } = useUIStore();
  const [selectedStamp, setSelectedStamp] = useState('classic');
  const [selectedEffect, setSelectedEffect] = useState('fireworks');
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);

  const stamps = [
    { id: 'classic', name: 'Classic Red', color: 'bg-red-500' },
    { id: 'gold', name: 'Gold Seal', color: 'bg-yellow-500' },
    { id: 'green', name: 'Green Check', color: 'bg-green-500' },
    { id: 'blue', name: 'Blue Badge', color: 'bg-blue-500' },
    { id: 'purple', name: 'Purple Star', color: 'bg-purple-500' },
  ];

  const soldEffects = [
    { id: 'fireworks', name: 'Fireworks', icon: '🎆' },
    { id: 'confetti', name: 'Confetti', icon: '🎊' },
    { id: 'sparkles', name: 'Sparkles', icon: '✨' },
    { id: 'flash', name: 'Flash', icon: '💥' },
    { id: 'none', name: 'None', icon: '❌' },
  ];

  const sounds = [
    { id: 'bid', name: 'Bid Sound', description: 'Plays when a bid is placed' },
    { id: 'sold', name: 'Sold Sound', description: 'Plays when player is sold' },
    { id: 'unsold', name: 'Unsold Sound', description: 'Plays when player goes unsold' },
    { id: 'timer', name: 'Timer Tick', description: 'Countdown timer sound' },
    { id: 'buzzer', name: 'Buzzer', description: 'Timer end buzzer' },
  ];

  const playPreviewSound = (soundId: string) => {
    setPreviewPlaying(soundId);
    setTimeout(() => setPreviewPlaying(null), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">HOME</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('auction-detail')} className="text-slate-500 hover:text-white transition-colors">AUCTION DETAIL</button>
        <span className="text-slate-600">&gt;</span>
        <span className="text-amber-400">CUSTOMIZE THEME</span>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Customize Auction Theme
        </h2>
        <p className="text-slate-400 mt-2">Personalize the look and feel of your auction</p>
      </div>

      {/* Background Theme Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Image size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Background Theme</h3>
            <p className="text-sm text-slate-500">Choose your auction panel background</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {auctionTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTheme(t.id)}
              className={`relative rounded-xl transition-all overflow-hidden border-2 ${
                selectedThemeId === t.id
                  ? 'border-amber-500 ring-4 ring-amber-500/20 scale-[1.02]'
                  : 'border-slate-700/50 hover:border-slate-500 hover:scale-[1.02]'
              }`}
            >
              {/* Theme Preview */}
              <div className="h-24 relative pointer-events-none">
                {/* Animated Background Preview */}
                {t.animatedBg ? (
                  <div className="w-full h-full bg-slate-950 relative overflow-hidden pointer-events-none">
                    <AnimatedBackground
                      type={t.animatedBg}
                      accentColor={t.accentColor}
                      intensity="low"
                    />
                  </div>
                ) : t.background ? (
                  <img
                    src={t.background}
                    alt={t.name}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <div
                    className="w-full h-full pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
                  >
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full opacity-30"
                      style={{ background: t.accentColor, filter: 'blur(15px)' }}
                    />
                  </div>
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {/* LIVE Badge for animated */}
                {t.isAnimated && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-600 rounded-lg shadow-lg">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase">Live</span>
                  </div>
                )}

                {/* Selected checkmark */}
                {selectedThemeId === t.id && (
                  <div className="absolute top-2 left-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check size={14} className="text-black" />
                  </div>
                )}
              </div>

              {/* Theme name */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0"
                    style={{ background: t.accentColor }}
                  />
                  <p className="text-xs text-white font-medium truncate">{t.name}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sold Stamp Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
            <Stamp size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Sold Stamp</h3>
            <p className="text-sm text-slate-500">Customize the SOLD stamp appearance</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {stamps.map((stamp) => (
            <button
              key={stamp.id}
              onClick={() => setSelectedStamp(stamp.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                selectedStamp === stamp.id
                  ? 'bg-slate-700 ring-2 ring-red-500'
                  : 'bg-slate-800/50 hover:bg-slate-800'
              }`}
            >
              <div className={`px-2 py-1 ${stamp.color} rounded text-white font-bold text-xs`}>
                SOLD
              </div>
              <span className="text-white">{stamp.name}</span>
              {selectedStamp === stamp.id && <Check size={16} className="text-red-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Sold Effects Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <PartyPopper size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Sold Effects</h3>
            <p className="text-sm text-slate-500">Celebration effect when a player is sold</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {soldEffects.map((effect) => (
            <button
              key={effect.id}
              onClick={() => setSelectedEffect(effect.id)}
              className={`p-4 rounded-xl transition-all text-center ${
                selectedEffect === effect.id
                  ? 'bg-amber-500/20 ring-2 ring-amber-500'
                  : 'bg-slate-800/50 hover:bg-slate-800'
              }`}
            >
              <div className="text-3xl mb-2">{effect.icon}</div>
              <p className="text-white text-sm font-medium">{effect.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Audio Settings Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              {soundEnabled ? <Volume2 size={20} className="text-blue-400" /> : <VolumeX size={20} className="text-slate-400" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Audio Settings</h3>
              <p className="text-sm text-slate-500">Configure auction sound effects</p>
            </div>
          </div>
          <button
            onClick={() => toggleSound()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              soundEnabled
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {soundEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {soundEnabled ? 'Sound ON' : 'Sound OFF'}
          </button>
        </div>

        {soundEnabled && (
          <div className="space-y-3">
            {sounds.map((sound) => (
              <div
                key={sound.id}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl"
              >
                <div>
                  <p className="text-white font-medium">{sound.name}</p>
                  <p className="text-xs text-slate-500">{sound.description}</p>
                </div>
                <button
                  onClick={() => playPreviewSound(sound.id)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    previewPlaying === sound.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  <Play size={14} />
                  {previewPlaying === sound.id ? 'Playing...' : 'Preview'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('auction-detail')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Auction Detail
        </button>
        <button
          onClick={() => {
            // Settings are already saved via uiStore
            onNavigate('auction-detail');
          }}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

// Full Auction Layout with all panels accessible
function FullAuctionLayout({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'auction' | 'summary' | 'players' | 'category' | 'retention' | 'stats' | 'manage'>('auction');
  const [showComparison, setShowComparison] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const [navHovered, setNavHovered] = useState(false);
  const { isFullscreen, toggleFullscreen } = useUIStore();
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simple auto-hide: show when mouse at bottom, hide after delay when mouse leaves
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight;
      const distanceFromBottom = windowHeight - e.clientY;

      // Show nav when mouse within 50px of bottom
      if (distanceFromBottom <= 50) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        setNavVisible(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Hide nav when mouse leaves and not hovering over nav
  useEffect(() => {
    if (navVisible && !navHovered) {
      hideTimeoutRef.current = setTimeout(() => {
        setNavVisible(false);
      }, 600);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [navVisible, navHovered]);

  const navItems = [
    { key: 'auction' as const, label: 'Auction', icon: Gavel },
    { key: 'summary' as const, label: 'Summary', icon: LayoutGrid },
    { key: 'players' as const, label: 'Players', icon: Users },
    { key: 'category' as const, label: 'Category', icon: Tags },
    { key: 'retention' as const, label: 'Retention', icon: Shield },
    { key: 'stats' as const, label: 'Stats', icon: BarChart3 },
    { key: 'manage' as const, label: 'Manage', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'auction':
        return <ProAuctionLayout />;
      case 'summary':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <SummaryPanel />
          </div>
        );
      case 'players':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <PlayersPanel />
          </div>
        );
      case 'category':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <CategoryPanel />
          </div>
        );
      case 'retention':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <RetentionPanel />
          </div>
        );
      case 'stats':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <StatsPanel />
          </div>
        );
      case 'manage':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            {/* Back to Dashboard button at top of Manage */}
            <div className="mb-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700"
              >
                <ArrowLeft size={18} />
                <span>Back to Dashboard</span>
              </button>
            </div>
            <ManagePanel />
          </div>
        );
      default:
        return <ProAuctionLayout />;
    }
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Main Content Area - Full Height */}
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>

      {/* Bottom Navigation - Auto-hide like Windows taskbar */}
      <nav
        className={`fixed bottom-0 left-0 right-0 bg-slate-900/98 backdrop-blur-xl border-t border-slate-700/50 px-4 py-3 z-50 transition-all duration-200 ease-out ${
          navVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        onMouseEnter={() => setNavHovered(true)}
        onMouseLeave={() => setNavHovered(false)}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        <div className="flex items-center justify-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className={`text-sm font-medium ${isActive ? '' : 'hidden sm:inline'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="h-8 w-px bg-slate-700 mx-2" />

          {/* Compare Button */}
          <button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-purple-400 hover:bg-purple-500/20 transition-colors"
            title="Compare Teams"
          >
            <GitCompare size={18} />
            <span className="hidden sm:inline text-sm font-medium">Compare</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
              isFullscreen
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
            title="Fullscreen"
          >
            <Maximize size={18} />
          </button>
        </div>
      </nav>

      {/* Small indicator at bottom when nav is hidden */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-200 ${
          navVisible ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-slate-500/60 to-transparent rounded-full mb-1" />
      </div>

      {/* Team Comparison Modal */}
      {showComparison && (
        <TeamComparisonModal teamIds={[]} onClose={() => setShowComparison(false)} />
      )}
    </div>
  );
}
