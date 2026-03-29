import { useUIStore } from '../../stores/uiStore';
import {
  Gavel,
  LayoutGrid,
  Users,
  Tags,
  Settings,
  Maximize,
  MoreHorizontal,
  X,
  Link,
  Sparkles,
  Shield,
  BarChart3,
  MessageCircle,
  Upload,
  Shuffle,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { key: 'auction', label: 'Auction', shortcut: 'A', icon: Gavel },
  { key: 'summary', label: 'Summary', shortcut: 'S', icon: LayoutGrid },
  { key: 'players', label: 'Players', shortcut: 'P', icon: Users },
  { key: 'category', label: 'Category', shortcut: 'C', icon: Tags },
  { key: 'retention', label: 'Retention', shortcut: 'R', icon: Shield },
  { key: 'stats', label: 'Stats', shortcut: 'T', icon: BarChart3 },
  { key: 'manage', label: 'Manage', shortcut: 'M', icon: Settings },
] as const;

export default function BottomNav() {
  const { activePanel, setActivePanel, toggleFullscreen, isFullscreen, showExtraMenu, toggleExtraMenu, toggleChat, setShowImportModal } = useUIStore();
  const { tournament } = useAuthStore();

  // Ensure share_code is valid
  const shareCode = tournament?.share_code && tournament.share_code !== 'undefined' ? tournament.share_code : '';

  const shareLinks = shareCode ? [
    { label: 'Live View', url: `/live/${shareCode}` },
    { label: 'Summary Screen', url: `/summary/${shareCode}` },
    { label: 'OBS Overlay', url: `/overlay/${shareCode}` },
  ] : [];

  const copyLink = async (path: string) => {
    if (!shareCode) {
      alert('No valid share code found. Please log out and log in again.');
      return;
    }
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <nav className="fixed bottom-0 right-0 p-4 z-50">
      <div className="flex items-center gap-2">
        {/* Navigation Buttons */}
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActivePanel(item.key)}
            className={`group relative flex items-center justify-center w-12 h-12 rounded-lg transition-all ${
              activePanel === item.key
                ? 'bg-primary-600 text-white'
                : 'bg-auction-card text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
            title={`${item.label} (${item.shortcut})`}
          >
            <item.icon size={20} />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {item.label}
              <span className="ml-1 kbd">{item.shortcut}</span>
            </span>
          </button>
        ))}

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className={`group relative flex items-center justify-center w-12 h-12 rounded-lg transition-all ${
            isFullscreen
              ? 'bg-green-600 text-white'
              : 'bg-auction-card text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          title="Fullscreen (F)"
        >
          <Maximize size={20} />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Fullscreen
            <span className="ml-1 kbd">F</span>
          </span>
        </button>

        {/* Extra Menu */}
        <div className="relative">
          <button
            onClick={toggleExtraMenu}
            className={`flex items-center justify-center w-12 h-12 rounded-lg transition-all ${
              showExtraMenu
                ? 'bg-primary-600 text-white'
                : 'bg-auction-card text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {showExtraMenu ? <X size={20} /> : <MoreHorizontal size={20} />}
          </button>

          {showExtraMenu && (
            <div className="absolute bottom-14 right-0 bg-auction-card border border-auction-border rounded-lg shadow-xl p-4 min-w-[250px]">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Link size={16} />
                Share Links
              </h3>
              <div className="space-y-2">
                {shareLinks.map((link) => (
                  <div
                    key={link.label}
                    className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-white">{link.label}</span>
                    <button
                      onClick={() => copyLink(link.url)}
                      className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded"
                    >
                      Copy Link
                    </button>
                  </div>
                ))}
              </div>

              <hr className="my-4 border-auction-border" />

              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Sparkles size={16} />
                Advanced Features
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  className="bg-slate-800 text-slate-400 px-3 py-2 rounded hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5"
                  onClick={() => { setActivePanel('draft'); toggleExtraMenu(); }}
                >
                  <Shuffle size={14} />
                  Draft Mode
                </button>
                <button
                  className="bg-slate-800 text-slate-400 px-3 py-2 rounded hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5"
                  onClick={() => { setActivePanel('analytics'); toggleExtraMenu(); }}
                >
                  <TrendingUp size={14} />
                  Analytics
                </button>
                <button
                  className="bg-slate-800 text-slate-400 px-3 py-2 rounded hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5"
                  onClick={() => { toggleChat(); toggleExtraMenu(); }}
                >
                  <MessageCircle size={14} />
                  Live Chat
                </button>
                <button
                  className="bg-slate-800 text-slate-400 px-3 py-2 rounded hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5"
                  onClick={() => { setShowImportModal(true); toggleExtraMenu(); }}
                >
                  <Upload size={14} />
                  Import CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
