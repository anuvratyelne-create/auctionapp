import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { socketClient } from '../socket/client';
import { useAuctionStore } from '../stores/auctionStore';
import { api } from '../utils/api';
import { Tournament, OverlayTheme, OverlaySettings } from '../types';
import OverlayCelebration from '../components/overlay/OverlayCelebration';
import FireOverlay from '../components/overlay/themes/FireOverlay';
import CityOverlay from '../components/overlay/themes/CityOverlay';
import CityStandardOverlay from '../components/overlay/themes/CityStandardOverlay';
import PremiumOverlay from '../components/overlay/themes/PremiumOverlay';
import PremiumStandardOverlay from '../components/overlay/themes/PremiumStandardOverlay';
import { defaultOverlaySettings } from '../config/overlayThemes';
import { User } from 'lucide-react';

type OverlayMode = 'minimal' | 'standard' | 'premium';

export default function OverlayView() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as OverlayMode) || 'standard';
  const urlTheme = searchParams.get('theme') as OverlayTheme | null;
  const urlAccentColor = searchParams.get('color');

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>(defaultOverlaySettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timerState, setTimerState] = useState({ timeLeft: 30, isRunning: false, duration: 30 });
  const [, setLocalTimeLeft] = useState(30);
  const [showCelebration, setShowCelebration] = useState(false);
  const [bidAnimating, setBidAnimating] = useState(false);
  const [slideState, setSlideState] = useState<'entering' | 'active' | 'sold' | 'unsold'>('active');
  const [previousPlayer, setPreviousPlayer] = useState<string | null>(null);
  const previousStatusRef = useRef<string>('idle');
  const previousBidRef = useRef<number>(0);
  const [showAppLogo, setShowAppLogo] = useState(false); // For rotating logo display

  const { currentPlayer, currentBid, currentTeam, status, setAuctionState } = useAuctionStore();

  // Determine which theme to use (URL override > tournament settings > auto-detect)
  const resolvedTheme: Exclude<OverlayTheme, 'auto'> = (() => {
    // URL parameter takes priority
    if (urlTheme && urlTheme !== 'auto') return urlTheme;

    // Then check tournament overlay settings
    if (overlaySettings.theme !== 'auto') return overlaySettings.theme;

    // If 'auto', use classic as default (admin layout sync would require additional data)
    return 'classic';
  })();

  // Get accent color from admin's selected theme via shared localStorage
  const [adminAccentColor, setAdminAccentColor] = useState<string | null>(null);

  // Read admin's theme from localStorage (uiStore persists there)
  useEffect(() => {
    const readAdminTheme = () => {
      try {
        const uiData = localStorage.getItem('auction-ui-storage');
        if (uiData) {
          const parsed = JSON.parse(uiData);
          const themeId = parsed?.state?.selectedThemeId;
          if (themeId) {
            // Import template config dynamically to get accent color
            import('../config/auctionTemplates').then(({ getTemplate }) => {
              const template = getTemplate(themeId);
              if (template?.accentColor) {
                setAdminAccentColor(template.accentColor);
              }
            });
          }
        }
      } catch (e) {
        console.warn('[Overlay] Failed to read admin theme:', e);
      }
    };

    // Read on mount
    readAdminTheme();

    // Listen for localStorage changes (when admin changes theme)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auction-ui-storage') {
        readAdminTheme();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Also poll periodically since storage event doesn't fire for same-tab changes
    const interval = setInterval(readAdminTheme, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Rotating logo effect: alternate between broadcaster logo and app logo every 5 seconds
  useEffect(() => {
    // If no broadcaster logo, always show app logo
    if (!tournament?.broadcaster_logo_url) {
      setShowAppLogo(true);
      return;
    }

    // Rotate between broadcaster and app logo every 5 seconds
    const logoInterval = setInterval(() => {
      setShowAppLogo((prev) => !prev);
    }, 5000);

    return () => clearInterval(logoInterval);
  }, [tournament?.broadcaster_logo_url]);

  // Get effective accent color (URL > admin theme > settings > default)
  const effectiveAccentColor = urlAccentColor || adminAccentColor || overlaySettings.accentColor || '#22c55e';

  useEffect(() => {
    if (!shareCode) return;
    loadTournament();
  }, [shareCode]);

  useEffect(() => {
    if (!tournament?.id) return;

    socketClient.joinOverlayView(tournament.id);

    const handleAuctionState = (state: any) => {
      setAuctionState(state);
      // Also sync timer from auction state
      if (state?.timer) {
        setTimerState(state.timer);
        setLocalTimeLeft(state.timer.timeLeft);
      }
      // Sync accent color from auction state (set by admin)
      if (state?.accentColor) {
        setOverlaySettings(prev => ({ ...prev, accentColor: state.accentColor }));
      }
    };

    const handleTimerSync = (data: { timeLeft: number; isRunning: boolean; duration: number }) => {
      setTimerState(data);
      setLocalTimeLeft(data.timeLeft);
    };

    socketClient.onAuctionState(handleAuctionState);
    socketClient.onTimerSync(handleTimerSync);

    return () => {
      socketClient.off('auction:state', handleAuctionState);
      socketClient.off('timer:sync', handleTimerSync);
    };
  }, [tournament?.id]);

  // Local countdown when timer is running
  // Note: localTimeLeft removed from dependencies to prevent interval recreation every second
  useEffect(() => {
    if (!timerState.isRunning) return;

    const interval = setInterval(() => {
      setLocalTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning]);

  // Animate bid changes
  useEffect(() => {
    if (currentBid !== previousBidRef.current && currentBid > 0) {
      setBidAnimating(true);
      setTimeout(() => setBidAnimating(false), 400);
      previousBidRef.current = currentBid;
    }
  }, [currentBid]);

  // Handle slide transitions for new player
  useEffect(() => {
    if (currentPlayer && currentPlayer.id !== previousPlayer) {
      setSlideState('entering');
      setTimeout(() => setSlideState('active'), 1500);
      setPreviousPlayer(currentPlayer.id);
    }
  }, [currentPlayer?.id]);

  // Show celebration on sold/unsold
  useEffect(() => {
    if (status === 'sold' && previousStatusRef.current !== 'sold') {
      setSlideState('sold');
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3500);
      previousStatusRef.current = status;
      return () => clearTimeout(timer);
    } else if (status === 'unsold' && previousStatusRef.current !== 'unsold') {
      setSlideState('unsold');
      previousStatusRef.current = status;
    } else if (status === 'bidding') {
      previousStatusRef.current = status;
    }
  }, [status]);

  const loadTournament = async () => {
    try {
      const tournamentData = await api.getTournamentByShareCode(shareCode!) as Tournament;
      setTournament(tournamentData);

      // Load overlay settings from tournament if available
      if (tournamentData.overlay_settings) {
        setOverlaySettings({ ...defaultOverlaySettings, ...tournamentData.overlay_settings });
      }
    } catch {
      setError('Tournament not found');
    } finally {
      setLoading(false);
    }
  };

  // Listen for overlay settings updates via socket
  useEffect(() => {
    if (!tournament?.id) return;

    const handleOverlaySettingsUpdate = (settings: Partial<OverlaySettings>) => {
      setOverlaySettings(prev => ({ ...prev, ...settings }));
    };

    socketClient.onOverlaySettingsUpdated(handleOverlaySettingsUpdate);

    return () => {
      socketClient.off('overlay:settingsUpdated', handleOverlaySettingsUpdate);
    };
  }, [tournament?.id]);

  if (loading) {
    return <div className="overlay-bg" />;
  }

  if (error || !currentPlayer || status === 'idle') {
    return <div className="overlay-bg min-h-screen" />;
  }

  // ============================================
  // THEMED OVERLAYS - Fire, City, Premium themes
  // These are full-screen themed overlays that match admin layouts
  // ============================================
  if (resolvedTheme === 'fire') {
    return (
      <FireOverlay
        player={currentPlayer}
        currentBid={currentBid}
        currentTeam={currentTeam}
        status={status}
        tournament={tournament}
        slideState={slideState}
        bidAnimating={bidAnimating}
        showParticles={overlaySettings.showParticles}
        accentColor={effectiveAccentColor}
      />
    );
  }

  if (resolvedTheme === 'city') {
    return (
      <CityOverlay
        player={currentPlayer}
        currentBid={currentBid}
        currentTeam={currentTeam}
        status={status}
        tournament={tournament}
        slideState={slideState}
        bidAnimating={bidAnimating}
        showParticles={overlaySettings.showParticles}
        accentColor={effectiveAccentColor}
      />
    );
  }

  if (resolvedTheme === 'city-standard') {
    return (
      <CityStandardOverlay
        player={currentPlayer}
        currentBid={currentBid}
        currentTeam={currentTeam}
        status={status}
        tournament={tournament}
        slideState={slideState}
        bidAnimating={bidAnimating}
        showParticles={overlaySettings.showParticles}
        accentColor={effectiveAccentColor}
      />
    );
  }

  if (resolvedTheme === 'premium') {
    return (
      <PremiumOverlay
        player={currentPlayer}
        currentBid={currentBid}
        currentTeam={currentTeam}
        status={status}
        tournament={tournament}
        slideState={slideState}
        bidAnimating={bidAnimating}
        showParticles={overlaySettings.showParticles}
        accentColor={effectiveAccentColor}
      />
    );
  }

  if (resolvedTheme === 'premium-standard') {
    return (
      <PremiumStandardOverlay
        player={currentPlayer}
        currentBid={currentBid}
        currentTeam={currentTeam}
        status={status}
        tournament={tournament}
        slideState={slideState}
        bidAnimating={bidAnimating}
        showParticles={overlaySettings.showParticles}
        accentColor={effectiveAccentColor}
      />
    );
  }

  // ============================================
  // CLASSIC MODE OVERLAYS (minimal, standard, premium mode params)
  // ============================================

  // ============================================
  // MINIMAL MODE - Bottom Bar Strip (TV Lower Third)
  // ============================================
  if (mode === 'minimal') {
    return (
      <div className="overlay-bg min-h-screen relative overflow-hidden">
        <OverlayCelebration
          isActive={showCelebration}
          team={currentTeam}
          soldPrice={currentBid}
          accentColor={effectiveAccentColor}
        />

        {/* ========== FLOATING LOGOS - TV BROADCAST STYLE ========== */}

        {/* Top Left - Tournament Logo (Large, Floating) */}
        <div className="absolute top-6 left-6 z-30 animate-slide-down">
          <div className="flex items-center gap-5">
            {tournament?.logo_url && (
              <div className="relative">
                <div
                  className="absolute -inset-5 rounded-3xl opacity-50 blur-2xl animate-pulse"
                  style={{ background: effectiveAccentColor }}
                />
                <img
                  src={tournament.logo_url}
                  alt={tournament.name}
                  className="relative h-48 w-auto object-contain drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 6px 25px rgba(0,0,0,0.9))' }}
                />
              </div>
            )}
            <div>
              <p className="text-4xl font-black text-white tracking-tight drop-shadow-lg">{tournament?.name}</p>
              <p className="text-base uppercase tracking-[0.3em] font-bold mt-1" style={{ color: effectiveAccentColor, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                Players Auction
              </p>
            </div>
          </div>
        </div>

        {/* Top Right - Rotating Logo (Broadcaster ↔ App Logo) */}
        <div className="absolute top-6 right-6 z-30 animate-slide-down">
          <div className="relative">
            <div
              className="absolute -inset-5 rounded-3xl opacity-50 blur-2xl transition-colors duration-500"
              style={{ background: showAppLogo ? '#06b6d4' : effectiveAccentColor }}
            />
            <img
              src={showAppLogo ? '/logo.png' : (tournament?.broadcaster_logo_url || '/logo.png')}
              alt={showAppLogo ? 'Game Auction' : (tournament?.broadcaster_name || 'Broadcaster')}
              className="relative h-60 w-auto object-contain drop-shadow-2xl transition-opacity duration-500"
              style={{ filter: 'drop-shadow(0 6px 25px rgba(0,0,0,0.9))' }}
            />
          </div>
        </div>

        {/* Bottom Bar Strip */}
        <div className="absolute bottom-0 left-0 right-0 animate-slide-up">
          {/* Top accent line */}
          <div
            className="h-1"
            style={{
              background: `linear-gradient(90deg, transparent, ${effectiveAccentColor}, transparent)`,
              boxShadow: `0 0 20px ${effectiveAccentColor}60`
            }}
          />

          {/* Main bar */}
          <div
            className="relative"
            style={{
              background: 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(10,15,30,0.98))',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center h-32 px-10">
              {/* Player Photo */}
              <div className="flex-shrink-0 mr-8">
                {currentPlayer.photo_url ? (
                  <img
                    src={currentPlayer.photo_url}
                    alt={currentPlayer.name}
                    className="w-24 h-24 object-cover rounded-full"
                    style={{
                      border: `4px solid ${effectiveAccentColor}`,
                      boxShadow: `0 0 25px ${effectiveAccentColor}50`
                    }}
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: `${effectiveAccentColor}20`,
                      border: `4px solid ${effectiveAccentColor}60`
                    }}
                  >
                    <User size={40} className="text-white/60" />
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div className="flex-shrink-0 mr-12 min-w-[280px]">
                <p className="text-3xl font-bold text-white leading-tight">{currentPlayer.name}</p>
                <div className="flex items-center gap-3 mt-2">
                  {currentPlayer.player_uid && (
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-bold"
                      style={{ background: `${effectiveAccentColor}30`, color: effectiveAccentColor }}
                    >
                      {currentPlayer.player_uid}
                    </span>
                  )}
                  {currentPlayer.categories && (
                    <span className="text-lg text-slate-400">{currentPlayer.categories.name}</span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-16 bg-slate-600/50 mr-12" />

              {/* Current Bid */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm uppercase tracking-widest text-slate-400 mb-2">Current Bid</p>
                  <p
                    className={`text-6xl font-black transition-all duration-300 ${bidAnimating ? 'scale-110' : 'scale-100'}`}
                    style={{
                      color: effectiveAccentColor,
                      textShadow: `0 0 40px ${effectiveAccentColor}60`
                    }}
                  >
                    {currentBid.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-16 bg-slate-600/50 mx-12" />

              {/* Team / Status */}
              <div className="flex-shrink-0 min-w-[200px] flex items-center justify-end">
                {status === 'sold' ? (
                  <div
                    className="px-8 py-3 rounded-xl text-2xl font-black text-white animate-pulse"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      boxShadow: '0 0 30px rgba(34,197,94,0.6)'
                    }}
                  >
                    SOLD!
                  </div>
                ) : status === 'unsold' ? (
                  <div
                    className="px-8 py-3 rounded-xl text-2xl font-black text-white"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      boxShadow: '0 0 30px rgba(239,68,68,0.6)'
                    }}
                  >
                    UNSOLD
                  </div>
                ) : currentTeam ? (
                  <div className="flex items-center gap-4">
                    {currentTeam.logo_url ? (
                      <img
                        src={currentTeam.logo_url}
                        className="w-16 h-16 object-contain"
                        style={{ filter: `drop-shadow(0 0 15px ${effectiveAccentColor}50)` }}
                      />
                    ) : (
                      <div
                        className="px-5 py-3 rounded-xl text-lg font-bold text-white"
                        style={{ background: effectiveAccentColor }}
                      >
                        {currentTeam.short_name}
                      </div>
                    )}
                    <span className="text-white font-bold text-xl">{currentTeam.short_name}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 text-lg italic">Awaiting bid...</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .overlay-bg { background: transparent !important; }
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(100%); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-up { animation: slide-up 0.5s ease-out; }
        `}</style>
      </div>
    );
  }

  // ============================================
  // STANDARD MODE - L-Frame Broadcast (Top + Left Side)
  // Keeps center/right clear for viewing live venue
  // ============================================
  if (mode === 'standard') {
    return (
      <div className="overlay-bg min-h-screen relative overflow-hidden">
        <OverlayCelebration
          isActive={showCelebration}
          team={currentTeam}
          soldPrice={currentBid}
          accentColor={effectiveAccentColor}
        />

        {/* Top Header Bar - Premium Broadcast Style */}
        <div
          className="absolute top-0 left-0 right-0 h-44 flex items-center justify-between px-8 animate-slide-down"
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,0.98) 0%, rgba(10,15,25,0.95) 100%)`,
            borderBottom: `3px solid ${effectiveAccentColor}`,
            boxShadow: `0 4px 30px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.05)`
          }}
        >
          {/* Animated accent line at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px] animate-shimmer"
            style={{
              background: `linear-gradient(90deg, transparent, ${effectiveAccentColor}, transparent)`,
              backgroundSize: '200% 100%'
            }}
          />

          {/* Left - Tournament Logo & Name */}
          <div className="flex items-center gap-4">
            {tournament?.logo_url && (
              <div className="relative">
                <div
                  className="absolute -inset-1 rounded-xl opacity-40 blur-md"
                  style={{ background: effectiveAccentColor }}
                />
                <img
                  src={tournament.logo_url}
                  alt={tournament.name}
                  className="relative h-36 w-auto object-contain"
                  style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
                />
              </div>
            )}
            <div>
              <p className="text-2xl font-black text-white leading-tight tracking-tight">{tournament?.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: effectiveAccentColor, boxShadow: `0 0 8px ${effectiveAccentColor}` }}
                />
                <p className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: effectiveAccentColor }}>
                  Live Auction
                </p>
              </div>
            </div>
          </div>

          {/* Center - Status Badge */}
          <div
            className="relative px-8 py-3 rounded-xl overflow-hidden"
            style={{
              background: status === 'sold' ? 'linear-gradient(135deg, #10b981, #059669)' : status === 'unsold' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : `linear-gradient(135deg, ${effectiveAccentColor}, ${effectiveAccentColor}dd)`,
              boxShadow: `0 0 30px ${status === 'sold' ? 'rgba(16,185,129,0.5)' : status === 'unsold' ? 'rgba(239,68,68,0.5)' : effectiveAccentColor}60`
            }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 animate-shine" style={{ background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.2) 50%, transparent 75%)', backgroundSize: '200% 100%' }} />
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-white animate-pulse" style={{ boxShadow: '0 0 10px rgba(255,255,255,0.8)' }} />
              <span className="text-white font-black text-base uppercase tracking-wider">
                {status === 'bidding' ? 'Now Bidding' : status === 'sold' ? 'Sold!' : status === 'unsold' ? 'Unsold' : 'Live'}
              </span>
            </div>
          </div>

          {/* Right - Rotating Logo (Broadcaster ↔ App Logo) */}
          <div className="relative">
            <div
              className="absolute -inset-1 rounded-xl opacity-30 blur-md transition-colors duration-500"
              style={{ background: showAppLogo ? '#06b6d4' : effectiveAccentColor }}
            />
            <img
              src={showAppLogo ? '/logo.png' : (tournament?.broadcaster_logo_url || '/logo.png')}
              alt={showAppLogo ? 'Game Auction' : (tournament?.broadcaster_name || 'Broadcaster')}
              className="relative h-36 w-auto object-contain transition-opacity duration-500"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
            />
          </div>
        </div>

        {/* Left Side Panel - Premium Player Card */}
        <div
          className="absolute left-0 top-44 bottom-0 w-[380px] animate-slide-right"
          style={{
            background: `linear-gradient(180deg, rgba(5,10,20,0.98) 0%, rgba(15,25,40,0.95) 100%)`,
            borderRight: `3px solid ${effectiveAccentColor}`,
            boxShadow: `8px 0 40px rgba(0,0,0,0.6)`
          }}
        >
          {/* Decorative corner accent */}
          <div
            className="absolute top-0 right-0 w-32 h-32 opacity-20"
            style={{
              background: `radial-gradient(circle at top right, ${effectiveAccentColor}, transparent 70%)`
            }}
          />

          {/* Player Photo Section */}
          <div className="p-7">
            {/* Photo with glowing frame */}
            <div className="relative mb-5">
              {/* Outer glow */}
              <div
                className="absolute -inset-2 rounded-2xl opacity-40 blur-lg animate-pulse-slow"
                style={{ background: effectiveAccentColor }}
              />
              {/* Inner frame */}
              <div
                className="absolute -inset-1 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${effectiveAccentColor}, ${effectiveAccentColor}66, ${effectiveAccentColor})`,
                  padding: '2px'
                }}
              />
              {currentPlayer.photo_url ? (
                <img
                  src={currentPlayer.photo_url}
                  alt={currentPlayer.name}
                  className="relative w-full aspect-square object-cover rounded-xl"
                  style={{ border: `4px solid rgba(0,0,0,0.5)` }}
                />
              ) : (
                <div
                  className="relative w-full aspect-square rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${effectiveAccentColor}25, ${effectiveAccentColor}08)`,
                    border: `4px solid rgba(0,0,0,0.5)`
                  }}
                >
                  <User size={120} className="text-white/25" />
                </div>
              )}

              {/* UID Badge - Floating */}
              {currentPlayer.player_uid && (
                <div
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-lg font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${effectiveAccentColor}, ${effectiveAccentColor}bb)`,
                    boxShadow: `0 4px 20px ${effectiveAccentColor}70, inset 0 1px 0 rgba(255,255,255,0.2)`
                  }}
                >
                  #{currentPlayer.player_uid}
                </div>
              )}
            </div>

            {/* Player Name */}
            <h2
              className="text-4xl font-black text-white text-center mt-8 mb-3"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
            >
              {currentPlayer.name}
            </h2>

            {/* Category */}
            {currentPlayer.categories && (
              <div className="flex justify-center mb-6">
                <span
                  className="px-5 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider"
                  style={{
                    background: `${effectiveAccentColor}25`,
                    color: effectiveAccentColor,
                    border: `2px solid ${effectiveAccentColor}50`,
                    boxShadow: `0 0 15px ${effectiveAccentColor}20`
                  }}
                >
                  {currentPlayer.categories.name}
                </span>
              </div>
            )}

            {/* Bid Display - Premium Box */}
            <div
              className="relative rounded-2xl p-6 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${effectiveAccentColor}20, ${effectiveAccentColor}08)`,
                border: `2px solid ${effectiveAccentColor}60`
              }}
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-8 h-8" style={{ borderTop: `2px solid ${effectiveAccentColor}`, borderLeft: `2px solid ${effectiveAccentColor}` }} />
              <div className="absolute top-0 right-0 w-8 h-8" style={{ borderTop: `2px solid ${effectiveAccentColor}`, borderRight: `2px solid ${effectiveAccentColor}` }} />
              <div className="absolute bottom-0 left-0 w-8 h-8" style={{ borderBottom: `2px solid ${effectiveAccentColor}`, borderLeft: `2px solid ${effectiveAccentColor}` }} />
              <div className="absolute bottom-0 right-0 w-8 h-8" style={{ borderBottom: `2px solid ${effectiveAccentColor}`, borderRight: `2px solid ${effectiveAccentColor}` }} />

              <p
                className="text-xs uppercase tracking-[0.2em] text-center mb-2 font-bold"
                style={{ color: effectiveAccentColor }}
              >
                Current Bid
              </p>
              <p
                className={`text-6xl font-black text-center text-white transition-all duration-200 ${
                  bidAnimating ? 'scale-105' : ''
                }`}
                style={{ textShadow: `0 0 30px ${effectiveAccentColor}40` }}
              >
                ₹{currentBid.toLocaleString('en-IN')}
              </p>
            </div>

            {/* Team Display */}
            {currentTeam && (
              <div
                className="flex items-center justify-center gap-4 mt-6 pt-6"
                style={{ borderTop: `2px solid ${effectiveAccentColor}30` }}
              >
                {currentTeam.logo_url ? (
                  <div className="relative">
                    <div
                      className="absolute -inset-1 rounded-full opacity-40 blur-md"
                      style={{ background: effectiveAccentColor }}
                    />
                    <img src={currentTeam.logo_url} className="relative w-14 h-14 object-contain" />
                  </div>
                ) : (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-base font-black text-white"
                    style={{
                      background: `linear-gradient(135deg, ${effectiveAccentColor}, ${effectiveAccentColor}cc)`,
                      boxShadow: `0 0 20px ${effectiveAccentColor}50`
                    }}
                  >
                    {currentTeam.short_name}
                  </div>
                )}
                <span className="text-xl text-white font-bold">{currentTeam.name}</span>
              </div>
            )}
          </div>
        </div>

        <style>{`
          .overlay-bg { background: transparent !important; }
          @keyframes slide-down {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slide-right {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes shine {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.6; }
          }
          .animate-slide-down { animation: slide-down 0.5s ease-out; }
          .animate-slide-right { animation: slide-right 0.5s ease-out 0.2s both; }
          .animate-shimmer { animation: shimmer 3s linear infinite; }
          .animate-shine { animation: shine 2s ease-in-out infinite; }
          .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  // ============================================
  // PREMIUM MODE - Ultimate Broadcast Experience
  // ============================================
  return (
    <div className="overlay-bg min-h-screen relative overflow-hidden">
      {/* Ambient Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float-particle"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `${effectiveAccentColor}${Math.floor(Math.random() * 40 + 20).toString(16)}`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`
            }}
          />
        ))}
      </div>

      <OverlayCelebration
        isActive={showCelebration}
        team={currentTeam}
        soldPrice={currentBid}
        accentColor={effectiveAccentColor}
      />

      {/* ========== FLOATING LOGOS - TV BROADCAST STYLE ========== */}

      {/* Top Left - Tournament Logo (Large, Floating) */}
      <div className="absolute top-6 left-6 z-30 animate-premium-slide-down">
        <div className="flex items-center gap-6">
          {tournament?.logo_url && (
            <div className="relative">
              <div
                className="absolute -inset-6 rounded-3xl opacity-50 blur-3xl animate-pulse"
                style={{ background: effectiveAccentColor }}
              />
              <img
                src={tournament.logo_url}
                alt={tournament.name}
                className="relative h-52 w-auto object-contain drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 6px 30px rgba(0,0,0,0.9))' }}
              />
            </div>
          )}
          <div>
            <p className="text-5xl font-black text-white tracking-tight drop-shadow-lg">{tournament?.name}</p>
            <p className="text-lg uppercase tracking-[0.3em] font-bold mt-2" style={{ color: effectiveAccentColor, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
              Players Auction
            </p>
          </div>
        </div>
      </div>

      {/* Top Right - Rotating Logo (Broadcaster ↔ App Logo) */}
      <div className="absolute top-6 right-6 z-30 animate-premium-slide-down">
        <div className="relative">
          <div
            className="absolute -inset-6 rounded-3xl opacity-50 blur-3xl transition-colors duration-500"
            style={{ background: showAppLogo ? '#06b6d4' : effectiveAccentColor }}
          />
          <img
            src={showAppLogo ? '/logo.png' : (tournament?.broadcaster_logo_url || '/logo.png')}
            alt={showAppLogo ? 'Game Auction' : (tournament?.broadcaster_name || 'Broadcaster')}
            className="relative h-52 w-auto object-contain drop-shadow-2xl transition-opacity duration-500"
            style={{ filter: 'drop-shadow(0 6px 30px rgba(0,0,0,0.9))' }}
          />
        </div>
      </div>

      {/* Top Center - Live Status Badge (Floating) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 animate-premium-slide-down">
        <div
          className="relative px-10 py-4 rounded-2xl overflow-hidden"
          style={{
            background: slideState === 'sold'
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : slideState === 'unsold'
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : `linear-gradient(135deg, ${effectiveAccentColor}, ${effectiveAccentColor}cc)`,
            boxShadow: `0 8px 40px ${slideState === 'sold' ? '#22c55e' : slideState === 'unsold' ? '#ef4444' : effectiveAccentColor}60`
          }}
        >
          <div className="absolute inset-0 animate-premium-shine" style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)', backgroundSize: '200% 100%' }} />
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
              <div className="absolute inset-0 w-4 h-4 rounded-full bg-white animate-ping opacity-50" />
            </div>
            <span className="text-white font-black text-xl uppercase tracking-wider">
              {slideState === 'entering' ? 'Next Up' :
               slideState === 'sold' ? 'Sold!' :
               slideState === 'unsold' ? 'Unsold' : 'Live Bidding'}
            </span>
          </div>
        </div>
      </div>

      {/* ========== ENTRY ANIMATION ========== */}
      {slideState === 'entering' && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          {/* Full screen flash */}
          <div
            className="absolute inset-0 animate-premium-flash"
            style={{ background: `${effectiveAccentColor}40` }}
          />

          {/* NEXT PLAYER banner */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-premium-banner-in">
              <div
                className="relative px-20 py-8 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${effectiveAccentColor}, ${effectiveAccentColor}dd)`,
                  clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
                  boxShadow: `0 0 100px ${effectiveAccentColor}80`
                }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 animate-premium-shine" style={{ background: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%)', backgroundSize: '200% 100%' }} />
                <span className="relative text-7xl font-black text-white tracking-wider drop-shadow-lg">
                  NEXT PLAYER
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MAIN CONTENT - BIDDING STATE ========== */}
      {slideState === 'active' && status === 'bidding' && (
        <div className="absolute top-52 left-0 right-0 bottom-0 flex">
          {/* Left Side - Player Card */}
          <div className="w-[420px] flex-shrink-0 p-6 animate-premium-slide-right">
            <div
              className="relative h-full rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(10,15,30,0.98) 0%, rgba(20,30,50,0.95) 100%)',
                border: `3px solid ${effectiveAccentColor}`,
                boxShadow: `0 0 60px ${effectiveAccentColor}30, 0 25px 50px rgba(0,0,0,0.5)`
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute -inset-1 rounded-2xl opacity-30 blur-xl -z-10"
                style={{ background: effectiveAccentColor }}
              />

              {/* Player Photo */}
              <div className="relative h-[55%] overflow-hidden">
                {currentPlayer.photo_url ? (
                  <img
                    src={currentPlayer.photo_url}
                    alt={currentPlayer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${effectiveAccentColor}20, ${effectiveAccentColor}05)` }}
                  >
                    <User size={120} className="text-white/20" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent" />

                {/* UID Badge */}
                {currentPlayer.player_uid && (
                  <div
                    className="absolute top-4 right-4 w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white animate-pulse"
                    style={{
                      background: `linear-gradient(135deg, ${effectiveAccentColor}, ${effectiveAccentColor}bb)`,
                      boxShadow: `0 0 30px ${effectiveAccentColor}80`
                    }}
                  >
                    {currentPlayer.player_uid}
                  </div>
                )}

                {/* Category Badge */}
                {currentPlayer.categories && (
                  <div
                    className="absolute top-4 left-4 px-4 py-2 rounded-lg text-sm font-bold text-white"
                    style={{ background: effectiveAccentColor, boxShadow: `0 0 20px ${effectiveAccentColor}60` }}
                  >
                    {currentPlayer.categories.name}
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div className="p-6">
                <h2
                  className="text-4xl font-black text-white mb-2"
                  style={{ textShadow: '0 2px 15px rgba(0,0,0,0.5)' }}
                >
                  {currentPlayer.name}
                </h2>

                {/* Base Price */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-sm uppercase tracking-wider text-slate-400">Base Price</span>
                  <span className="text-xl font-bold text-white">₹{currentPlayer.base_price.toLocaleString('en-IN')}</span>
                </div>

                {/* Bid Display */}
                <div
                  className="relative rounded-xl p-5 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${effectiveAccentColor}20, ${effectiveAccentColor}08)`,
                    border: `2px solid ${effectiveAccentColor}50`
                  }}
                >
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-6 h-6" style={{ borderTop: `3px solid ${effectiveAccentColor}`, borderLeft: `3px solid ${effectiveAccentColor}` }} />
                  <div className="absolute top-0 right-0 w-6 h-6" style={{ borderTop: `3px solid ${effectiveAccentColor}`, borderRight: `3px solid ${effectiveAccentColor}` }} />
                  <div className="absolute bottom-0 left-0 w-6 h-6" style={{ borderBottom: `3px solid ${effectiveAccentColor}`, borderLeft: `3px solid ${effectiveAccentColor}` }} />
                  <div className="absolute bottom-0 right-0 w-6 h-6" style={{ borderBottom: `3px solid ${effectiveAccentColor}`, borderRight: `3px solid ${effectiveAccentColor}` }} />

                  <p className="text-xs uppercase tracking-[0.2em] text-center mb-2 font-bold" style={{ color: effectiveAccentColor }}>
                    Current Bid
                  </p>
                  <p
                    className={`text-5xl font-black text-center text-white transition-all duration-200 ${bidAnimating ? 'scale-110' : ''}`}
                    style={{ textShadow: `0 0 40px ${effectiveAccentColor}50` }}
                  >
                    ₹{currentBid.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Team Display */}
                {currentTeam && (
                  <div
                    className="flex items-center justify-center gap-4 mt-5 pt-5"
                    style={{ borderTop: `2px solid ${effectiveAccentColor}30` }}
                  >
                    {currentTeam.logo_url ? (
                      <div className="relative">
                        <div
                          className="absolute -inset-1 rounded-full opacity-50 blur-md animate-pulse"
                          style={{ background: effectiveAccentColor }}
                        />
                        <img src={currentTeam.logo_url} className="relative w-12 h-12 object-contain" />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: effectiveAccentColor }}
                      >
                        {currentTeam.short_name}
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: effectiveAccentColor }}>Leading Team</p>
                      <p className="text-lg text-white font-bold">{currentTeam.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Clear for venue view (transparent) */}
          <div className="flex-1" />
        </div>
      )}

      {/* ========== SOLD CELEBRATION ========== */}
      {slideState === 'sold' && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* Green flash */}
          <div className="absolute inset-0 animate-premium-sold-flash" style={{ background: 'rgba(34,197,94,0.3)' }} />

          {/* Confetti particles */}
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-premium-confetti"
              style={{
                width: `${Math.random() * 12 + 6}px`,
                height: `${Math.random() * 12 + 6}px`,
                left: `${Math.random() * 100}%`,
                top: '-20px',
                background: i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#fbbf24' : effectiveAccentColor,
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${Math.random() * 1 + 1.5}s`
              }}
            />
          ))}

          {/* SOLD Card with Player Info */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-premium-sold-in">
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(10,20,30,0.98), rgba(20,35,50,0.95))',
                  boxShadow: '0 0 120px rgba(34,197,94,0.5), 0 30px 60px rgba(0,0,0,0.5)',
                  border: '4px solid #22c55e',
                  width: '500px'
                }}
              >
                {/* Green header bar */}
                <div
                  className="h-3"
                  style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a, #22c55e)' }}
                />

                {/* Player Photo */}
                <div className="relative h-72 overflow-hidden">
                  {currentPlayer.photo_url ? (
                    <img
                      src={currentPlayer.photo_url}
                      alt={currentPlayer.name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <User size={100} className="text-white/20" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a141e] via-transparent to-transparent" />

                  {/* SOLD stamp */}
                  <div
                    className="absolute top-4 right-4 px-6 py-2 rounded-lg text-2xl font-black text-white rotate-[-5deg]"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      boxShadow: '0 4px 20px rgba(34,197,94,0.6)'
                    }}
                  >
                    SOLD!
                  </div>

                  {/* Player UID */}
                  {currentPlayer.player_uid && (
                    <div
                      className="absolute top-4 left-4 w-14 h-14 rounded-full flex items-center justify-center text-lg font-black text-white"
                      style={{ background: effectiveAccentColor }}
                    >
                      {currentPlayer.player_uid}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="p-6">
                  <h2 className="text-4xl font-black text-white text-center mb-4">
                    {currentPlayer.name}
                  </h2>

                  {/* Price & Team */}
                  <div
                    className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)' }}
                  >
                    {/* Team */}
                    <div className="flex items-center gap-3">
                      {currentTeam?.logo_url ? (
                        <img src={currentTeam.logo_url} className="w-14 h-14 object-contain" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                          {currentTeam?.short_name}
                        </div>
                      )}
                      <div>
                        <p className="text-emerald-400 text-sm font-semibold">Sold To</p>
                        <p className="text-white text-xl font-bold">{currentTeam?.name}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-emerald-400 text-sm font-semibold">Final Price</p>
                      <p className="text-4xl font-black text-white">₹{currentBid.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom green bar */}
                <div
                  className="h-2"
                  style={{ background: 'linear-gradient(90deg, #22c55e, #16a34a, #22c55e)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== UNSOLD DISPLAY ========== */}
      {slideState === 'unsold' && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* Red flash */}
          <div className="absolute inset-0 animate-premium-flash" style={{ background: 'rgba(239,68,68,0.2)' }} />

          {/* UNSOLD Banner */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-premium-unsold-shake">
              <div
                className="relative px-20 py-10 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)',
                  boxShadow: '0 0 100px rgba(239,68,68,0.6)'
                }}
              >
                <span className="text-8xl font-black text-white tracking-wider drop-shadow-lg">UNSOLD</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== BOTTOM STATUS BAR ========== */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        {/* Gradient fade */}
        <div className="h-8 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Main bar */}
        <div
          className="relative"
          style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.95), rgba(15,23,42,0.95), rgba(0,0,0,0.95))' }}
        >
          {/* Top animated line */}
          <div className="h-1 relative overflow-hidden" style={{ background: `${effectiveAccentColor}20` }}>
            <div
              className="absolute inset-y-0 w-1/4 animate-premium-shimmer"
              style={{ background: `linear-gradient(90deg, transparent, ${effectiveAccentColor}, transparent)` }}
            />
          </div>

          <div className="flex items-center h-20 px-8">
            {/* Tournament branding */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {tournament?.logo_url && (
                <img src={tournament.logo_url} className="h-10 w-auto object-contain" />
              )}
              <div className="w-px h-10 bg-slate-700" />
            </div>

            {/* Center - Bid Display */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-8">
                {currentTeam && (
                  <div className="flex items-center gap-3">
                    {currentTeam.logo_url ? (
                      <img src={currentTeam.logo_url} className="w-12 h-12 object-contain" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
                        style={{ background: effectiveAccentColor }}
                      >
                        {currentTeam.short_name}
                      </div>
                    )}
                    <span className="text-white font-semibold text-lg">{currentTeam.short_name}</span>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: effectiveAccentColor }}>Current Bid</p>
                  <p
                    className={`text-5xl font-black text-white transition-transform ${bidAnimating ? 'scale-110' : ''}`}
                    style={{ textShadow: `0 0 30px ${effectiveAccentColor}40` }}
                  >
                    ₹{currentBid.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Right - Rotating Logo */}
            <div className="flex-shrink-0">
              <img
                src={showAppLogo ? '/logo.png' : (tournament?.broadcaster_logo_url || '/logo.png')}
                alt={showAppLogo ? 'Game Auction' : 'Broadcaster'}
                className="h-10 w-auto object-contain opacity-70 transition-opacity duration-500"
              />
            </div>
          </div>

          {/* Bottom accent line */}
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, transparent, ${effectiveAccentColor}, transparent)` }} />
        </div>
      </div>

      <style>{`
        .overlay-bg { background: transparent !important; }

        /* Floating particles */
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-60px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-30px) translateX(15px); opacity: 0.5; }
        }
        .animate-float-particle { animation: float-particle 15s ease-in-out infinite; }

        /* Premium slide animations */
        @keyframes premium-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-premium-slide-down { animation: premium-slide-down 0.6s ease-out; }

        @keyframes premium-slide-right {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-premium-slide-right { animation: premium-slide-right 0.7s ease-out 0.3s both; }

        /* Shimmer effect */
        @keyframes premium-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .animate-premium-shimmer { animation: premium-shimmer 3s ease-in-out infinite; }

        /* Shine sweep */
        @keyframes premium-shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-premium-shine { animation: premium-shine 2s ease-in-out infinite; }

        /* Flash effect */
        @keyframes premium-flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-premium-flash { animation: premium-flash 0.5s ease-out forwards; }

        /* Entry banner */
        @keyframes premium-banner-in {
          0% { transform: scale(1.5) rotate(-2deg); opacity: 0; }
          50% { transform: scale(1) rotate(1deg); opacity: 1; }
          70% { transform: scale(1.02) rotate(0deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 0; }
        }
        .animate-premium-banner-in { animation: premium-banner-in 2s ease-out forwards; }

        /* Sold celebration */
        @keyframes premium-sold-flash {
          0%, 20% { opacity: 0.5; }
          100% { opacity: 0; }
        }
        .animate-premium-sold-flash { animation: premium-sold-flash 0.8s ease-out forwards; }

        @keyframes premium-sold-in {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-premium-sold-in { animation: premium-sold-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

        @keyframes premium-confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-premium-confetti { animation: premium-confetti 2s ease-in forwards; }

        /* Unsold shake */
        @keyframes premium-unsold-shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-premium-unsold-shake { animation: premium-unsold-shake 0.5s ease-out; }

        @keyframes news-flash {
          0% { opacity: 0; transform: scale(1.2); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        .animate-news-flash {
          animation: news-flash 1.5s ease-out forwards;
        }

        @keyframes sold-bounce {
          0% { transform: scale(0.5) rotate(-5deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(-3deg); }
          100% { transform: scale(1) rotate(-3deg); opacity: 1; }
        }
        .animate-sold-bounce {
          animation: sold-bounce 0.5s ease-out forwards;
        }

        @keyframes unsold-shake {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05) rotate(2deg); }
          60% { transform: scale(1) rotate(-2deg); }
          70% { transform: scale(1.02) rotate(1deg); }
          80% { transform: scale(1) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-unsold-shake {
          animation: unsold-shake 0.6s ease-out forwards;
        }

        @keyframes slide-in-left {
          0% { opacity: 0; transform: translateX(-100px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.5s ease-out forwards;
        }

        @keyframes fade-up {
          0% { opacity: 0; transform: translateX(-50%) translateY(30px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
