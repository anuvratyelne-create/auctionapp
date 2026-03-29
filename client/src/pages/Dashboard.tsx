import { useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';
import { api } from '../utils/api';
import { Team, Player, Category } from '../types';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import ProAuctionLayout from '../components/auction/ProAuctionLayout';
import SummaryPanel from '../components/summary/SummaryPanel';
import PlayersPanel from '../components/players/PlayersPanel';
import CategoryPanel from '../components/category/CategoryPanel';
import ManagePanel from '../components/manage/ManagePanel';
import RetentionPanel from '../components/retention/RetentionPanel';
import StatsPanel from '../components/stats/StatsPanel';
import DraftModePanel from '../components/draft/DraftModePanel';
import AdvancedAnalytics from '../components/analytics/AdvancedAnalytics';
import ChatPanel from '../components/chat/ChatPanel';
import CSVImportModal from '../components/import/CSVImportModal';

export default function Dashboard() {
  const { activePanel, isFullscreen, showChat, toggleChat, showImportModal, setShowImportModal } = useUIStore();
  const { tournament, user } = useAuthStore();
  const socket = useSocket();

  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        useUIStore.getState().toggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const renderPanel = () => {
    switch (activePanel) {
      case 'auction':
        return <ProAuctionLayout />;
      case 'summary':
        return <SummaryPanel />;
      case 'players':
        return <PlayersPanel />;
      case 'category':
        return <CategoryPanel />;
      case 'manage':
        return <ManagePanel />;
      case 'retention':
        return <RetentionPanel />;
      case 'stats':
        return <StatsPanel />;
      case 'draft':
        return (
          <div className="p-6">
            <DraftModePanel
              teams={teams}
              players={players}
              categories={categories}
              tournamentId={tournament?.id || ''}
              onPlayerPicked={loadData}
            />
          </div>
        );
      case 'analytics':
        return (
          <div className="p-6">
            <AdvancedAnalytics
              teams={teams}
              players={players}
              categories={categories}
              tournamentTotalBudget={tournament?.total_points || 100000}
            />
          </div>
        );
      default:
        return <ProAuctionLayout />;
    }
  };

  return (
    <div className={`min-h-screen bg-auction-bg ${isFullscreen ? 'fullscreen-mode' : ''} ${activePanel === 'auction' ? 'h-screen overflow-hidden' : ''}`}>
      {/* Hide header on auction panel - it has its own header */}
      {activePanel !== 'auction' && <Header />}
      <main className={activePanel === 'auction' ? 'h-screen' : 'pb-24'}>
        {renderPanel()}
      </main>
      {/* Bottom nav fixed at bottom, auction layout handles its own spacing */}
      <BottomNav />

      {/* Chat Panel */}
      {tournament && user && (
        <ChatPanel
          tournamentId={tournament.id}
          userId={user.id}
          userName={user.mobile}
          isOpen={showChat}
          onClose={toggleChat}
        />
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <CSVImportModal
          categories={categories}
          onClose={() => setShowImportModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
