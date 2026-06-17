import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';
import { api } from '../utils/api';
import { Team, Player, Category, OverlaySettings, OverlayTheme, OverlayMode } from '../types';
import { defaultOverlaySettings } from '../config/overlayThemes';
import { socketClient } from '../socket/client';

// Lazy load heavy components for better initial load performance
const ProAuctionLayout = lazy(() => import('../components/auction/ProAuctionLayout'));
const ManagePanel = lazy(() => import('../components/manage/ManagePanel'));
const SummaryPanel = lazy(() => import('../components/summary/SummaryPanel'));
const PlayersPanel = lazy(() => import('../components/players/PlayersPanel'));
const CategoryPanel = lazy(() => import('../components/category/CategoryPanel'));
const StatsPanel = lazy(() => import('../components/stats/StatsPanel'));
const RetentionPanel = lazy(() => import('../components/retention/RetentionPanel'));
const TeamComparisonModal = lazy(() => import('../components/comparison/TeamComparisonModal'));
import { auctionTemplates } from '../config/auctionTemplates';
import { layoutTemplates } from '../config/auctionLayouts';
import { premiumBackgrounds } from '../config/premiumBackgrounds';
import { cityBackgrounds } from '../config/cityBackgrounds';
import { PLAYER_CATEGORIES } from '../config/playerRoles';
import { budgetPresets, formatBudgetLabel } from '../config/budgetPresets';
import AnimatedBackground from '../components/auction/AnimatedBackground';
import ImageUpload from '../components/common/ImageUpload';
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
  Palette,
  Download,
  X,
  Loader2,
  Monitor,
  Eye,
  Layout,
  Timer,
} from 'lucide-react';

// Panel types - Account level and Auction level
type AccountPanel = 'account-dashboard' | 'my-auctions' | 'new-auction' | 'profile';
type AuctionPanel = 'auction-overview' | 'teams' | 'create-team' | 'categories' | 'create-category' | 'players-list' | 'create-player' | 'auction-panel' | 'customize-theme';
type SidebarPanel = AccountPanel | AuctionPanel | 'dashboard' | 'auction-detail'; // Keep old ones for compatibility

// View mode - account level or inside an auction
type ViewMode = 'account' | 'auction';

// Determine if panel is account-level
const isAccountPanel = (panel: SidebarPanel): boolean => {
  return ['account-dashboard', 'my-auctions', 'new-auction', 'profile', 'dashboard'].includes(panel);
};

// Get initial state from localStorage
const getInitialState = (): { panel: SidebarPanel; viewMode: ViewMode } => {
  try {
    const savedPanel = localStorage.getItem('dashboard-panel') as SidebarPanel | null;
    const savedViewMode = localStorage.getItem('dashboard-viewmode') as ViewMode | null;

    // If we have saved state, use it
    if (savedPanel && savedViewMode) {
      return { panel: savedPanel, viewMode: savedViewMode };
    }

    // Default to account dashboard
    return { panel: 'account-dashboard', viewMode: 'account' };
  } catch {
    return { panel: 'account-dashboard', viewMode: 'account' };
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { tournament, user, token, logout, updateTournament, refreshTournament } = useAuthStore();
  const socket = useSocket();

  const initialState = getInitialState();
  const [activePanel, setActivePanelState] = useState<SidebarPanel>(initialState.panel);
  const [viewMode, setViewModeState] = useState<ViewMode>(initialState.viewMode);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [checkingApproval, setCheckingApproval] = useState(false);

  // On mount, validate saved state against actual tournament
  useEffect(() => {
    // If viewMode is 'auction' but no tournament exists, reset to account mode
    if (viewMode === 'auction' && !tournament?.id) {
      setViewModeState('account');
      setActivePanelState('account-dashboard');
      try {
        localStorage.setItem('dashboard-panel', 'account-dashboard');
        localStorage.setItem('dashboard-viewmode', 'account');
      } catch {}
    }
  }, []);

  // Helper to set view mode with persistence
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('dashboard-viewmode', mode);
    } catch {}
  };

  // Persist panel state and update view mode
  const setActivePanel = (panel: SidebarPanel) => {
    setActivePanelState(panel);
    const newMode = isAccountPanel(panel) ? 'account' : 'auction';
    setViewMode(newMode);
    try {
      localStorage.setItem('dashboard-panel', panel);
    } catch {}
  };

  // Enter auction mode - select a tournament and go to its overview
  const enterAuction = (tournamentData: any) => {
    // Validate tournament data before entering
    if (!tournamentData?.id) {
      console.error('Invalid tournament data - cannot enter auction');
      return;
    }
    updateTournament(tournamentData);
    setViewMode('auction');
    setActivePanel('auction-overview');
  };

  // Exit to account mode
  const exitToAccount = () => {
    setViewMode('account');
    setActivePanel('account-dashboard');
    // Clear auction-specific state
    setTeams([]);
    setPlayers([]);
    setCategories([]);
  };

  // Load all tournaments for account dashboard
  const loadAllTournaments = async () => {
    try {
      const tournaments = await api.getMyTournaments();
      setAllTournaments(tournaments || []);

      // Only clear stale tournament if we're in account mode and tournament isn't in the list
      // Don't clear if we're in auction mode (might have just created/entered an auction)
      if (viewMode === 'account' && tournament?.id && tournaments) {
        const tournamentExists = tournaments.some((t: any) => t.id === tournament.id);
        if (!tournamentExists) {
          updateTournament(null);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  };

  // Load data for current auction
  const loadAuctionData = async () => {
    if (!tournament?.id) return;
    try {
      const [teamsData, playersData, categoriesData] = await Promise.all([
        api.getTeams(),
        api.getPlayers(),
        api.getCategories()
      ]);
      setTeams(teamsData as Team[]);
      setPlayers(playersData as Player[]);
      setCategories(categoriesData as Category[]);
    } catch (error: any) {
      console.error('Failed to load auction data:', error);
      // Only logout if explicitly told token is invalid (not on network errors)
      const errorMsg = error?.message?.toLowerCase() || '';
      if (errorMsg.includes('invalid') && errorMsg.includes('token')) {
        logout();
        navigate('/login');
      }
    }
  };

  // Alias for backwards compatibility
  const loadData = loadAuctionData;

  // Ref for debounced loadAuctionData to avoid stale closure
  const loadAuctionDataRef = useRef(loadAuctionData);
  loadAuctionDataRef.current = loadAuctionData;

  // Debounce timer ref for socket events
  const debouncedLoadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Ensure token is set before making API calls
    if (token) {
      api.setToken(token);
      loadAllTournaments();
      // Only load auction data if we have a tournament selected
      if (tournament?.id) {
        loadAuctionData();
      }
    }
  }, [token]);

  useEffect(() => {
    // Reload auction data when tournament changes
    if (tournament?.id && token) {
      loadAuctionData();
    }
  }, [tournament?.id]);

  useEffect(() => {
    // Only listen for updates if we have a tournament selected
    if (!tournament?.id) return;

    const handleDataUpdate = () => {
      // Invalidate cache to ensure fresh data
      api.invalidateCache('teams');
      api.invalidateCache('players');

      // Debounce the actual load call
      if (debouncedLoadTimer.current) {
        clearTimeout(debouncedLoadTimer.current);
      }
      debouncedLoadTimer.current = setTimeout(() => {
        loadAuctionDataRef.current();
      }, 500);
    };

    socket.onTeamsUpdated(handleDataUpdate);
    socket.onPlayersUpdated(handleDataUpdate);

    // Cleanup: remove listeners when unmounting or tournament changes
    return () => {
      socket.off('teams:updated');
      socket.off('players:updated');
      if (debouncedLoadTimer.current) {
        clearTimeout(debouncedLoadTimer.current);
      }
    };
  }, [socket, tournament?.id]);

  // Handle tournament deletion - clears state and navigates to account
  const handleTournamentDeleted = () => {
    // Clear tournament from auth store (this also clears localStorage via persist)
    updateTournament(null);
    // Reload tournaments list
    loadAllTournaments();
    // Navigate to account dashboard (this also clears local state)
    exitToAccount();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Account-level menu items
  const accountMenuItems = [
    { id: 'account-dashboard' as SidebarPanel, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-auctions' as SidebarPanel, label: 'My Auctions', icon: History },
    { id: 'new-auction' as SidebarPanel, label: 'New Auction', icon: Plus },
    { id: 'profile' as SidebarPanel, label: 'My Profile', icon: User },
  ];

  // Auction-level menu items (when inside a specific auction)
  const auctionMenuItems = [
    { id: 'auction-overview' as SidebarPanel, label: 'Overview', icon: LayoutDashboard },
    { id: 'teams' as SidebarPanel, label: 'Teams', icon: Users },
    { id: 'players-list' as SidebarPanel, label: 'Players', icon: UserPlus },
    { id: 'categories' as SidebarPanel, label: 'Categories', icon: Tags },
    { id: 'auction-panel' as SidebarPanel, label: 'Auction Panel', icon: Gavel },
    { id: 'customize-theme' as SidebarPanel, label: 'Customize', icon: Palette },
  ];

  // Choose menu based on view mode
  const menuItems = viewMode === 'account' ? accountMenuItems : auctionMenuItems;

  const renderContent = () => {
    switch (activePanel) {
      // Account-level panels
      case 'account-dashboard':
      case 'dashboard': // backwards compatibility
        return <AccountDashboard
          user={user}
          tournaments={allTournaments}
          currentTournament={tournament}
          onNavigate={setActivePanel}
          onEnterAuction={enterAuction}
          onRefresh={loadAllTournaments}
          onTournamentDeleted={handleTournamentDeleted}
        />;
      case 'new-auction':
        return <NewAuctionPanel onNavigate={setActivePanel} onTournamentCreated={() => { loadAllTournaments(); loadData(); }} />;
      case 'my-auctions':
        return <MyAuctionsPanel tournament={tournament} onNavigate={setActivePanel} onRefresh={loadData} onTournamentDeleted={handleTournamentDeleted} onEnterAuction={enterAuction} />;
      case 'profile':
        return <ProfilePanel user={user} tournament={tournament} viewMode={viewMode} />;

      // Auction-level panels
      case 'auction-overview':
        return <AuctionOverview
          tournament={tournament}
          teams={teams}
          players={players}
          categories={categories}
          onNavigate={setActivePanel}
          onRefresh={loadAuctionData}
          onTournamentDeleted={handleTournamentDeleted}
        />;
      case 'auction-detail': // backwards compatibility
        return <AuctionDetailPanel tournament={tournament} teams={teams} players={players} categories={categories} onNavigate={setActivePanel} onRefresh={loadData} onTournamentDeleted={handleTournamentDeleted} />;
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
        return <AuctionPanelWrapper tournament={tournament} onClose={() => setActivePanel('auction-overview')} />;

      default:
        return <AccountDashboard
          user={user}
          tournaments={allTournaments}
          currentTournament={tournament}
          onNavigate={setActivePanel}
          onEnterAuction={enterAuction}
          onRefresh={loadAllTournaments}
          onTournamentDeleted={handleTournamentDeleted}
        />;
    }
  };

  // Full screen mode for auction panel - with all features
  if (activePanel === 'auction-panel') {
    // Check if tournament requires approval
    // In development (localhost), treat undefined approval_status as approved (migration might not be run)
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const needsApproval = tournament && tournament.approval_status !== 'approved' && !(isDev && tournament.approval_status === undefined);
    if (needsApproval) {
      // Auto-refresh to check if approval status changed
      const handleCheckApproval = async () => {
        setCheckingApproval(true);
        await refreshTournament();
        setCheckingApproval(false);
      };

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900/80 border border-amber-500/30 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Awaiting Approval</h2>
            <p className="text-slate-400 mb-6">
              Your tournament needs to be approved by an admin before you can start the auction.
              This usually happens within 24 hours.
            </p>
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tournament.approval_status === 'pending'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : tournament.approval_status === 'rejected'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {tournament.approval_status === 'pending' ? 'Pending Review' :
                   tournament.approval_status === 'rejected' ? 'Rejected' :
                   tournament.approval_status || 'Pending Review'}
                </span>
              </div>
              {tournament.admin_notes && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">Admin Notes</p>
                  <p className="text-sm text-slate-300">{tournament.admin_notes}</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <button
                onClick={handleCheckApproval}
                disabled={checkingApproval}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {checkingApproval ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} />
                    Check Approval Status
                  </>
                )}
              </button>
              <button
                onClick={() => setActivePanel('auction-overview')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Back to Overview
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <FullAuctionLayout onBack={() => setActivePanel('auction-overview')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-40 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo / Auction Header */}
        <div className="p-4 border-b border-slate-800">
          {viewMode === 'auction' && tournament ? (
            // Auction mode - show current auction info
            <div className={`${sidebarCollapsed ? 'text-center' : ''}`}>
              <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {tournament.logo_url ? (
                    <img src={tournament.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Trophy size={20} className="text-white" />
                  )}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-white text-sm truncate">{tournament.name}</h1>
                    <p className="text-xs text-amber-400">{tournament.share_code}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Account mode - show app logo
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
          )}
        </div>

        {/* Back to Account button (only in auction mode) */}
        {viewMode === 'auction' && (
          <div className="p-3 border-b border-slate-800">
            <button
              onClick={exitToAccount}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all ${
                sidebarCollapsed ? 'justify-center px-3' : ''
              }`}
              title={sidebarCollapsed ? 'Back to Account' : undefined}
            >
              <ArrowLeft size={18} />
              {!sidebarCollapsed && <span className="text-sm">Back to Account</span>}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id ||
              (item.id === 'auction-overview' && activePanel === 'auction-detail');
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
                {viewMode === 'auction' && tournament?.name
                  ? tournament.name
                  : 'My Account'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Only show share code when inside an auction */}
              {viewMode === 'auction' && tournament?.share_code && (
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

// Account Dashboard - Shows all auctions for the account
interface AccountDashboardProps {
  user: any;
  tournaments: any[];
  currentTournament: any;
  onNavigate: (panel: SidebarPanel) => void;
  onEnterAuction: (tournament: any) => void;
  onRefresh: () => void;
  onTournamentDeleted: () => void;
}

function AccountDashboard({ user, tournaments, currentTournament, onNavigate, onEnterAuction, onRefresh, onTournamentDeleted }: AccountDashboardProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const handleEnterAuction = async (tournament: any) => {
    try {
      const response = await api.selectTournament(tournament.id);
      api.setToken(response.token);
      if (user) {
        setAuth(user, response.tournament, response.token);
      }
      onEnterAuction(response.tournament);
    } catch (err) {
      alert('Failed to open auction');
      console.error(err);
    }
  };

  const handleDelete = async (tournamentToDelete: any) => {
    if (!confirm(`Are you sure you want to delete "${tournamentToDelete.name}"?\n\nThis will permanently delete:\n• All teams\n• All players\n• All categories\n• All auction data\n\nThis action cannot be undone!`)) {
      return;
    }

    if (!confirm('This is your FINAL warning. Delete this auction permanently?')) {
      return;
    }

    setDeleting(tournamentToDelete.id);
    try {
      const result = await api.deleteTournamentById(tournamentToDelete.id);
      onRefresh();

      if (currentTournament?.id === tournamentToDelete.id) {
        if (result.fallbackTournament) {
          // Switch to fallback tournament
          try {
            const switchResult = await api.selectTournament(result.fallbackTournament.id);
            const { setAuth, user } = useAuthStore.getState();
            if (user) {
              setAuth(user, switchResult.tournament, switchResult.token);
            }
          } catch (switchErr) {
            console.error('Failed to switch to fallback:', switchErr);
            onTournamentDeleted();
          }
        } else {
          onTournamentDeleted();
        }
      }
    } catch (err) {
      alert('Failed to delete auction');
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  // Calculate account-wide stats
  const totalPlayers = tournaments.reduce((sum, t) => sum + (t.player_count || 0), 0);
  const totalTeams = tournaments.reduce((sum, t) => sum + (t.team_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name || 'Admin'}!</h1>
            <p className="text-slate-400">Manage your auctions from one place</p>
          </div>
        </div>
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Trophy className="text-blue-400" size={20} />
            </div>
            <span className="text-slate-400">Total Auctions</span>
          </div>
          <p className="text-3xl font-bold text-white">{tournaments.length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Users className="text-green-400" size={20} />
            </div>
            <span className="text-slate-400">Total Teams</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalTeams}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <UserPlus className="text-purple-400" size={20} />
            </div>
            <span className="text-slate-400">Total Players</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalPlayers}</p>
        </div>
      </div>

      {/* My Auctions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">My Auctions</h2>
          <button
            onClick={() => onNavigate('new-auction')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-medium rounded-xl transition-all"
          >
            <Plus size={18} />
            New Auction
          </button>
        </div>

        {tournaments.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy size={40} className="text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No auctions yet</h3>
            <p className="text-slate-400 mb-6">Create your first auction to get started</p>
            <button
              onClick={() => onNavigate('new-auction')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all"
            >
              <Plus size={20} />
              Create Your First Auction
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900/50 border border-slate-800 hover:border-amber-500/30 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Trophy size={24} className="text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{t.name}</h3>
                    <p className="text-sm text-amber-400">{t.share_code}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t.team_count || 0} teams • {t.player_count || 0} players
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    t.status === 'live'
                      ? 'bg-green-500/20 text-green-400'
                      : t.status === 'completed'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {t.status?.toUpperCase() || 'SETUP'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEnterAuction(t)}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium rounded-lg transition-all text-sm"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      disabled={deleting === t.id}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Create New Card */}
            <button
              onClick={() => onNavigate('new-auction')}
              className="bg-slate-900/30 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all group min-h-[180px]"
            >
              <div className="w-14 h-14 bg-slate-800 group-hover:bg-amber-500/20 rounded-xl flex items-center justify-center transition-all">
                <Plus size={28} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <span className="text-slate-500 group-hover:text-white font-medium transition-colors">Create New Auction</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Auction Overview - Shows overview when inside a specific auction
interface AuctionOverviewProps {
  tournament: any;
  teams: Team[];
  players: Player[];
  categories: Category[];
  onNavigate: (panel: SidebarPanel) => void;
  onRefresh: () => void;
  onTournamentDeleted: () => void;
}

function AuctionOverview({ tournament, teams, players, categories, onNavigate, onRefresh: _onRefresh, onTournamentDeleted }: AuctionOverviewProps) {
  const [deleting, setDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const soldPlayers = players.filter(p => p.status === 'sold').length;
  const availablePlayers = players.filter(p => p.status === 'available').length;
  const totalSpent = players.filter(p => p.status === 'sold').reduce((sum, p) => sum + (p.sold_price || 0), 0);

  const baseUrl = window.location.origin;
  const publicViewUrl = `${baseUrl}/live/${tournament?.share_code}`;
  const overlayUrl = `${baseUrl}/overlay/${tournament?.share_code}`;

  const copyToClipboard = (text: string, linkType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(linkType);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDelete = async () => {
    if (!tournament?.id) return;

    if (!confirm(`Are you sure you want to delete "${tournament.name}"?\n\nThis will permanently delete:\n• All teams\n• All players\n• All categories\n• All auction data\n\nThis action cannot be undone!`)) {
      return;
    }

    if (!confirm('This is your FINAL warning. Delete this auction permanently?')) {
      return;
    }

    setDeleting(true);
    try {
      const result = await api.deleteTournamentById(tournament.id);
      alert('Auction deleted successfully!');

      if (result.fallbackTournament) {
        try {
          const switchResult = await api.selectTournament(result.fallbackTournament.id);
          const { setAuth, user } = useAuthStore.getState();
          if (user) {
            setAuth(user, switchResult.tournament, switchResult.token);
          }
        } catch (switchErr) {
          console.error('Failed to switch to fallback:', switchErr);
          onTournamentDeleted();
        }
      } else {
        onTournamentDeleted();
      }
    } catch (err) {
      alert('Failed to delete auction');
      console.error(err);
      setDeleting(false);
    }
  };

  if (!tournament) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">No auction selected</p>
      </div>
    );
  }

  // In development (localhost), treat undefined approval_status as approved (migration might not be run)
  const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isApproved = tournament.approval_status === 'approved' || (isDevMode && tournament.approval_status === undefined);
  const isPending = !isApproved && (!tournament.approval_status || tournament.approval_status === 'pending');
  const isRejected = tournament.approval_status === 'rejected';

  return (
    <div className="space-y-6">
      {/* Approval Status Banner */}
      {!isApproved && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          isRejected
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isRejected ? 'bg-red-500/20' : 'bg-amber-500/20'
          }`}>
            <Shield className={isRejected ? 'text-red-400' : 'text-amber-400'} size={20} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${isRejected ? 'text-red-400' : 'text-amber-400'}`}>
              {isRejected ? 'Tournament Rejected' : 'Awaiting Admin Approval'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {isRejected
                ? 'Your tournament has been rejected by an admin. Please review the notes below and make necessary changes.'
                : 'Your tournament is pending admin approval. You can set up teams and players while waiting, but cannot start the auction.'}
            </p>
            {tournament.admin_notes && (
              <div className="mt-2 p-2 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-500">Admin Notes:</p>
                <p className="text-sm text-slate-300">{tournament.admin_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auction Header */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {tournament.logo_url ? (
              <img src={tournament.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Trophy size={36} className="text-amber-400" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-amber-400 font-medium">{tournament.share_code}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tournament.status === 'live'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {tournament.status?.toUpperCase() || 'SETUP'}
                  </span>
                  {/* Approval Status Badge */}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isApproved
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : isRejected
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {isApproved ? '✓ Approved' : isRejected ? '✗ Rejected' : '⏳ Pending'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                title="Delete Auction"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="text-blue-400" />}
          label="Teams"
          value={teams.length}
          color="blue"
        />
        <StatCard
          icon={<UserPlus className="text-green-400" />}
          label="Players"
          value={players.length}
          subtext={`${soldPlayers} sold`}
          color="green"
        />
        <StatCard
          icon={<Tags className="text-purple-400" />}
          label="Categories"
          value={categories.length}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="text-amber-400" />}
          label="Total Spent"
          value={`₹${totalSpent.toLocaleString('en-IN')}`}
          color="amber"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('teams')}
          className="bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 rounded-xl p-4 text-left transition-all group"
        >
          <Users className="text-blue-400 mb-2" size={24} />
          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">Manage Teams</h3>
          <p className="text-sm text-slate-400">{teams.length} teams created</p>
        </button>
        <button
          onClick={() => onNavigate('players-list')}
          className="bg-slate-900/50 border border-slate-800 hover:border-green-500/30 rounded-xl p-4 text-left transition-all group"
        >
          <UserPlus className="text-green-400 mb-2" size={24} />
          <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">Manage Players</h3>
          <p className="text-sm text-slate-400">{availablePlayers} available</p>
        </button>
        <button
          onClick={() => onNavigate('categories')}
          className="bg-slate-900/50 border border-slate-800 hover:border-purple-500/30 rounded-xl p-4 text-left transition-all group"
        >
          <Tags className="text-purple-400 mb-2" size={24} />
          <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">Categories</h3>
          <p className="text-sm text-slate-400">{categories.length} categories</p>
        </button>
        <button
          onClick={() => isApproved && onNavigate('auction-panel')}
          disabled={!isApproved}
          className={`rounded-xl p-4 text-left transition-all group ${
            isApproved
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-500/50'
              : 'bg-slate-800/50 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          {isApproved ? (
            <Gavel className="text-amber-400 mb-2" size={24} />
          ) : (
            <Shield className="text-slate-500 mb-2" size={24} />
          )}
          <h3 className={`font-semibold ${isApproved ? 'text-amber-400' : 'text-slate-500'}`}>
            {isApproved ? 'Open Auction' : 'Awaiting Approval'}
          </h3>
          <p className="text-sm text-slate-400">
            {isApproved ? 'Start live bidding' : 'Approval required'}
          </p>
        </button>
      </div>

      {/* Links Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Sharing Links</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3">
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-1">Public View URL</p>
              <p className="text-sm text-white font-mono truncate">{publicViewUrl}</p>
            </div>
            <button
              onClick={() => copyToClipboard(publicViewUrl, 'public')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {copiedLink === 'public' ? (
                <Check size={18} className="text-green-400" />
              ) : (
                <Copy size={18} className="text-slate-400" />
              )}
            </button>
            <a
              href={publicViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ExternalLink size={18} className="text-slate-400" />
            </a>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3">
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-1">OBS/Streaming Overlay</p>
              <p className="text-sm text-white font-mono truncate">{overlayUrl}</p>
            </div>
            <button
              onClick={() => copyToClipboard(overlayUrl, 'overlay')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {copiedLink === 'overlay' ? (
                <Check size={18} className="text-green-400" />
              ) : (
                <Copy size={18} className="text-slate-400" />
              )}
            </button>
            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ExternalLink size={18} className="text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Auction Settings Summary */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Auction Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Team Budget</p>
            <p className="text-white font-semibold">₹{tournament.total_points?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Base Bid</p>
            <p className="text-white font-semibold">₹{tournament.default_base_bid?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Bid Increment</p>
            <p className="text-white font-semibold">₹{tournament.bid_increment?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Players per Team</p>
            <p className="text-white font-semibold">{tournament.min_players} - {tournament.max_players}</p>
          </div>
        </div>
      </div>
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

// New Auction Panel with Form
function NewAuctionPanel({ onNavigate, onTournamentCreated }: { onNavigate: (panel: SidebarPanel) => void; onTournamentCreated: () => void }) {
  const { user, setAuth } = useAuthStore();
  const [selectedPresetId, setSelectedPresetId] = useState('standard');
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
    // Category prices
    platinumPrice: 50000,
    goldPrice: 30000,
    silverPrice: 20000,
    bronzePrice: 10000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCategoryPrices, setShowCategoryPrices] = useState(false);
  const { displayMode, setDisplayMode } = useUIStore();

  // Handle preset change
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = budgetPresets.find(p => p.id === presetId);
    if (preset) {
      setFormData(prev => ({
        ...prev,
        pointsPerTeam: preset.teamBudget,
        baseBid: preset.baseBid,
        bidIncreaseBy: preset.bidIncrements.tier4.increment, // Use highest tier as default display
        platinumPrice: preset.categories.platinum,
        goldPrice: preset.categories.gold,
        silverPrice: preset.categories.silver,
        bronzePrice: preset.categories.bronze,
      }));
    }
  };

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

      // Create tournament with category prices
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
        // Category prices from preset
        category_prices: {
          platinum: formData.platinumPrice,
          gold: formData.goldPrice,
          silver: formData.silverPrice,
          bronze: formData.bronzePrice,
        },
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

        {/* Display Mode Toggle (Rupees/Points) */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Display Mode</label>
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setDisplayMode('rupees')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                displayMode === 'rupees'
                  ? 'bg-amber-500 text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ₹ Rupees
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('points')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                displayMode === 'points'
                  ? 'bg-cyan-500 text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Points
            </button>
          </div>
        </div>

        {/* Budget Preset Selector */}
        <div className="flex items-start gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0 pt-3">Budget Preset*</label>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-3">
              {budgetPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetChange(preset.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPresetId === preset.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${selectedPresetId === preset.id ? 'text-cyan-400' : 'text-white'}`}>
                      {preset.name}
                    </span>
                    {selectedPresetId === preset.id && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                        <Check size={12} className="text-black" />
                      </div>
                    )}
                  </div>
                  <p className={`text-sm ${selectedPresetId === preset.id ? 'text-cyan-300' : 'text-amber-400'}`}>
                    {formatBudgetLabel(preset.teamBudget, displayMode === 'points')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{preset.description.split(' - ')[1]}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Points Per Team (editable) */}
        <div className="flex items-center gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0">Points Per Team*</label>
          <div className="flex-1">
            <input
              type="number"
              value={formData.pointsPerTeam}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, pointsPerTeam: parseInt(e.target.value) || 0 }));
                setSelectedPresetId('custom');
              }}
              placeholder="Points"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Current: {formatBudgetLabel(formData.pointsPerTeam, displayMode === 'points')}
            </p>
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
            <p className="text-xs text-slate-500 mt-1">
              Current: {formatBudgetLabel(formData.bidIncreaseBy, displayMode === 'points')}
            </p>
          </div>
        </div>

        {/* Category Prices Section */}
        <div className="flex items-start gap-8">
          <label className="text-slate-400 w-40 flex-shrink-0 pt-3">Category Prices</label>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => setShowCategoryPrices(!showCategoryPrices)}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-3"
            >
              <ChevronRight size={18} className={`transition-transform ${showCategoryPrices ? 'rotate-90' : ''}`} />
              <span className="text-sm font-medium">{showCategoryPrices ? 'Hide' : 'Show'} Category Prices</span>
            </button>

            {showCategoryPrices && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
                {/* Platinum */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-300 to-slate-100"></span>
                    Platinum
                  </label>
                  <input
                    type="number"
                    value={formData.platinumPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, platinumPrice: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">{formatBudgetLabel(formData.platinumPrice, displayMode === 'points')}</p>
                </div>

                {/* Gold */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 to-amber-400"></span>
                    Gold
                  </label>
                  <input
                    type="number"
                    value={formData.goldPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, goldPrice: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">{formatBudgetLabel(formData.goldPrice, displayMode === 'points')}</p>
                </div>

                {/* Silver */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-400 to-slate-300"></span>
                    Silver
                  </label>
                  <input
                    type="number"
                    value={formData.silverPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, silverPrice: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">{formatBudgetLabel(formData.silverPrice, displayMode === 'points')}</p>
                </div>

                {/* Bronze */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-700 to-orange-500"></span>
                    Bronze
                  </label>
                  <input
                    type="number"
                    value={formData.bronzePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, bronzePrice: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">{formatBudgetLabel(formData.bronzePrice, displayMode === 'points')}</p>
                </div>
              </div>
            )}
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
function MyAuctionsPanel({ tournament, onNavigate, onRefresh, onTournamentDeleted, onEnterAuction }: { tournament: any; onNavigate: (panel: SidebarPanel) => void; onRefresh: () => void; onTournamentDeleted: () => void; onEnterAuction?: (tournament: any) => void }) {
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const { setAuth, user } = useAuthStore();

  useEffect(() => {
    loadAllTournaments();
  }, []);

  const loadAllTournaments = async () => {
    try {
      const tournaments = await api.getMyTournaments();
      setAllTournaments(tournaments);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (tournamentData: any) => {
    // If onEnterAuction is provided, use the new flow
    if (onEnterAuction) {
      if (tournament?.id === tournamentData.id) {
        onEnterAuction(tournamentData);
        return;
      }

      setSwitching(tournamentData.id);
      try {
        const response = await api.selectTournament(tournamentData.id);
        api.setToken(response.token);
        if (user) {
          setAuth(user, response.tournament, response.token);
        }
        onEnterAuction(response.tournament);
      } catch (err) {
        alert('Failed to open auction');
        console.error(err);
      } finally {
        setSwitching(null);
      }
      return;
    }

    // Legacy flow
    if (tournament?.id === tournamentData.id) {
      onNavigate('auction-detail');
      return;
    }

    setSwitching(tournamentData.id);
    try {
      const response = await api.selectTournament(tournamentData.id);
      api.setToken(response.token);
      if (user) {
        setAuth(user, response.tournament, response.token);
      }
      onRefresh();
      onNavigate('auction-detail');
    } catch (err) {
      alert('Failed to switch tournament');
      console.error(err);
    } finally {
      setSwitching(null);
    }
  };

  const handleDelete = async (tournamentToDelete: any) => {
    if (!confirm(`Are you sure you want to delete "${tournamentToDelete.name}"?\n\nThis will permanently delete:\n• All teams\n• All players\n• All categories\n• All auction data\n\nThis action cannot be undone!`)) {
      return;
    }

    if (!confirm('This is your FINAL warning. Delete this auction permanently?')) {
      return;
    }

    setDeleting(tournamentToDelete.id);
    try {
      // Use explicit ID delete
      const result = await api.deleteTournamentById(tournamentToDelete.id);
      alert('Auction deleted successfully!');

      // Reload tournaments list
      await loadAllTournaments();

      // If we deleted the current one, handle fallback
      if (tournament?.id === tournamentToDelete.id) {
        if (result.fallbackTournament) {
          // Switch to fallback tournament to get a new token
          try {
            const switchResult = await api.selectTournament(result.fallbackTournament.id);
            // Update auth state with new tournament and token
            const { setAuth } = useAuthStore.getState();
            const { user } = useAuthStore.getState();
            if (user) {
              setAuth(user, switchResult.tournament, switchResult.token);
            }
          } catch (switchErr) {
            console.error('Failed to switch to fallback tournament:', switchErr);
            onTournamentDeleted();
          }
        } else {
          onTournamentDeleted();
        }
      }
    } catch (err) {
      alert('Failed to delete auction');
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Your Auctions ({allTournaments.length})</h3>
        <button
          onClick={() => onNavigate('new-auction')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl text-white font-semibold transition-colors"
        >
          <Plus size={18} />
          New Auction
        </button>
      </div>

      {allTournaments.length > 0 ? (
        <div className="space-y-4">
          {allTournaments.map((t) => {
            const isActive = tournament?.id === t.id;
            return (
              <div
                key={t.id}
                className={`bg-slate-900/50 border rounded-2xl p-5 transition-all ${
                  isActive ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex-1 flex items-center gap-4 cursor-pointer"
                    onClick={() => handleSwitch(t)}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                      isActive
                        ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 border-amber-500/50'
                        : 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-slate-700'
                    }`}>
                      {t.logo_url ? (
                        <img src={t.logo_url} alt={t.name} className="w-10 h-10 object-contain" />
                      ) : (
                        <Trophy size={24} className={isActive ? 'text-amber-400' : 'text-slate-500'} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-white">{t.name}</h4>
                        {isActive && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm">
                        Code: {t.share_code} • Budget: ₹{t.total_points?.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    t.status === 'live'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : t.status === 'completed'
                      ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {t.status?.toUpperCase() || 'SETUP'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSwitch(t)}
                      disabled={switching === t.id}
                      className={`px-4 py-2 rounded-xl font-medium transition-all ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-700/50 text-white hover:bg-slate-700 border border-slate-600'
                      }`}
                    >
                      {switching === t.id ? '...' : isActive ? 'Open' : 'Switch'}
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      disabled={deleting === t.id}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                      title="Delete Auction"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <History size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No auctions found</p>
          <button
            onClick={() => onNavigate('new-auction')}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl text-white font-semibold transition-colors"
          >
            Create Your First Auction
          </button>
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
  onRefresh: () => void;
  onTournamentDeleted: () => void;
}

function AuctionDetailPanel({ tournament, teams, players, categories, onNavigate, onRefresh: _onRefresh, onTournamentDeleted }: AuctionDetailPanelProps) {
  const [selfRegistrationEnabled, setSelfRegistrationEnabled] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // In development (localhost), treat undefined approval_status as approved (migration might not be run)
  const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isApproved = tournament?.approval_status === 'approved' || (isDevMode && tournament?.approval_status === undefined);
  const baseUrl = window.location.origin;
  const publicViewUrl = `${baseUrl}/live/${tournament?.share_code}`;
  const overlayUrl = `${baseUrl}/overlay/${tournament?.share_code}`;
  const registrationUrl = `${baseUrl}/register/${tournament?.share_code}`;

  const copyToClipboard = (text: string, linkType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(linkType);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDeleteTournament = async () => {
    if (!tournament?.id) {
      alert('No tournament selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${tournament?.name}"?\n\nThis will permanently delete:\n• All teams\n• All players\n• All categories\n• All auction data\n\nThis action cannot be undone!`)) {
      return;
    }

    if (!confirm('This is your FINAL warning. Delete this auction permanently?')) {
      return;
    }

    setDeleting(true);
    try {
      const result = await api.deleteTournamentById(tournament.id);
      alert('Auction deleted successfully!');

      if (result.fallbackTournament) {
        try {
          const switchResult = await api.selectTournament(result.fallbackTournament.id);
          const { setAuth, user } = useAuthStore.getState();
          if (user) {
            setAuth(user, switchResult.tournament, switchResult.token);
          }
        } catch (switchErr) {
          console.error('Failed to switch to fallback:', switchErr);
          onTournamentDeleted();
        }
      } else {
        onTournamentDeleted();
      }
    } catch (err) {
      alert('Failed to delete auction');
      console.error(err);
      setDeleting(false);
    }
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
          onClick={() => isApproved && onNavigate('auction-panel')}
          disabled={!isApproved}
          className={`flex items-center gap-2 transition-colors ${
            isApproved
              ? 'text-cyan-400 hover:text-cyan-300'
              : 'text-slate-500 cursor-not-allowed'
          }`}
        >
          <span>{isApproved ? 'Go to Auction Panel' : 'Awaiting Approval'}</span>
          {isApproved ? <ExternalLink size={16} /> : <Shield size={16} />}
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
              onClick={() => isApproved && onNavigate('auction-panel')}
              disabled={!isApproved}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                isApproved
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-500 cursor-not-allowed'
              }`}
              title={isApproved ? 'Auction Panel' : 'Awaiting Approval'}
            >
              {isApproved ? <Edit3 size={20} /> : <Shield size={20} />}
            </button>
            <button
              onClick={handleDeleteTournament}
              disabled={deleting}
              className="w-12 h-12 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400 transition-colors disabled:opacity-50"
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
            onClick={() => isApproved && onNavigate('auction-panel')}
            disabled={!isApproved}
            className={`w-full flex items-center justify-between rounded-xl p-4 transition-all group ${
              isApproved
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30'
                : 'bg-slate-800/50 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3">
              {isApproved ? (
                <Gavel size={24} className="text-amber-400" />
              ) : (
                <Shield size={24} className="text-slate-500" />
              )}
              <span className={`font-semibold ${isApproved ? 'text-white' : 'text-slate-500'}`}>
                {isApproved ? 'Auction Panel' : 'Awaiting Approval'}
              </span>
            </div>
            <ArrowRight size={20} className={`transition-transform ${
              isApproved ? 'text-amber-400 group-hover:translate-x-1' : 'text-slate-600'
            }`} />
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
              {/* Admin Approval Requirement */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isApproved ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {isApproved ? '✓' : '⏳'}
                </div>
                <span className="text-slate-300">
                  Admin Approval: <span className={isApproved ? 'text-green-400' : 'text-amber-400'}>
                    {isApproved ? 'Approved' : 'Pending'}
                  </span>
                </span>
              </div>

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
              const canStart = teamsOk && playersOk && categoriesOk && isApproved;

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
                    {isApproved ? <Gavel size={24} /> : <Shield size={24} />}
                    {isApproved ? 'START AUCTION' : 'AWAITING APPROVAL'}
                  </button>
                  {!isApproved && (
                    <p className="text-xs text-amber-400">
                      Your tournament is pending admin approval
                    </p>
                  )}
                  {isApproved && !canStart && (
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

// Auction Panel Wrapper - handles demo mode when no tournament exists
function AuctionPanelWrapper({ tournament, onClose }: { tournament: any; onClose?: () => void }) {
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(!tournament);
  const { setAuth, user } = useAuthStore();

  useEffect(() => {
    // If user has a tournament, use normal mode
    if (tournament) {
      setDemoMode(false);
      setLoading(false);
      return;
    }

    // No tournament - load demo data
    const loadDemo = async () => {
      try {
        const data = await api.getDemoTournament();
        setDemoMode(true);

        // Use the demo token so ProAuctionLayout can call APIs
        if (data.tournament && data.token) {
          api.setToken(data.token);
          // Set demo tournament in auth store
          const demoUser = user || { id: 'demo', name: 'Demo User', email: 'demo@example.com' };
          setAuth(demoUser as any, data.tournament, data.token);
        }
      } catch (err) {
        console.error('Failed to load demo:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDemo();
  }, [tournament, user, setAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Loading Auction Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 text-white py-2 px-4 text-center shadow-lg">
          <div className="flex items-center justify-center gap-3">
            <span className="text-lg">🎮</span>
            <span className="font-semibold">DEMO MODE</span>
            <span className="text-white/80">- Explore layouts, themes & features</span>
            <span className="mx-2">|</span>
            <span className="text-white/80">Create your own auction to start bidding for real!</span>
          </div>
        </div>
      )}

      {/* Add padding when demo banner is shown */}
      <div className={demoMode ? 'pt-10' : ''}>
        <Suspense fallback={
          <div className="h-full flex items-center justify-center bg-slate-950">
            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        }>
          <ProAuctionLayout onClose={onClose} />
        </Suspense>
      </div>
    </div>
  );
}

// Profile Panel
function ProfilePanel({ user, tournament, viewMode }: { user: any; tournament: any; viewMode: ViewMode }) {
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
            <p className="text-slate-400">Account Admin</p>
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

      {/* Only show Tournament Info when in auction mode (actually inside an auction) */}
      {viewMode === 'auction' && tournament && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Current Auction</h4>
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

  // Calculate category prices based on tournament budget
  const budget = tournament?.total_points || 1000000;
  const preset = budgetPresets.find(p => p.teamBudget === budget) ||
    budgetPresets.reduce((closest, p) =>
      Math.abs(p.teamBudget - budget) < Math.abs(closest.teamBudget - budget) ? p : closest
    );

  const categoryPrices = preset ? preset.categories : {
    platinum: Math.round(budget * 0.05),
    gold: Math.round(budget * 0.03),
    silver: Math.round(budget * 0.02),
    bronze: Math.round(budget * 0.01),
  };

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
    const confirmMsg = `Update all categories to budget-appropriate prices?\n\nBudget: ${formatBudgetLabel(budget)}\n\nPlatinum: ${formatBudgetLabel(categoryPrices.platinum)}\nGold: ${formatBudgetLabel(categoryPrices.gold)}\nSilver: ${formatBudgetLabel(categoryPrices.silver)}\nBronze: ${formatBudgetLabel(categoryPrices.bronze)}`;

    if (!confirm(confirmMsg)) return;
    setUpdating(true);
    try {
      await api.updateStandardCategoryPrices(categoryPrices);
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleDelete = async (playerId: string) => {
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

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const { downloadExcelTemplate } = await import('../components/import/ExcelTemplateGenerator');
      await downloadExcelTemplate(categories);
    } catch (err) {
      console.error('Failed to download template:', err);
      alert('Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImportComplete = () => {
    setShowImportModal(false);
    onRefresh();
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  // Dynamic import for ExcelImportModal
  const ExcelImportModal = React.lazy(() => import('../components/import/ExcelImportModal'));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => onNavigate('dashboard')} className="text-slate-500 hover:text-white transition-colors">HOME</button>
        <span className="text-slate-600">&gt;</span>
        <button onClick={() => onNavigate('auction-overview')} className="text-slate-500 hover:text-white transition-colors">AUCTION</button>
        <span className="text-slate-600">&gt;</span>
        <span className="text-amber-400">PLAYERS</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-amber-400 uppercase">{tournament?.name}</p>
          <h2 className="text-3xl font-bold text-white">PLAYERS</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={18} />
            {downloadingTemplate ? 'Downloading...' : 'Template'}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet size={18} />
            Import Excel
          </button>
          <button
            onClick={() => onNavigate('create-player')}
            className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl text-white font-semibold transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            ADD
          </button>
        </div>
      </div>

      {/* Excel Import Modal */}
      {showImportModal && (
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
          <ExcelImportModal
            categories={categories}
            onClose={() => setShowImportModal(false)}
            onSuccess={handleImportComplete}
          />
        </React.Suspense>
      )}

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
                  <p className="text-sm text-slate-400">{getCategoryName(player.category_id)} • <span className="text-cyan-400">{player.player_uid || '-'}</span></p>
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
    name: '',
    fatherName: '',
    age: '',
    mobileNo: '',
    city: '',
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
          fatherName: formData.fatherName,
          age: formData.age,
          mobileNo: formData.mobileNo,
          city: formData.city,
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
          name: '',
          fatherName: '',
          age: '',
          mobileNo: '',
          city: '',
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
                  <label className="text-slate-400 w-24 flex-shrink-0 text-sm">Player ID</label>
                  <div className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl px-4 py-2.5 text-cyan-400 text-sm flex items-center gap-2">
                    <span className="text-slate-500">Auto-generated</span>
                    <span className="text-xs text-slate-600">(P001, P002...)</span>
                  </div>
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

            {/* Row 3: Mobile + City */}
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
                <label className="text-slate-400 w-24 flex-shrink-0 text-sm">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Enter City"
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 text-sm"
                />
              </div>
            </div>

            {/* Row 4: Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
function CustomizeThemePanel({ tournament, onNavigate }: { tournament: any; onNavigate: (panel: SidebarPanel) => void }) {
  const { updateTournament } = useAuthStore();
  const {
    selectedLayout, setSelectedLayout,
    selectedThemeId, setSelectedTheme,
    cityBackgroundId, setCityBackground,
    premiumBackgroundId, setPremiumBackground,
    soundEnabled, toggleSound,
    showSponsors, toggleSponsors,
    sponsorRotationInterval, setSponsorRotationInterval
  } = useUIStore();
  const [selectedStamp, setSelectedStamp] = useState('classic');
  const [selectedEffect, setSelectedEffect] = useState('fireworks');
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [sponsors, setSponsors] = useState<Array<{ id: string; name?: string; logo_url: string; display_order: number }>>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorPhoto, setNewSponsorPhoto] = useState('');
  const [addingSponsor, setAddingSponsor] = useState(false);

  // Tournament settings state
  const [tournamentName, setTournamentName] = useState(tournament?.name || '');
  const [tournamentLogoUrl, setTournamentLogoUrl] = useState(tournament?.logo_url || '');
  const [savingTournament, setSavingTournament] = useState(false);

  // Broadcaster settings state
  const [broadcasterLogoUrl, setBroadcasterLogoUrl] = useState(tournament?.broadcaster_logo_url || '');
  const [broadcasterName, setBroadcasterName] = useState(tournament?.broadcaster_name || '');
  const [savingBroadcaster, setSavingBroadcaster] = useState(false);

  // Load sponsors
  useEffect(() => {
    loadSponsors();
  }, []);

  // Sync tournament state when tournament changes
  useEffect(() => {
    setTournamentName(tournament?.name || '');
    setTournamentLogoUrl(tournament?.logo_url || '');
  }, [tournament?.name, tournament?.logo_url]);

  // Sync broadcaster state when tournament changes
  useEffect(() => {
    setBroadcasterLogoUrl(tournament?.broadcaster_logo_url || '');
    setBroadcasterName(tournament?.broadcaster_name || '');
  }, [tournament?.broadcaster_logo_url, tournament?.broadcaster_name]);

  const loadSponsors = async () => {
    setLoadingSponsors(true);
    try {
      const data = await api.getSponsors() as Array<{ id: string; name?: string; logo_url: string; display_order: number }>;
      setSponsors(data.sort((a, b) => a.display_order - b.display_order));
    } catch (error) {
      console.error('Failed to load sponsors:', error);
    }
    setLoadingSponsors(false);
  };

  const handleAddSponsor = async () => {
    if (!newSponsorPhoto) return;
    if (sponsors.length >= 10) {
      alert('Maximum 10 sponsors allowed');
      return;
    }
    setAddingSponsor(true);
    try {
      await api.addSponsor(newSponsorPhoto, newSponsorName.trim() || undefined, sponsors.length + 1);
      setNewSponsorName('');
      setNewSponsorPhoto('');
      await loadSponsors();
    } catch (error) {
      console.error('Failed to add sponsor:', error);
      alert('Failed to add sponsor');
    }
    setAddingSponsor(false);
  };

  const handleDeleteSponsor = async (id: string) => {
    if (!confirm('Delete this sponsor?')) return;
    try {
      await api.deleteSponsor(id);
      await loadSponsors();
    } catch (error) {
      console.error('Failed to delete sponsor:', error);
    }
  };

  // Save tournament settings
  const handleSaveTournament = async () => {
    if (!tournamentName.trim()) {
      alert('Tournament name is required');
      return;
    }
    setSavingTournament(true);
    try {
      const updated = await api.updateTournament({
        name: tournamentName.trim(),
        logo_url: tournamentLogoUrl || undefined,
      }) as any;
      updateTournament(updated);
    } catch (error: any) {
      console.error('Failed to save tournament settings:', error);
      alert(error.message || 'Failed to save tournament settings');
    } finally {
      setSavingTournament(false);
    }
  };

  // Save broadcaster settings
  const handleSaveBroadcaster = async () => {
    setSavingBroadcaster(true);
    try {
      const updated = await api.updateTournament({
        broadcaster_logo_url: broadcasterLogoUrl || undefined,
        broadcaster_name: broadcasterName || undefined,
      }) as any;
      updateTournament(updated);
    } catch (error: any) {
      console.error('Failed to save broadcaster settings:', error);
      alert(error.message || 'Failed to save broadcaster settings');
    } finally {
      setSavingBroadcaster(false);
    }
  };

  const rotationOptions = [3, 4, 5, 6, 7, 8, 10];

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

      {/* Tournament Settings Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Trophy size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Tournament Settings</h3>
            <p className="text-sm text-slate-500">Configure tournament name and logo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tournament Logo */}
          <div>
            <ImageUpload
              label="Tournament Logo"
              value={tournamentLogoUrl}
              onChange={setTournamentLogoUrl}
              folder="tournament-logos"
              placeholder="Upload tournament logo"
            />
          </div>

          {/* Tournament Name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Tournament Name</label>
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="Enter tournament name..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Preview & Save */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            {tournamentLogoUrl && (
              <img src={tournamentLogoUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-slate-800" />
            )}
            <span className="text-white font-medium">{tournamentName || 'Tournament Name'}</span>
          </div>
          <button
            onClick={handleSaveTournament}
            disabled={savingTournament || !tournamentName.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingTournament ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Layout Selection Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <LayoutDashboard size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Layout Style</h3>
            <p className="text-sm text-slate-500">Choose your auction broadcast layout</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {layoutTemplates.map((layout) => (
            <button
              key={layout.id}
              onClick={() => setSelectedLayout(layout.id)}
              className={`relative rounded-xl p-4 transition-all border-2 ${
                selectedLayout === layout.id
                  ? 'border-blue-500 ring-4 ring-blue-500/20 bg-blue-500/10'
                  : 'border-slate-700/50 hover:border-slate-500 bg-slate-800/30'
              }`}
            >
              {/* Layout Icon */}
              <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${
                layout.id === 'classic' ? 'bg-slate-600' :
                layout.id === 'premium-broadcast' ? 'bg-gradient-to-br from-amber-500 to-yellow-600' :
                layout.id === 'fire' ? 'bg-gradient-to-br from-orange-500 to-red-600' :
                'bg-gradient-to-br from-cyan-500 to-blue-600'
              }`}>
                <span className="text-2xl">
                  {layout.id === 'classic' ? '📺' :
                   layout.id === 'premium-broadcast' ? '👑' :
                   layout.id === 'fire' ? '🔥' : '🌃'}
                </span>
              </div>

              {/* Layout name */}
              <p className="text-sm font-semibold text-white text-center">{layout.name}</p>
              <p className="text-xs text-slate-400 text-center mt-1 line-clamp-2">{layout.description}</p>

              {/* Selected checkmark */}
              {selectedLayout === layout.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Background Theme Section - Layout Specific */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Image size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Background Theme
              <span className="ml-2 text-xs font-normal px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                {layoutTemplates.find(l => l.id === selectedLayout)?.name || 'Classic'}
              </span>
            </h3>
            <p className="text-sm text-slate-500">
              {selectedLayout === 'classic' && 'Choose from animated or image backgrounds'}
              {selectedLayout === 'premium-broadcast' && 'Luxury backgrounds for premium auctions'}
              {selectedLayout === 'fire' && 'Fire theme has a built-in dramatic background'}
              {selectedLayout === 'city' && 'City skyline backgrounds with neon effects'}
            </p>
          </div>
        </div>

        {/* Classic Layout Backgrounds */}
        {selectedLayout === 'classic' && (
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
                <div className="h-24 relative pointer-events-none">
                  {t.animatedBg ? (
                    <div className="w-full h-full bg-slate-950 relative overflow-hidden pointer-events-none">
                      <AnimatedBackground type={t.animatedBg} accentColor={t.accentColor} intensity="low" />
                    </div>
                  ) : t.background ? (
                    <img src={t.background} alt={t.name} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <div className="w-full h-full pointer-events-none" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full opacity-30" style={{ background: t.accentColor, filter: 'blur(15px)' }} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  {t.isAnimated && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-600 rounded-lg shadow-lg">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase">Live</span>
                    </div>
                  )}
                  {selectedThemeId === t.id && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check size={14} className="text-black" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0" style={{ background: t.accentColor }} />
                    <p className="text-xs text-white font-medium truncate">{t.name}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Premium Broadcast Backgrounds */}
        {selectedLayout === 'premium-broadcast' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {premiumBackgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setPremiumBackground(bg.id)}
                className={`relative rounded-xl transition-all overflow-hidden border-2 ${
                  premiumBackgroundId === bg.id
                    ? 'border-amber-500 ring-4 ring-amber-500/20 scale-[1.02]'
                    : 'border-slate-700/50 hover:border-slate-500 hover:scale-[1.02]'
                }`}
              >
                <div className="h-24 relative">
                  {bg.type === 'image' ? (
                    <img src={bg.value} alt={bg.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: bg.value }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {bg.type === 'image' && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-amber-600/80 rounded text-[10px] font-bold text-white">
                      IMAGE
                    </div>
                  )}
                  {premiumBackgroundId === bg.id && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check size={14} className="text-black" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-xs text-white font-medium truncate">{bg.name}</p>
                  {bg.description && <p className="text-[10px] text-slate-400 truncate">{bg.description}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* City Layout Backgrounds */}
        {selectedLayout === 'city' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cityBackgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setCityBackground(bg.id)}
                className={`relative rounded-xl transition-all overflow-hidden border-2 ${
                  cityBackgroundId === bg.id
                    ? 'border-cyan-500 ring-4 ring-cyan-500/20 scale-[1.02]'
                    : 'border-slate-700/50 hover:border-slate-500 hover:scale-[1.02]'
                }`}
              >
                <div className="h-24 relative">
                  <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {bg.type === 'video' && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-600 rounded-lg shadow-lg">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase">Video</span>
                    </div>
                  )}
                  {cityBackgroundId === bg.id && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-xs text-white font-medium truncate">{bg.name}</p>
                  {bg.description && <p className="text-[10px] text-slate-400 truncate">{bg.description}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Fire Layout - Built-in Background */}
        {selectedLayout === 'fire' && (
          <div className="flex items-center justify-center p-8 bg-gradient-to-br from-orange-900/20 to-red-900/20 rounded-xl border border-orange-500/30">
            <div className="text-center">
              <div className="text-6xl mb-4">🔥</div>
              <p className="text-white font-semibold">Fire Theme Active</p>
              <p className="text-sm text-slate-400 mt-2">
                The Fire layout includes a dramatic built-in animated fire background.
                <br />No additional background selection needed.
              </p>
            </div>
          </div>
        )}
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

      {/* Sponsors Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Sponsors</h3>
              <p className="text-sm text-slate-500">Add up to 10 sponsor logos (rotates on screen)</p>
            </div>
          </div>
          <button
            onClick={toggleSponsors}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              showSponsors
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {showSponsors ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {showSponsors ? 'Visible' : 'Hidden'}
          </button>
        </div>

        {/* Rotation Interval */}
        <div className="mb-4 p-4 bg-slate-800/50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Rotation Interval</span>
            <span className="text-xs text-slate-500">{sponsorRotationInterval} seconds</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {rotationOptions.map((sec) => (
              <button
                key={sec}
                onClick={() => setSponsorRotationInterval(sec)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  sponsorRotationInterval === sec
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Current Sponsors */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Current Sponsors ({sponsors.length}/10)</span>
            {loadingSponsors && <span className="text-xs text-slate-500">Loading...</span>}
          </div>

          {sponsors.length === 0 ? (
            <div className="text-center py-6 text-slate-500 bg-slate-800/30 rounded-xl">
              No sponsors added yet
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {sponsors.map((sponsor, idx) => (
                <div
                  key={sponsor.id}
                  className="relative group bg-slate-800/50 rounded-xl p-3 border border-slate-700/50"
                >
                  <div className="absolute top-1 left-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black">
                    {idx + 1}
                  </div>
                  <button
                    onClick={() => handleDeleteSponsor(sponsor.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} className="text-white" />
                  </button>
                  <div className="h-12 flex items-center justify-center mb-2">
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name || `Sponsor ${idx + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-center text-slate-400 truncate">
                    {sponsor.name || `Sponsor ${idx + 1}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Sponsor */}
        {sponsors.length < 10 && (
          <div className="p-4 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
            <p className="text-sm text-slate-400 mb-3">Add New Sponsor ({sponsors.length + 1}/10)</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Sponsor Name (optional)"
                value={newSponsorName}
                onChange={(e) => setNewSponsorName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <ImageUpload
                value={newSponsorPhoto}
                onChange={setNewSponsorPhoto}
                label="Sponsor Logo"
                placeholder="Drop sponsor logo here or click to upload"
                folder="sponsors"
                maxSizeMB={2}
              />
              <button
                onClick={handleAddSponsor}
                disabled={!newSponsorPhoto || addingSponsor}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold rounded-lg transition-colors"
              >
                <Plus size={18} />
                {addingSponsor ? 'Adding...' : 'Add Sponsor'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Broadcaster Settings Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Broadcaster Settings</h3>
            <p className="text-sm text-slate-500">Configure broadcaster branding for overlay, animations, and break screens</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <ImageUpload
              label="Broadcaster Logo"
              value={broadcasterLogoUrl}
              onChange={setBroadcasterLogoUrl}
              folder="broadcaster-logos"
              placeholder="Upload broadcaster logo"
              maxSizeMB={2}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Broadcaster Name (Optional)</label>
            <input
              type="text"
              value={broadcasterName}
              onChange={(e) => setBroadcasterName(e.target.value)}
              placeholder="e.g., Sports Network TV"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Preview and Save */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
          <div className="flex items-center gap-3">
            {broadcasterLogoUrl ? (
              <>
                <img
                  src={broadcasterLogoUrl}
                  alt="Broadcaster Logo Preview"
                  className="h-10 w-auto object-contain bg-slate-900 rounded-lg p-1"
                />
                <span className="text-sm text-slate-400">
                  {broadcasterName || 'Logo will appear on overlay & animations'}
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-500">No broadcaster logo configured</span>
            )}
          </div>
          <button
            onClick={handleSaveBroadcaster}
            disabled={savingBroadcaster}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {savingBroadcaster ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save
              </>
            )}
          </button>
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

      {/* Overlay Settings Section */}
      <OverlaySettingsSection tournament={tournament} />

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
          onClick={async () => {
            // Save all pending changes before navigating
            try {
              // Save tournament settings if changed
              if (tournamentName !== tournament?.name || tournamentLogoUrl !== tournament?.logo_url) {
                await handleSaveTournament();
              }
              // Save broadcaster settings if changed
              if (broadcasterLogoUrl !== tournament?.broadcaster_logo_url || broadcasterName !== tournament?.broadcaster_name) {
                await handleSaveBroadcaster();
              }
              onNavigate('auction-detail');
            } catch (error) {
              console.error('Failed to save changes:', error);
            }
          }}
          disabled={savingTournament || savingBroadcaster}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
        >
          {savingTournament || savingBroadcaster ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// Overlay Settings Section Component for CustomizeThemePanel
function OverlaySettingsSection({ tournament }: { tournament: any }) {
  const { updateTournament } = useAuthStore();
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>(
    tournament?.overlay_settings || defaultOverlaySettings
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareCode = tournament?.share_code || '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

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
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
            <Monitor size={20} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">OBS Overlay Settings</h3>
            <p className="text-sm text-slate-500">Customize streaming overlay appearance</p>
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
            <Palette size={16} className="text-purple-400" />
            <span className="text-sm text-slate-400">Overlay Theme</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {themeOptions.map((theme) => (
              <button
                key={theme.value}
                onClick={() => handleSettingChange('theme', theme.value)}
                className={`relative p-3 rounded-xl text-left transition-all ${
                  overlaySettings.theme === theme.value
                    ? 'bg-gradient-to-br from-slate-700 to-slate-800 ring-2 ring-cyan-500 scale-[1.02]'
                    : 'bg-slate-800/50 hover:bg-slate-800 hover:scale-[1.01]'
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
                <p className="text-xs text-slate-500">{theme.description}</p>
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
            <Layout size={16} className="text-blue-400" />
            <span className="text-sm text-slate-400">Display Mode</span>
          </div>
          <div className="flex gap-2">
            {modeOptions.map((mode) => (
              <button
                key={mode.value}
                onClick={() => handleSettingChange('mode', mode.value)}
                className={`flex-1 p-3 rounded-xl text-center transition-all ${
                  overlaySettings.mode === mode.value
                    ? 'bg-blue-600/30 border border-blue-500/50 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
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
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
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
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
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
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
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
            <Palette size={16} className="text-pink-400" />
            <span className="text-sm text-slate-400">Accent Color</span>
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
              className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-mono"
              placeholder="#22c55e"
            />
            <div
              className="w-10 h-10 rounded-lg"
              style={{ background: overlaySettings.accentColor, boxShadow: `0 0 20px ${overlaySettings.accentColor}50` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={openPreview}
            disabled={!shareCode}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye size={18} />
            Preview Overlay
          </button>
          <button
            onClick={copyOverlayUrl}
            disabled={!shareCode}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              copied
                ? 'bg-green-600/20 border-green-500/50 text-green-400'
                : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
            }`}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>

        {/* URL Display */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">OBS Browser Source URL</span>
            <ExternalLink size={12} className="text-slate-500" />
          </div>
          <p className="text-xs text-cyan-400 font-mono break-all">
            {shareCode ? getOverlayUrl() : 'Save tournament to generate overlay URL'}
          </p>
        </div>
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

  // Loading fallback for lazy-loaded components
  const LoadingFallback = () => (
    <div className="h-full flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-slate-400">Loading...</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'auction':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ProAuctionLayout onClose={onBack} />
          </Suspense>
        );
      case 'summary':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <Suspense fallback={<LoadingFallback />}>
              <SummaryPanel />
            </Suspense>
          </div>
        );
      case 'players':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <Suspense fallback={<LoadingFallback />}>
              <PlayersPanel />
            </Suspense>
          </div>
        );
      case 'category':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <Suspense fallback={<LoadingFallback />}>
              <CategoryPanel />
            </Suspense>
          </div>
        );
      case 'retention':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <Suspense fallback={<LoadingFallback />}>
              <RetentionPanel />
            </Suspense>
          </div>
        );
      case 'stats':
        return (
          <div className="h-full overflow-auto p-4 bg-slate-950">
            <Suspense fallback={<LoadingFallback />}>
              <StatsPanel />
            </Suspense>
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
            <Suspense fallback={<LoadingFallback />}>
              <ManagePanel />
            </Suspense>
          </div>
        );
      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ProAuctionLayout onClose={onBack} />
          </Suspense>
        );
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
