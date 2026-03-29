import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { socketClient } from '../socket/client';
import { useAuctionStore } from '../stores/auctionStore';
import { api } from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import { Tournament } from '../types';
import OverlayCelebration from '../components/overlay/OverlayCelebration';
import { User, TrendingUp, Users } from 'lucide-react';

type OverlayMode = 'minimal' | 'standard' | 'premium';

export default function OverlayView() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as OverlayMode) || 'standard';
  const accentColor = searchParams.get('color') || '#22c55e';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timerState, setTimerState] = useState({ timeLeft: 30, isRunning: false, duration: 30 });
  const [localTimeLeft, setLocalTimeLeft] = useState(30);
  const [showCelebration, setShowCelebration] = useState(false);
  const [bidAnimating, setBidAnimating] = useState(false);
  const [slideState, setSlideState] = useState<'entering' | 'active' | 'sold' | 'unsold'>('active');
  const [previousPlayer, setPreviousPlayer] = useState<string | null>(null);
  const socket = useSocket();
  const previousStatusRef = useRef<string>('idle');
  const previousBidRef = useRef<number>(0);

  const { currentPlayer, currentBid, currentTeam, status, setAuctionState } = useAuctionStore();

  useEffect(() => {
    if (!shareCode) return;
    loadTournament();
  }, [shareCode]);

  useEffect(() => {
    if (!tournament?.id) return;

    socketClient.joinOverlayView(tournament.id);

    socketClient.onAuctionState((state) => {
      setAuctionState(state);
    });

    const handleTimerSync = (data: { timeLeft: number; isRunning: boolean; duration: number }) => {
      setTimerState(data);
      setLocalTimeLeft(data.timeLeft);
    };
    socket.on('timer:sync', handleTimerSync);

    return () => {
      socketClient.removeAllListeners();
      socket.off('timer:sync', handleTimerSync);
    };
  }, [tournament?.id, socket]);

  // Local countdown when timer is running
  useEffect(() => {
    if (!timerState.isRunning) return;
    if (localTimeLeft <= 0) return;

    const interval = setInterval(() => {
      setLocalTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, localTimeLeft]);

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
    } catch {
      setError('Tournament not found');
    } finally {
      setLoading(false);
    }
  };

  // Get timer color based on time
  const getTimerColor = () => {
    if (localTimeLeft <= 5) return '#ef4444';
    if (localTimeLeft <= 10) return '#f59e0b';
    return accentColor;
  };

  // Calculate timer progress
  const timerProgress = (localTimeLeft / timerState.duration) * 100;

  if (loading) {
    return <div className="overlay-bg" />;
  }

  if (error || !currentPlayer || status === 'idle') {
    return <div className="overlay-bg min-h-screen" />;
  }

  // ============================================
  // MINIMAL MODE - Simple Floating Card
  // ============================================
  if (mode === 'minimal') {
    return (
      <div className="overlay-bg min-h-screen relative overflow-hidden">
        <OverlayCelebration
          isActive={showCelebration}
          team={currentTeam}
          soldPrice={currentBid}
          accentColor={accentColor}
        />

        {/* Floating Card - Bottom Right */}
        <div className="absolute bottom-8 right-8 animate-fade-in">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.92))',
              boxShadow: `0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}30`,
              minWidth: '320px'
            }}
          >
            {/* Top accent bar */}
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)` }} />

            <div className="p-5">
              {/* Player Row */}
              <div className="flex items-center gap-4">
                {currentPlayer.photo_url ? (
                  <img
                    src={currentPlayer.photo_url}
                    alt={currentPlayer.name}
                    className="w-16 h-16 object-cover rounded-xl"
                    style={{ border: `2px solid ${accentColor}60` }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ background: `${accentColor}20` }}
                  >
                    <User size={28} className="text-white/50" />
                  </div>
                )}

                <div className="flex-1">
                  <p className="text-xl font-bold text-white">{currentPlayer.name}</p>
                  <p className="text-sm text-slate-400">
                    {currentPlayer.jersey_number && `#${currentPlayer.jersey_number} • `}
                    Base: {currentPlayer.base_price.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Bid Row */}
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">Current Bid</p>
                  <p className={`text-3xl font-black transition-transform ${bidAnimating ? 'scale-110' : ''}`} style={{ color: accentColor }}>
                    {currentBid.toLocaleString('en-IN')}
                  </p>
                </div>

                {currentTeam && (
                  <div className="flex items-center gap-2">
                    {currentTeam.logo_url ? (
                      <img src={currentTeam.logo_url} className="w-10 h-10 object-contain" />
                    ) : (
                      <div className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: `${accentColor}30`, color: accentColor }}>
                        {currentTeam.short_name}
                      </div>
                    )}
                  </div>
                )}

                {status === 'bidding' && (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black"
                    style={{ background: `${getTimerColor()}20`, color: getTimerColor(), border: `2px solid ${getTimerColor()}` }}
                  >
                    {localTimeLeft}
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge */}
            {(status === 'sold' || status === 'unsold') && (
              <div
                className={`absolute inset-0 flex items-center justify-center ${status === 'sold' ? 'bg-emerald-500/90' : 'bg-red-500/90'}`}
              >
                <span className="text-4xl font-black text-white">{status.toUpperCase()}!</span>
              </div>
            )}
          </div>
        </div>

        <style>{`
          .overlay-bg { background: transparent !important; }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.5s ease-out; }
        `}</style>
      </div>
    );
  }

  // ============================================
  // STANDARD MODE - L-Frame Broadcast Style
  // ============================================
  if (mode === 'standard') {
    return (
      <div className="overlay-bg min-h-screen relative overflow-hidden">
        <OverlayCelebration
          isActive={showCelebration}
          team={currentTeam}
          soldPrice={currentBid}
          accentColor={accentColor}
        />

        {/* Left Side Panel */}
        <div
          className="absolute left-0 top-0 bottom-0 w-80"
          style={{
            background: `linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.95) 100%)`,
            borderRight: `3px solid ${accentColor}`,
            boxShadow: `5px 0 30px rgba(0,0,0,0.5)`
          }}
        >
          {/* Tournament Header */}
          {tournament && (
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                {tournament.logo_url && (
                  <img src={tournament.logo_url} className="h-12 w-auto object-contain" />
                )}
                <div>
                  <p className="text-lg font-bold text-white">{tournament.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs uppercase tracking-wider" style={{ color: accentColor }}>Live Auction</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Player Card */}
          <div className="p-6">
            {/* Status Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4 ${
                status === 'sold' ? 'bg-emerald-500' : status === 'unsold' ? 'bg-red-500' : ''
              }`}
              style={status === 'bidding' ? { background: `${accentColor}`, color: 'white' } : { color: 'white' }}
            >
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {status === 'bidding' ? 'NOW BIDDING' : status.toUpperCase()}
            </div>

            {/* Photo */}
            <div className="relative mb-4">
              {currentPlayer.photo_url ? (
                <img
                  src={currentPlayer.photo_url}
                  alt={currentPlayer.name}
                  className="w-full aspect-square object-cover rounded-2xl"
                  style={{ border: `3px solid ${accentColor}` }}
                />
              ) : (
                <div
                  className="w-full aspect-square rounded-2xl flex items-center justify-center"
                  style={{ background: `${accentColor}20`, border: `3px solid ${accentColor}` }}
                >
                  <User size={80} className="text-white/30" />
                </div>
              )}

              {currentPlayer.jersey_number && (
                <div
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-lg font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
                >
                  #{currentPlayer.jersey_number}
                </div>
              )}
            </div>

            {/* Player Name */}
            <h2 className="text-3xl font-black text-white text-center mt-6">{currentPlayer.name}</h2>

            {currentPlayer.categories && (
              <p className="text-center mt-2">
                <span className="px-4 py-1 rounded-full text-sm" style={{ background: `${accentColor}30`, color: accentColor }}>
                  {currentPlayer.categories.name}
                </span>
              </p>
            )}

            {/* Bid Display */}
            <div className="mt-6 p-4 rounded-xl" style={{ background: `${accentColor}10`, border: `2px solid ${accentColor}30` }}>
              <p className="text-xs uppercase tracking-wider text-center mb-1" style={{ color: accentColor }}>Current Bid</p>
              <p className={`text-4xl font-black text-center text-white transition-transform ${bidAnimating ? 'scale-110' : ''}`}>
                {currentBid.toLocaleString('en-IN')}
              </p>
            </div>

            {/* Team */}
            {currentTeam && (
              <div className="mt-4 flex items-center justify-center gap-3">
                {currentTeam.logo_url ? (
                  <img src={currentTeam.logo_url} className="w-12 h-12 object-contain" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: accentColor }}>
                    {currentTeam.short_name}
                  </div>
                )}
                <span className="text-white font-semibold">{currentTeam.name}</span>
              </div>
            )}
          </div>

          {/* Timer at bottom */}
          {status === 'bidding' && (
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: `${getTimerColor()}20` }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                  style={{ width: `${timerProgress}%`, background: getTimerColor() }}
                />
              </div>
              <p className="text-center mt-2 text-2xl font-black" style={{ color: getTimerColor() }}>{localTimeLeft}s</p>
            </div>
          )}
        </div>

        <style>{`
          .overlay-bg { background: transparent !important; }
        `}</style>
      </div>
    );
  }

  // ============================================
  // PREMIUM MODE - News Channel Broadcast
  // ============================================
  return (
    <div className="overlay-bg min-h-screen relative overflow-hidden">
      <OverlayCelebration
        isActive={showCelebration}
        team={currentTeam}
        soldPrice={currentBid}
        accentColor={accentColor}
      />

      {/* Top Ticker Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-12"
        style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}dd)` }}
      >
        <div className="h-full flex items-center justify-between px-6">
          {/* Left - Tournament */}
          <div className="flex items-center gap-4">
            {tournament?.logo_url && (
              <img src={tournament.logo_url} className="h-8 w-auto object-contain brightness-0 invert" />
            )}
            <span className="text-white font-bold text-lg tracking-wide">{tournament?.name || 'PLAYER AUCTION'}</span>
          </div>

          {/* Center - Status */}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            <span className="text-white font-black text-xl tracking-wider">
              {slideState === 'entering' ? 'NEXT UP' :
               slideState === 'sold' ? 'SOLD!' :
               slideState === 'unsold' ? 'UNSOLD' : 'LIVE BIDDING'}
            </span>
          </div>

          {/* Right - Timer */}
          <div className="flex items-center gap-3">
            {status === 'bidding' && (
              <>
                <span className="text-white/80 text-sm">TIME LEFT</span>
                <span className="text-white font-black text-2xl tabular-nums" style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
                  {String(Math.floor(localTimeLeft / 60)).padStart(2, '0')}:{String(localTimeLeft % 60).padStart(2, '0')}
                </span>
              </>
            )}
          </div>
        </div>
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30" />
      </div>

      {/* Breaking News Style - Entering Animation */}
      {slideState === 'entering' && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-news-flash">
          <div
            className="px-16 py-8 text-6xl font-black text-white tracking-wider"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
              boxShadow: `0 0 80px ${accentColor}80`
            }}
          >
            NEXT PLAYER
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="absolute top-12 left-0 right-0 bottom-32">
        {/* During active bidding: show compact card in bottom-left corner */}
        {/* Entry/Sold/Unsold: show full card in center */}

        {/* PREMIUM CORNER CARD - During Bidding */}
        {slideState === 'active' && status === 'bidding' && (
          <div className="absolute bottom-28 left-1/2 z-30 animate-fade-up">
            {/* Decorative corner accents */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4" style={{ borderColor: accentColor }} />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4" style={{ borderColor: accentColor }} />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4" style={{ borderColor: accentColor }} />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4" style={{ borderColor: accentColor }} />

            <div
              className="relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))',
                boxShadow: `0 25px 60px rgba(0,0,0,0.7), 0 0 50px ${accentColor}25`,
                width: '420px'
              }}
            >
              {/* Top accent bar with glow */}
              <div className="h-2 relative" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)` }}>
                <div className="absolute inset-0" style={{ boxShadow: `0 0 25px ${accentColor}` }} />
              </div>

              <div className="flex">
                {/* Large Photo Section */}
                <div className="relative w-40 h-44 flex-shrink-0">
                  {currentPlayer.photo_url ? (
                    <img
                      src={currentPlayer.photo_url}
                      alt={currentPlayer.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: `${accentColor}20` }}>
                      <User size={48} className="text-white/30" />
                    </div>
                  )}
                  {/* Jersey Number Badge */}
                  {currentPlayer.jersey_number && (
                    <div
                      className="absolute -bottom-2 -right-2 w-14 h-14 rounded-full flex items-center justify-center text-lg font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, boxShadow: `0 0 20px ${accentColor}80` }}
                    >
                      #{currentPlayer.jersey_number}
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/50" />
                </div>

                {/* Info Section */}
                <div className="flex-1 p-5 flex flex-col justify-center">
                  {/* Category Tag */}
                  {currentPlayer.categories && (
                    <span
                      className="inline-block px-4 py-1.5 rounded text-sm font-bold text-white mb-3 self-start"
                      style={{ background: accentColor }}
                    >
                      {currentPlayer.categories.name}
                    </span>
                  )}

                  {/* Player Name */}
                  <h3 className="text-2xl font-black text-white leading-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    {currentPlayer.name}
                  </h3>

                  {/* Base Price */}
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-sm uppercase tracking-wider text-slate-400">Base</span>
                    <span className="text-2xl font-bold" style={{ color: accentColor }}>
                      {currentPlayer.base_price.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${accentColor}60, ${accentColor}, ${accentColor}60)` }} />
            </div>
          </div>
        )}

        {/* CENTER CARD - Entry/Sold/Unsold states only */}
        {(slideState !== 'active' || status !== 'bidding') && (
        <div className="h-full flex items-center justify-center">
          {/* Player Card - News Style */}
          <div
            className={`relative transition-all duration-700 ${
              slideState === 'entering' ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
            }`}
            style={{ maxWidth: '500px', width: '90%' }}
          >
            {/* Decorative corner accents */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4" style={{ borderColor: accentColor }} />
            <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4" style={{ borderColor: accentColor }} />
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4" style={{ borderColor: accentColor }} />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4" style={{ borderColor: accentColor }} />

            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))',
                boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 0 2px ${accentColor}40`
              }}
            >
              {/* Player Image Section */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {currentPlayer.photo_url ? (
                  <img
                    src={currentPlayer.photo_url}
                    alt={currentPlayer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `${accentColor}20` }}>
                    <User size={120} className="text-white/20" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                {/* Jersey Number Badge */}
                {currentPlayer.jersey_number && (
                  <div
                    className="absolute top-4 right-4 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`, boxShadow: `0 0 30px ${accentColor}80` }}
                  >
                    #{currentPlayer.jersey_number}
                  </div>
                )}

                {/* Category Tag */}
                {currentPlayer.categories && (
                  <div
                    className="absolute top-4 left-4 px-4 py-1.5 rounded text-sm font-bold text-white"
                    style={{ background: accentColor }}
                  >
                    {currentPlayer.categories.name}
                  </div>
                )}

                {/* Player Name - Bottom of image */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-5xl font-black text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                    {currentPlayer.name}
                  </h2>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 border-t" style={{ borderColor: `${accentColor}30` }}>
                <div className="p-4 text-center border-r" style={{ borderColor: `${accentColor}30` }}>
                  <p className="text-xs uppercase tracking-wider text-slate-400">Base Price</p>
                  <p className="text-xl font-bold text-white">{currentPlayer.base_price.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 text-center border-r" style={{ borderColor: `${accentColor}30`, background: `${accentColor}10` }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: accentColor }}>Current Bid</p>
                  <p className={`text-2xl font-black transition-transform ${bidAnimating ? 'scale-110' : ''}`} style={{ color: accentColor }}>
                    {currentBid.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Bids</p>
                  <p className="text-xl font-bold text-white flex items-center justify-center gap-1">
                    <TrendingUp size={18} style={{ color: accentColor }} />
                    {currentTeam ? '1+' : '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Bottom Bar - News Ticker Style */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* Gradient fade */}
        <div className="h-16 bg-gradient-to-t from-slate-900 to-transparent" />

        {/* Main bottom bar */}
        <div
          className="relative"
          style={{ background: 'linear-gradient(90deg, #0f172a, #1e293b, #0f172a)' }}
        >
          {/* Top accent with animation */}
          <div className="h-1.5 relative overflow-hidden" style={{ background: `${accentColor}30` }}>
            <div
              className="absolute inset-y-0 animate-slide-right"
              style={{ width: '30%', background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
            />
          </div>

          <div className="flex items-stretch">
            {/* Team Section */}
            <div
              className="flex items-center gap-4 px-8 py-5"
              style={{ background: `linear-gradient(135deg, ${accentColor}20, transparent)`, minWidth: '280px' }}
            >
              {currentTeam ? (
                <>
                  <div className="relative">
                    {currentTeam.logo_url ? (
                      <img src={currentTeam.logo_url} className="w-16 h-16 object-contain" style={{ filter: `drop-shadow(0 0 15px ${accentColor}60)` }} />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white"
                        style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)` }}
                      >
                        {currentTeam.short_name}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ border: `2px solid ${accentColor}` }} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider" style={{ color: accentColor }}>Leading Team</p>
                    <p className="text-xl font-bold text-white">{currentTeam.name}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Users size={24} className="text-slate-500" />
                  <span className="text-slate-400">Awaiting first bid...</span>
                </div>
              )}
            </div>

            {/* Bid Amount - Center Focus */}
            <div className="flex-1 flex items-center justify-center py-5" style={{ background: `linear-gradient(180deg, ${accentColor}10, transparent)` }}>
              <div className="text-center">
                <p className="text-sm uppercase tracking-widest mb-1" style={{ color: accentColor }}>Current Bid</p>
                <div className={`transition-all duration-300 ${bidAnimating ? 'scale-110' : 'scale-100'}`}>
                  <span className="text-6xl font-black text-white" style={{ textShadow: `0 0 40px ${accentColor}40` }}>
                    {currentBid.toLocaleString('en-IN')}
                  </span>
                  <span className="text-2xl text-slate-400 ml-2">pts</span>
                </div>
              </div>
            </div>

            {/* Timer Section */}
            <div
              className="flex items-center justify-center px-10"
              style={{
                background: status === 'bidding'
                  ? `linear-gradient(180deg, ${getTimerColor()}30, ${getTimerColor()}10)`
                  : 'transparent',
                minWidth: '180px'
              }}
            >
              {status === 'bidding' ? (
                <div className="relative">
                  {/* Circular progress */}
                  <svg className="w-20 h-20 -rotate-90">
                    <circle
                      cx="40" cy="40" r="35"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="40" cy="40" r="35"
                      fill="none"
                      stroke={getTimerColor()}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 35}`}
                      strokeDashoffset={`${2 * Math.PI * 35 * (1 - timerProgress / 100)}`}
                      style={{
                        transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
                        filter: `drop-shadow(0 0 10px ${getTimerColor()})`
                      }}
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center text-3xl font-black"
                    style={{ color: getTimerColor(), textShadow: `0 0 20px ${getTimerColor()}60` }}
                  >
                    {localTimeLeft}
                  </span>
                </div>
              ) : (
                <div
                  className={`px-8 py-4 rounded-xl text-2xl font-black text-white ${
                    status === 'sold' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{ boxShadow: `0 0 30px ${status === 'sold' ? '#22c55e' : '#ef4444'}60` }}
                >
                  {status.toUpperCase()}!
                </div>
              )}
            </div>
          </div>

          {/* Bottom ticker line */}
          <div className="h-1" style={{ background: accentColor }} />
        </div>
      </div>

      {/* Sold Overlay Banner */}
      {slideState === 'sold' && !showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div className="relative">
            <div
              className="px-20 py-10 text-7xl font-black text-white animate-sold-bounce"
              style={{
                background: `linear-gradient(135deg, #22c55e, #16a34a)`,
                clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)',
                boxShadow: '0 0 100px rgba(34,197,94,0.6)'
              }}
            >
              SOLD TO {currentTeam?.short_name || 'TEAM'}!
            </div>
            <div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 text-3xl font-black text-white rounded-lg"
              style={{ background: accentColor }}
            >
              {currentBid.toLocaleString('en-IN')} PTS
            </div>
          </div>
        </div>
      )}

      {/* Unsold Overlay Banner */}
      {slideState === 'unsold' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <div
            className="px-20 py-10 text-7xl font-black text-white animate-unsold-shake"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)',
              boxShadow: '0 0 100px rgba(239,68,68,0.6)'
            }}
          >
            UNSOLD
          </div>
        </div>
      )}

      <style>{`
        .overlay-bg { background: transparent !important; }

        @keyframes slide-right {
          0% { left: -30%; }
          100% { left: 100%; }
        }
        .animate-slide-right {
          animation: slide-right 2s linear infinite;
        }

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
