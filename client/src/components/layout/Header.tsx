import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../utils/api';
import { Sponsor } from '../../types';
import { Trophy, Sparkles, Copy, Check, ChevronDown, Plus, RefreshCw } from 'lucide-react';
import ConnectionStatus from '../common/ConnectionStatus';

export default function Header() {
  const { tournament, tournaments, switchTournament } = useAuthStore();
  const navigate = useNavigate();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showTournamentDropdown, setShowTournamentDropdown] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTournamentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchTournament = async (tournamentId: string) => {
    if (tournamentId === tournament?.id) {
      setShowTournamentDropdown(false);
      return;
    }
    setSwitching(true);
    const success = await switchTournament(tournamentId);
    setSwitching(false);
    if (success) {
      setShowTournamentDropdown(false);
      // Reload the page to refresh all data
      window.location.reload();
    }
  };

  useEffect(() => {
    loadSponsors();
  }, []);

  useEffect(() => {
    if (sponsors.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSponsorIndex((prev) => (prev + 1) % sponsors.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [sponsors.length]);

  const loadSponsors = async () => {
    try {
      const data = await api.getSponsors() as Sponsor[];
      setSponsors(data);
    } catch (error) {
      console.error('Failed to load sponsors:', error);
    }
  };

  const copyShareCode = async () => {
    const shareCode = tournament?.share_code;
    if (shareCode && shareCode !== 'undefined') {
      try {
        await navigator.clipboard.writeText(shareCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = shareCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-purple-600/10 to-amber-600/10 animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-600/20 via-transparent to-transparent" />

      {/* Sparkle effects */}
      <div className="absolute top-2 left-1/4 w-1 h-1 bg-amber-400 rounded-full animate-ping" />
      <div className="absolute top-4 right-1/3 w-1 h-1 bg-primary-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-3 left-1/2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Tournament Logo */}
          <div className="flex items-center gap-4">
            {tournament?.logo_url ? (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
                <img
                  src={tournament.logo_url}
                  alt={tournament.name}
                  className="relative h-14 w-auto object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative h-14 w-14 bg-gradient-to-br from-primary-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {tournament?.name?.charAt(0) || 'A'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tournament Name - Fancy */}
          <div className="flex-1 text-center px-8">
            <div className="inline-flex flex-col items-center">
              {/* Main Title with Gradient + Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => tournaments.length > 1 && setShowTournamentDropdown(!showTournamentDropdown)}
                  className={`group flex items-center gap-2 ${tournaments.length > 1 ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                >
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight">
                    <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-lg">
                      {tournament?.name || 'Player Auction'}
                    </span>
                  </h1>
                  {tournaments.length > 1 && (
                    <ChevronDown
                      size={24}
                      className={`text-amber-400 transition-transform ${showTournamentDropdown ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                {/* Glow effect behind text */}
                <div className="absolute inset-0 text-4xl md:text-5xl lg:text-6xl font-black tracking-tight blur-lg opacity-50 pointer-events-none">
                  <span className="text-amber-400">
                    {tournament?.name || 'Player Auction'}
                  </span>
                </div>

                {/* Tournament Dropdown */}
                {showTournamentDropdown && tournaments.length > 1 && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-slate-700">
                      <p className="text-xs text-slate-400 px-2">Switch Tournament</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {tournaments.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleSwitchTournament(t.id)}
                          disabled={switching}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors ${
                            t.id === tournament?.id ? 'bg-slate-800/50' : ''
                          }`}
                        >
                          {t.logo_url ? (
                            <img src={t.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-sm">{t.name?.charAt(0)}</span>
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-white font-medium text-sm">{t.name}</p>
                            <p className="text-slate-500 text-xs">{t.share_code}</p>
                          </div>
                          {t.id === tournament?.id && (
                            <Check size={16} className="text-emerald-400" />
                          )}
                          {switching && t.id !== tournament?.id && (
                            <RefreshCw size={14} className="text-slate-400 animate-spin" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="p-2 border-t border-slate-700">
                      <button
                        onClick={() => {
                          setShowTournamentDropdown(false);
                          navigate('/manage/settings');
                        }}
                        className="w-full px-4 py-2 flex items-center justify-center gap-2 text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        <span className="text-sm font-medium">Create New Tournament</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Decorative line */}
              <div className="flex items-center gap-2 mt-1">
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                <Sparkles size={12} className="text-amber-400" />
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              </div>

              {/* Share Code & Connection Status */}
              <div className="mt-2 flex items-center gap-3">
                {tournament?.share_code && tournament.share_code !== 'undefined' && (
                  <button
                    onClick={copyShareCode}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 hover:border-primary-500/50 transition-all group"
                  >
                    <span className="text-xs text-slate-400">Share Code:</span>
                    <span className="font-mono font-bold text-primary-400 tracking-wider">{tournament.share_code}</span>
                    {copied ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} className="text-slate-500 group-hover:text-primary-400 transition-colors" />
                    )}
                  </button>
                )}
                <ConnectionStatus />
              </div>
            </div>
          </div>

          {/* Actions & Sponsors */}
          <div className="flex items-center gap-4 min-w-[150px] justify-end">
            {/* Top Players Link */}
            <button
              onClick={() => navigate('/top-players')}
              className="relative group flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-amber-600 group-hover:from-yellow-400 group-hover:to-amber-500 transition-all" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <Trophy size={18} className="relative text-black" />
              <span className="relative hidden md:inline text-black">Top Players</span>
            </button>

            {sponsors.length > 0 && (
              <div className="relative h-12 w-32 overflow-hidden rounded-lg bg-white/5 p-1">
                {sponsors.map((sponsor, index) => (
                  <img
                    key={sponsor.id}
                    src={sponsor.logo_url}
                    alt="Sponsor"
                    className={`absolute inset-0 h-full w-full object-contain p-1 transition-opacity duration-500 ${
                      index === currentSponsorIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
