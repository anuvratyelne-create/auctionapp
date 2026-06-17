import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Team, Player } from '../../../types';
import { getRoleLabel } from '../../../config/playerRoles';
import { formatAmountCompact } from '../../../utils/formatters';
import { soundManager } from '../../../utils/soundManager';
import { api } from '../../../utils/api';
import { useUIStore } from '../../../stores/uiStore';
import { getCityBackground } from '../../../config/cityBackgrounds';
import { User } from 'lucide-react';
import CityIdleScreen from './CityIdleScreen';
import AuctionResumeScreen from './AuctionResumeScreen';
import CompletionScreen from './CompletionScreen';

interface Sponsor {
  id: string;
  name?: string;
  logo_url: string;
  display_order: number;
}

interface CityBroadcastLayoutProps {
  tournament: any;
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  teams: Team[];
  status: string;
  timerSeconds?: number;
  timerKey?: number;
  onNewPlayer?: () => void;
  onClose?: () => void;
  loading?: boolean;
  // Auction lifecycle props
  auctionStarted?: boolean;
  lastPlayer?: Player | null;
  lastStatus?: 'sold' | 'unsold' | null;
  lastTeam?: Team | null;
  lastPrice?: number;
  availablePlayersCount?: number;
}

// City theme colors
const CITY_COLORS = {
  cyan: '#06b6d4',
  cyanLight: '#22d3ee',
  purple: '#8b5cf6',
  magenta: '#c026d3',
  pink: '#ec4899',
  gold: '#fbbf24',
  goldLight: '#fcd34d',
  red: '#ef4444',
  navy: '#0a1628',
  navyLight: '#1e293b',
};

// City Timer with ENHANCED neon glow
function CityTimer({ duration = 15, isActive = true, resetKey = 0 }: { duration?: number; isActive?: boolean; resetKey?: number }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const hasPlayedBuzzer = useRef(false);

  useEffect(() => {
    setTimeLeft(duration);
    hasPlayedBuzzer.current = false;
  }, [resetKey, duration]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);
        if (newTime <= 5 && newTime > 0) soundManager.play('tick');
        if (newTime === 0 && !hasPlayedBuzzer.current) {
          hasPlayedBuzzer.current = true;
          soundManager.play('buzzer');
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, resetKey, timeLeft]);

  const isLow = timeLeft <= 5;
  const glowColor = isLow ? CITY_COLORS.red : CITY_COLORS.cyan;

  return (
    <div className="relative">
      {/* Large outer glow */}
      <div
        className={`absolute transition-all duration-300 ${isLow ? 'animate-pulse' : ''}`}
        style={{
          inset: '-60px',
          background: `radial-gradient(circle, ${glowColor}70, ${glowColor}30 40%, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />
      {/* Medium glow */}
      <div
        className={`absolute transition-all duration-300 ${isLow ? 'animate-pulse' : ''}`}
        style={{
          inset: '-30px',
          background: `radial-gradient(circle, ${glowColor}80, transparent 60%)`,
          filter: 'blur(20px)',
        }}
      />
      <span
        className={`relative text-6xl md:text-7xl font-black ${isLow ? 'animate-pulse' : ''}`}
        style={{
          color: glowColor,
          textShadow: `
            0 0 20px ${glowColor},
            0 0 40px ${glowColor},
            0 0 60px ${glowColor}90,
            0 0 100px ${glowColor}60,
            0 0 150px ${glowColor}40
          `,
          fontFamily: "'Orbitron', sans-serif",
        }}
      >
        {timeLeft}s
      </span>
    </div>
  );
}

// Helper to check if image is PNG (transparent)
function isPngImage(url: string | undefined): boolean {
  if (!url) return false;
  return url.toLowerCase().endsWith('.png');
}

// City Frame component using PNG frame image - ENHANCED GLOW + ROTATING CIRCLES
function CityFrame({
  children,
  size = 'large',
  type = 'player',
  imageUrl
}: {
  children: React.ReactNode;
  size?: 'large' | 'medium';
  type?: 'player' | 'team';
  imageUrl?: string;
}) {
  const frameSize = size === 'large' ? 420 : 320;
  const frameImage = type === 'team' ? '/images/city-frame-team.png' : '/images/city-frame.png';
  const glowColor = type === 'team' ? CITY_COLORS.purple : CITY_COLORS.cyan;
  const secondaryGlow = type === 'team' ? CITY_COLORS.magenta : CITY_COLORS.purple;
  // Content size: 75% for team, 65% for player
  const contentSize = type === 'team' ? '75%' : '65%';
  // Check if image is PNG (for transparent images, no circular clip needed)
  const isPng = isPngImage(imageUrl);

  // Circle offset for team frame (to match the frame's visual center)
  const circleOffset = type === 'team' ? { top: '-45px', right: '-5px', bottom: '-5px', left: '-45px' } : { top: '-25px', right: '-25px', bottom: '-25px', left: '-25px' };
  const innerCircleOffset = type === 'team' ? { top: '-35px', right: '5px', bottom: '5px', left: '-35px' } : { top: '-15px', right: '-15px', bottom: '-15px', left: '-15px' };

  return (
    <div
      style={{
        position: 'relative',
        width: `${frameSize}px`,
        height: `${frameSize}px`,
      }}
    >
      {/* Rotating outer dashed ring */}
      <div
        className="absolute animate-spin-slow"
        style={{
          top: circleOffset.top,
          right: circleOffset.right,
          bottom: circleOffset.bottom,
          left: circleOffset.left,
          border: `2px dashed ${glowColor}50`,
          borderRadius: '50%',
        }}
      />

      {/* Counter-rotating ring */}
      <div
        className="absolute animate-spin-reverse"
        style={{
          top: innerCircleOffset.top,
          right: innerCircleOffset.right,
          bottom: innerCircleOffset.bottom,
          left: innerCircleOffset.left,
          border: `1px dashed ${secondaryGlow}40`,
          borderRadius: '50%',
        }}
      />

      {/* SVG Data circles - positioned based on type */}
      <svg
        className="absolute animate-spin-slow"
        style={type === 'team'
          ? { top: '-55px', left: '-55px', width: '440px', height: '440px' }
          : { inset: '-35px', width: 'calc(100% + 70px)', height: 'calc(100% + 70px)' }
        }
        viewBox="0 0 100 100"
      >
        <circle
          cx="50" cy="50" r="48"
          fill="none"
          stroke={`${glowColor}30`}
          strokeWidth="0.3"
          strokeDasharray="8 4"
        />
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={`${secondaryGlow}20`}
          strokeWidth="0.2"
          strokeDasharray="3 6"
        />
      </svg>

      {/* Inner SVG rotating opposite direction */}
      <svg
        className="absolute animate-spin-reverse"
        style={type === 'team'
          ? { top: '-30px', left: '-30px', width: '400px', height: '400px' }
          : { inset: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)' }
        }
        viewBox="0 0 100 100"
      >
        <circle
          cx="50" cy="50" r="48"
          fill="none"
          stroke={`${glowColor}25`}
          strokeWidth="0.4"
          strokeDasharray="2 8"
        />
      </svg>

      {/* Large outer glow - Layer 1 */}
      <div
        className="absolute animate-city-glow"
        style={{
          inset: '-40px',
          background: `radial-gradient(circle, ${glowColor}50, ${secondaryGlow}20, transparent 70%)`,
          filter: 'blur(50px)',
        }}
      />

      {/* Medium glow - Layer 2 */}
      <div
        className="absolute animate-city-glow"
        style={{
          inset: '-20px',
          background: `radial-gradient(circle, ${glowColor}60, transparent 60%)`,
          filter: 'blur(30px)',
          animationDelay: '0.5s',
        }}
      />

      {/* Inner glow - Layer 3 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle, ${glowColor}30, transparent 50%)`,
          filter: 'blur(15px)',
        }}
      />

      {/* Content FIRST (z-index: 1) - flexbox centered */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Adjust position to match frame's visual center
          paddingBottom: type === 'team' ? '20%' : '0',
          paddingRight: type === 'team' ? '12%' : '0',
          zIndex: 1,
        }}
      >
        {/* Container - rounded rectangle for JPG players, normal for PNG */}
        <div
          style={{
            width: contentSize,
            height: contentSize,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // PNG: no border-radius, JPG: rounded rectangle
            borderRadius: (type === 'player' && !isPng) ? '16px' : (type === 'team' ? '12px' : '0'),
            // PNG: transparent, JPG: subtle border glow
            border: (type === 'player' && !isPng)
              ? `2px solid ${glowColor}50`
              : 'none',
            boxShadow: (type === 'player' && !isPng)
              ? `0 0 25px ${glowColor}30, inset 0 0 20px rgba(0,0,0,0.3)`
              : 'none',
          }}
        >
          {children}
        </div>
      </div>

      {/* PNG Frame overlay (z-index: 10) - ENHANCED GLOW */}
      <img
        src={frameImage}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 10,
          filter: `
            drop-shadow(0 0 10px ${glowColor})
            drop-shadow(0 0 25px ${glowColor}90)
            drop-shadow(0 0 50px ${glowColor}60)
            drop-shadow(0 0 80px ${secondaryGlow}40)
          `,
        }}
      />
    </div>
  );
}

// Floating city lights particles (memoized for performance)
const CityLights = memo(function CityLights() {
  const lights = useMemo(() => [...Array(12)].map((_, i) => ({
    id: i,
    left: `${5 + (i * 7.5) % 90}%`,
    bottom: `${10 + (i * 2.5) % 30}%`,
    size: `${2 + (i % 2)}px`,
    color: i % 3 === 0 ? CITY_COLORS.cyan : i % 3 === 1 ? CITY_COLORS.purple : CITY_COLORS.gold,
    duration: `${5 + (i % 3)}s`,
    delay: `${i * 0.3}s`,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {lights.map((l) => (
        <div
          key={l.id}
          className="absolute rounded-full animate-city-light-float will-change-transform"
          style={{
            left: l.left,
            bottom: l.bottom,
            width: l.size,
            height: l.size,
            background: l.color,
            animationDuration: l.duration,
            animationDelay: l.delay,
          }}
        />
      ))}
    </div>
  );
});

// Traffic light trails at bottom (memoized for performance)
const TrafficLights = memo(function TrafficLights() {
  const trails = useMemo(() => [...Array(6)].map((_, i) => ({
    id: i,
    bottom: `${15 + (i * 8) % 50}%`,
    width: `${60 + (i * 10) % 80}px`,
    color: i % 2 === 0 ? CITY_COLORS.gold : '#ffffff',
    duration: `${3 + (i % 2)}s`,
    delay: `${i * 0.5}s`,
  })), []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden pointer-events-none">
      {trails.map((t) => (
        <div
          key={t.id}
          className="absolute h-0.5 animate-traffic-flow will-change-transform"
          style={{
            bottom: t.bottom,
            left: '-20%',
            width: t.width,
            background: `linear-gradient(90deg, transparent, ${t.color}80, transparent)`,
            animationDuration: t.duration,
            animationDelay: t.delay,
          }}
        />
      ))}
    </div>
  );
});

export default function CityBroadcastLayout({
  tournament,
  currentPlayer,
  currentBid,
  currentTeam,
  teams,
  status,
  timerSeconds = 15,
  timerKey = 0,
  onNewPlayer,
  onClose,
  loading,
  auctionStarted = false,
  lastPlayer = null,
  lastStatus = null,
  lastTeam = null,
  lastPrice = 0,
  availablePlayersCount = 0,
}: CityBroadcastLayoutProps) {
  const { showSponsors, sponsorRotationInterval, cityBackgroundId, displayMode } = useUIStore();
  const usePoints = displayMode === 'points';

  // Sort teams by remaining budget (highest first)
  const sortedTeams = [...teams].sort((a, b) => b.remaining_budget - a.remaining_budget);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);

  // Get selected city background
  const cityBackground = getCityBackground(cityBackgroundId) || getCityBackground('city-night-skyline');

  // Fetch sponsors
  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const data = await api.getSponsors() as Sponsor[];
        setSponsors(data.sort((a, b) => a.display_order - b.display_order));
      } catch (error) {
        console.error('Failed to load sponsors:', error);
      }
    };
    loadSponsors();
  }, []);

  // Rotate sponsors
  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSponsorIndex((prev) => (prev + 1) % sponsors.length);
    }, sponsorRotationInterval * 1000);
    return () => clearInterval(interval);
  }, [sponsors.length, sponsorRotationInterval]);

  const currentSponsor = sponsors[currentSponsorIndex];

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden" style={{ background: CITY_COLORS.navy }}>

      {/* City Background - Image or Video */}
      {cityBackground?.type === 'video' ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: `brightness(${cityBackground.brightness || 0.6})` }}
        >
          <source src={cityBackground.url} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${cityBackground?.url || '/images/city-night-bg.png'})`,
            filter: `brightness(${cityBackground?.brightness || 0.6})`,
          }}
        />
      )}

      {/* Dark overlay for better text visibility */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,22,40,0.4) 0%, rgba(10,22,40,0.2) 50%, rgba(10,22,40,0.6) 100%)',
        }}
      />

      {/* Floating city lights */}
      <CityLights />

      {/* Traffic light trails */}
      <TrafficLights />

      {/* New Player Screen - Only when players are available */}
      {!currentPlayer && tournament && tournament.status !== 'completed' && availablePlayersCount > 0 && (
        <CityIdleScreen
          tournament={tournament}
          onNewPlayer={onNewPlayer}
          onClose={onClose}
          loading={loading}
        />
      )}

      {/* Resume Auction Screen - When no players available but auction not completed */}
      {!currentPlayer && tournament && tournament.status !== 'completed' && availablePlayersCount === 0 && (
        <AuctionResumeScreen
          tournament={tournament}
          lastPlayer={lastPlayer}
          lastStatus={lastStatus}
          lastTeam={lastTeam}
          lastPrice={lastPrice}
          availablePlayers={0}
          onNewPlayer={onNewPlayer}
          onClose={onClose}
          loading={loading}
          theme="city"
        />
      )}

      {/* Completion Screen - Only when admin marks tournament as completed */}
      {!currentPlayer && tournament && tournament.status === 'completed' && (
        <CompletionScreen
          tournament={tournament}
          stats={{
            totalPlayers: teams.reduce((sum, t) => sum + (t.player_count || 0), 0),
            totalSpent: teams.reduce((sum, t) => sum + (t.spent_points || 0), 0),
            teamsCount: teams.length,
          }}
          theme="city"
          onClose={onClose}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* HEADER - Tournament Name + LIVE + Sponsor */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-8 py-6">
          {/* Tournament Name with Neon Gradient */}
          <div className="flex items-center gap-6">
            {tournament?.logo_url && (
              <img
                src={tournament.logo_url}
                alt=""
                className="w-32 h-32 object-contain"
                style={{ filter: `drop-shadow(0 0 20px ${CITY_COLORS.cyan}) drop-shadow(0 0 40px ${CITY_COLORS.purple}60)` }}
              />
            )}
            <h1
              className="text-4xl md:text-5xl font-black uppercase tracking-wider italic"
              style={{
                background: `linear-gradient(90deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple}, ${CITY_COLORS.pink})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 0 20px ${CITY_COLORS.cyan}80)`,
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              {tournament?.name || 'AUCTION'}
            </h1>
          </div>

          {/* LIVE Badge + Sponsor */}
          <div className="flex items-center gap-8">
            {/* LIVE Badge */}
            <div
              className="px-5 py-2 rounded-lg font-black text-white uppercase tracking-wider animate-pulse"
              style={{
                background: `linear-gradient(90deg, ${CITY_COLORS.red}, #dc2626)`,
                boxShadow: `0 0 20px ${CITY_COLORS.red}80, 0 0 40px ${CITY_COLORS.red}40`,
              }}
            >
              LIVE
            </div>

            {/* Sponsor - MASSIVE SIZE for audience visibility */}
            {showSponsors && currentSponsor && (
              <div className="flex items-center gap-8">
                <span
                  className="text-2xl font-black uppercase tracking-widest"
                  style={{
                    color: CITY_COLORS.cyan,
                    textShadow: `0 0 15px ${CITY_COLORS.cyan}, 0 0 30px ${CITY_COLORS.cyan}80`,
                  }}
                >
                  Powered by
                </span>
                {currentSponsor.logo_url ? (
                  <img
                    src={currentSponsor.logo_url}
                    alt={currentSponsor.name || 'Sponsor'}
                    className="h-48 max-w-[500px] object-contain"
                    style={{
                      filter: `drop-shadow(0 0 20px ${CITY_COLORS.cyan}) drop-shadow(0 0 40px ${CITY_COLORS.purple})`,
                    }}
                  />
                ) : (
                  <span
                    className="text-6xl font-black uppercase"
                    style={{
                      color: '#ffffff',
                      textShadow: `0 0 30px ${CITY_COLORS.cyan}, 0 0 60px ${CITY_COLORS.purple}`,
                    }}
                  >
                    {currentSponsor.name || 'Sponsor'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MAIN AUCTION AREA */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex px-6 pt-4 gap-6" style={{ paddingBottom: '280px' }}>

          {/* ══ LEFT SIDEBAR: Team Standings ══ */}
          <div className="w-64 flex-shrink-0" style={{ maxHeight: 'calc(100vh - 380px)' }}>
            <div
              className="h-full rounded-2xl overflow-hidden backdrop-blur-md"
              style={{
                background: `linear-gradient(180deg, ${CITY_COLORS.navy}e0 0%, ${CITY_COLORS.navyLight}d0 100%)`,
                border: `1px solid ${CITY_COLORS.cyan}40`,
                boxShadow: `0 0 30px ${CITY_COLORS.cyan}20, inset 0 0 60px ${CITY_COLORS.navy}80`,
              }}
            >
              {/* Header */}
              <div
                className="px-5 py-4 relative overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, ${CITY_COLORS.cyan}20, ${CITY_COLORS.purple}20)`,
                  borderBottom: `1px solid ${CITY_COLORS.cyan}40`,
                }}
              >
                {/* Scan line effect */}
                <div
                  className="absolute inset-0 animate-scan-slow pointer-events-none"
                  style={{
                    background: `linear-gradient(180deg, transparent 0%, ${CITY_COLORS.cyan}10 50%, transparent 100%)`,
                    backgroundSize: '100% 20px',
                  }}
                />
                <h3
                  className="text-base font-black uppercase tracking-[0.2em] relative"
                  style={{
                    color: CITY_COLORS.cyan,
                    textShadow: `0 0 10px ${CITY_COLORS.cyan}, 0 0 20px ${CITY_COLORS.cyan}80`,
                    fontFamily: "'Orbitron', sans-serif",
                  }}
                >
                  Team Standings
                </h3>
              </div>

              {/* Teams List */}
              <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                {sortedTeams.map((team, index) => (
                  <div
                    key={team.id}
                    className={`relative p-2.5 rounded-lg transition-all duration-300 ${
                      currentTeam?.id === team.id
                        ? 'scale-[1.02]'
                        : 'hover:scale-[1.01]'
                    }`}
                    style={{
                      background: currentTeam?.id === team.id
                        ? `linear-gradient(135deg, ${CITY_COLORS.cyan}30, ${CITY_COLORS.purple}20)`
                        : `linear-gradient(135deg, ${CITY_COLORS.navyLight}80, ${CITY_COLORS.navy}90)`,
                      border: currentTeam?.id === team.id
                        ? `2px solid ${CITY_COLORS.cyan}`
                        : `1px solid ${CITY_COLORS.cyan}30`,
                      boxShadow: currentTeam?.id === team.id
                        ? `0 0 20px ${CITY_COLORS.cyan}40, inset 0 0 30px ${CITY_COLORS.cyan}10`
                        : 'none',
                    }}
                  >
                    {/* Rank Badge - Neon style */}
                    <div
                      className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                      style={{
                        background: index === 0
                          ? `linear-gradient(135deg, ${CITY_COLORS.gold}, #d97706)`
                          : index === 1
                          ? `linear-gradient(135deg, #94a3b8, #64748b)`
                          : index === 2
                          ? `linear-gradient(135deg, #cd7c32, #a05a2c)`
                          : CITY_COLORS.navyLight,
                        border: `2px solid ${index < 3 ? CITY_COLORS.gold : CITY_COLORS.cyan}40`,
                        boxShadow: index === 0
                          ? `0 0 15px ${CITY_COLORS.gold}80`
                          : index < 3
                          ? `0 0 10px ${CITY_COLORS.cyan}40`
                          : 'none',
                        color: index < 3 ? '#000' : CITY_COLORS.cyan,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div className="flex items-center gap-2 pl-3">
                      {/* Team Logo */}
                      <div
                        className="w-9 h-9 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${CITY_COLORS.navyLight}, ${CITY_COLORS.navy})`,
                          border: `1px solid ${CITY_COLORS.cyan}40`,
                        }}
                      >
                        {team.logo_url ? (
                          <img src={team.logo_url} alt={team.short_name} className="w-7 h-7 object-contain" />
                        ) : (
                          <span
                            className="font-black text-sm"
                            style={{ color: CITY_COLORS.cyan }}
                          >
                            {team.short_name}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className="font-bold text-sm truncate"
                          style={{ color: '#fff' }}
                        >
                          {team.short_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="font-bold text-sm"
                            style={{
                              color: CITY_COLORS.gold,
                              textShadow: `0 0 8px ${CITY_COLORS.gold}60`,
                            }}
                          >
                            {formatAmountCompact(team.remaining_budget, usePoints)}
                          </span>
                          <span style={{ color: CITY_COLORS.cyan }}>•</span>
                          <span
                            className="text-xs"
                            style={{ color: CITY_COLORS.purple }}
                          >
                            {team.player_count || 0}P
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ CENTER: Main Auction Content ══ */}
          <div className="flex-1 flex flex-col items-center justify-start pt-4">
            {/* Top Row: Player | Timer/Bid | Team */}
            <div className="flex items-center justify-center gap-6 md:gap-10 lg:gap-16">

            {/* Left - Player Frame with UID Badge and Role */}
            <div className="relative">
              {/* Player UID Badge - Top Right */}
              {currentPlayer?.player_uid && (
                <div
                  className="absolute -top-4 -right-4 z-30 px-4 py-2 font-black text-white text-xl"
                  style={{
                    background: `linear-gradient(135deg, ${CITY_COLORS.purple}, ${CITY_COLORS.magenta})`,
                    clipPath: 'polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)',
                    boxShadow: `0 0 25px ${CITY_COLORS.purple}, 0 0 50px ${CITY_COLORS.magenta}60`,
                  }}
                >
                  {currentPlayer.player_uid}
                </div>
              )}

              {/* Player Role Badge - Bottom Center */}
              {currentPlayer && (
                <div
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-30 px-5 py-2 whitespace-nowrap"
                  style={{
                    background: `linear-gradient(135deg, ${CITY_COLORS.cyan}90, ${CITY_COLORS.purple}90)`,
                    clipPath: 'polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%)',
                    boxShadow: `0 0 20px ${CITY_COLORS.cyan}80, 0 0 40px ${CITY_COLORS.purple}50`,
                  }}
                >
                  <p
                    className="text-sm font-bold uppercase tracking-wider text-white"
                    style={{ textShadow: `0 0 10px ${CITY_COLORS.cyan}` }}
                  >
                    {(() => {
                      const role = getRoleLabel(currentPlayer.stats?.role || currentPlayer.role);
                      return (role && role.toUpperCase() !== 'UNKNOWN') ? role : (currentPlayer.categories?.name || 'Player');
                    })()}
                  </p>
                </div>
              )}

              {currentPlayer ? (
                <CityFrame size="large" imageUrl={currentPlayer.photo_url}>
                  {currentPlayer.photo_url ? (
                    // PNG: contain to show full image, JPG: cover with face focus
                    isPngImage(currentPlayer.photo_url) ? (
                      <img
                        src={currentPlayer.photo_url}
                        alt={currentPlayer.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img
                        src={currentPlayer.photo_url}
                        alt={currentPlayer.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center 20%' }}
                      />
                    )
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      <User size={80} className="text-slate-600" />
                    </div>
                  )}
                </CityFrame>
              ) : (
                <CityFrame size="large">
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <User size={80} className="text-slate-600" />
                  </div>
                </CityFrame>
              )}
            </div>

            {/* Center - Timer + Stamps + Bid Amount */}
            <div className="flex flex-col items-center justify-center gap-4 min-w-[280px]">
              {/* Timer - only when bidding */}
              {status === 'bidding' && (
                <CityTimer duration={timerSeconds} isActive={status === 'bidding'} resetKey={timerKey} />
              )}

              {/* SOLD stamp when sold - Vegas-style Image */}
              {status === 'sold' && (
                <div className="relative animate-city-stamp">
                  {/* Multi-layer glow effect */}
                  <div
                    className="absolute"
                    style={{
                      inset: '-80px',
                      background: `radial-gradient(circle, ${CITY_COLORS.gold}60, ${CITY_COLORS.pink}30 50%, transparent 70%)`,
                      filter: 'blur(50px)',
                    }}
                  />
                  <div
                    className="absolute animate-pulse"
                    style={{
                      inset: '-40px',
                      background: `radial-gradient(circle, ${CITY_COLORS.cyan}50, transparent 60%)`,
                      filter: 'blur(30px)',
                    }}
                  />
                  <img
                    src="/images/city-sold-stamp.png"
                    alt="SOLD"
                    className="relative w-64 h-auto"
                    style={{
                      filter: `drop-shadow(0 0 30px ${CITY_COLORS.gold}) drop-shadow(0 0 60px ${CITY_COLORS.pink}) drop-shadow(0 0 100px ${CITY_COLORS.cyan}80)`,
                    }}
                  />
                </div>
              )}

              {/* UNSOLD stamp when unsold - Vegas-style Image */}
              {status === 'unsold' && (
                <div className="relative animate-city-stamp">
                  {/* Multi-layer red glow effect */}
                  <div
                    className="absolute"
                    style={{
                      inset: '-80px',
                      background: `radial-gradient(circle, ${CITY_COLORS.red}60, #dc262630 50%, transparent 70%)`,
                      filter: 'blur(50px)',
                    }}
                  />
                  <div
                    className="absolute animate-pulse"
                    style={{
                      inset: '-40px',
                      background: `radial-gradient(circle, ${CITY_COLORS.red}50, transparent 60%)`,
                      filter: 'blur(30px)',
                    }}
                  />
                  <img
                    src="/images/city-unsold-stamp.png"
                    alt="UNSOLD"
                    className="relative w-64 h-auto"
                    style={{
                      filter: `drop-shadow(0 0 30px ${CITY_COLORS.red}) drop-shadow(0 0 60px #dc2626) drop-shadow(0 0 100px ${CITY_COLORS.red}80)`,
                    }}
                  />
                </div>
              )}

              {/* Current Bid Amount - Only show when bidding or sold */}
              {(status === 'bidding' || status === 'sold') && (
                <div className="text-center">
                  <div className="relative">
                    {/* Large outer glow */}
                    <div
                      className="absolute animate-bid-glow"
                      style={{
                        inset: '-80px',
                        background: `radial-gradient(ellipse, ${CITY_COLORS.gold}50, ${CITY_COLORS.gold}20 40%, transparent 70%)`,
                        filter: 'blur(50px)',
                      }}
                    />
                    {/* Medium glow */}
                    <div
                      className="absolute animate-bid-glow"
                      style={{
                        inset: '-40px',
                        background: `radial-gradient(ellipse, ${CITY_COLORS.gold}70, transparent 60%)`,
                        filter: 'blur(25px)',
                        animationDelay: '0.3s',
                      }}
                    />
                    <p
                      className="relative text-5xl md:text-6xl lg:text-7xl font-black tabular-nums"
                      style={{
                        background: `linear-gradient(180deg, #ffffff 0%, ${CITY_COLORS.goldLight} 30%, ${CITY_COLORS.gold} 60%, #d97706 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: `
                          drop-shadow(0 0 15px ${CITY_COLORS.gold})
                          drop-shadow(0 0 30px ${CITY_COLORS.gold}90)
                          drop-shadow(0 0 60px ${CITY_COLORS.gold}60)
                        `,
                      }}
                    >
                      {formatAmountCompact(currentBid, usePoints)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right - Team Frame (Clean, no info below) */}
            {currentTeam ? (
              <CityFrame size="large" type="team">
                {currentTeam.logo_url ? (
                  <img src={currentTeam.logo_url} alt={currentTeam.name} className="w-full h-full object-contain p-4" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl font-black" style={{ color: CITY_COLORS.purple }}>
                      {currentTeam.short_name}
                    </span>
                  </div>
                )}
              </CityFrame>
            ) : (
              <CityFrame size="large" type="team">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-slate-600 text-lg">No Bid</span>
                </div>
              </CityFrame>
            )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* INFO BAR - Below Player/Team Frames */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="w-full mt-6 z-20">
          {/* Full-width broadcast bar */}
          <div className="relative mx-auto" style={{ maxWidth: '1600px', padding: '0 20px' }}>

            {/* Large outer glow - cyan left, purple right */}
            <div
              className="absolute"
              style={{
                inset: '-30px',
                background: `linear-gradient(90deg, ${CITY_COLORS.cyan}40, transparent 30%, transparent 70%, ${CITY_COLORS.purple}40)`,
                filter: 'blur(40px)',
              }}
            />

            {/* Secondary glow layer */}
            <div
              className="absolute"
              style={{
                inset: '-15px',
                background: `linear-gradient(90deg, ${CITY_COLORS.cyan}30, ${CITY_COLORS.gold}20, ${CITY_COLORS.purple}30)`,
                filter: 'blur(25px)',
              }}
            />

            {/* Main bar with metallic gradient */}
            <div
              className="relative overflow-hidden"
              style={{
                background: `linear-gradient(180deg,
                  #1a2744 0%,
                  #0f1a2e 20%,
                  #0a1220 50%,
                  #0d1829 80%,
                  #1a2744 100%
                )`,
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: `
                  0 0 30px ${CITY_COLORS.cyan}30,
                  0 0 60px ${CITY_COLORS.purple}20,
                  inset 0 1px 1px rgba(255,255,255,0.1)
                `,
              }}
            >
              {/* Top neon line - ENHANCED GLOW */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg,
                    ${CITY_COLORS.cyan} 0%,
                    ${CITY_COLORS.cyanLight} 25%,
                    ${CITY_COLORS.gold} 50%,
                    ${CITY_COLORS.purple} 75%,
                    ${CITY_COLORS.magenta} 100%
                  )`,
                  boxShadow: `
                    0 0 15px ${CITY_COLORS.cyan},
                    0 0 30px ${CITY_COLORS.cyan}80,
                    0 0 45px ${CITY_COLORS.gold}60,
                    0 0 60px ${CITY_COLORS.purple}80
                  `,
                }}
              />

              {/* Content - Sleek Cyberpunk Style */}
              <div className="flex items-center justify-between px-6 py-3">

                {/* ══ PLAYER SECTION ══ */}
                <div className="flex items-center gap-8">
                  {currentPlayer ? (
                    <>
                      {/* Player Name + City - Clean with glow underline */}
                      <div className="relative">
                        <p
                          className="text-2xl md:text-3xl font-black uppercase tracking-wider"
                          style={{
                            color: '#ffffff',
                            fontFamily: "'Orbitron', sans-serif",
                            textShadow: `0 0 20px ${CITY_COLORS.cyan}60`,
                          }}
                        >
                          {currentPlayer.name}
                        </p>
                        {(currentPlayer.city || currentPlayer.stats?.city) && (
                          <p
                            className="text-sm font-semibold tracking-wide mt-1"
                            style={{
                              color: CITY_COLORS.pink,
                              textShadow: `0 0 10px ${CITY_COLORS.pink}80`,
                            }}
                          >
                            {currentPlayer.city || currentPlayer.stats?.city}
                          </p>
                        )}
                        {/* Glowing underline */}
                        <div
                          className="absolute -bottom-2 left-0 right-0 h-0.5"
                          style={{
                            background: `linear-gradient(90deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.purple}, transparent)`,
                            boxShadow: `0 0 10px ${CITY_COLORS.cyan}`,
                          }}
                        />
                      </div>

                      {/* Cyber divider */}
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rotate-45" style={{ background: CITY_COLORS.cyan, boxShadow: `0 0 8px ${CITY_COLORS.cyan}` }} />
                        <div className="w-12 h-px" style={{ background: `linear-gradient(90deg, ${CITY_COLORS.cyan}60, ${CITY_COLORS.gold}60)` }} />
                        <div className="w-2 h-2 rotate-45" style={{ background: CITY_COLORS.gold, boxShadow: `0 0 8px ${CITY_COLORS.gold}` }} />
                      </div>

                      {/* Base Price - Clean text */}
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: `${CITY_COLORS.gold}80` }}>Base</p>
                        <p
                          className="text-2xl font-black"
                          style={{
                            color: CITY_COLORS.gold,
                            textShadow: `0 0 15px ${CITY_COLORS.gold}, 0 0 30px ${CITY_COLORS.gold}50`,
                          }}
                        >
                          {formatAmountCompact(currentPlayer.base_price, usePoints)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-lg" style={{ color: `${CITY_COLORS.cyan}40` }}>Select a player...</p>
                  )}
                </div>

                {/* ══ CENTER DIAMOND DIVIDER ══ */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-px" style={{ background: `linear-gradient(90deg, transparent, ${CITY_COLORS.cyan})` }} />
                  <div
                    className="w-4 h-4 rotate-45"
                    style={{
                      background: `linear-gradient(135deg, ${CITY_COLORS.cyan}, ${CITY_COLORS.gold})`,
                      boxShadow: `0 0 15px ${CITY_COLORS.gold}, 0 0 30px ${CITY_COLORS.cyan}60`,
                    }}
                  />
                  <div className="w-16 h-px" style={{ background: `linear-gradient(90deg, ${CITY_COLORS.purple}, transparent)` }} />
                </div>

                {/* ══ TEAM SECTION ══ */}
                <div className="flex items-center gap-8">
                  {currentTeam ? (
                    <>
                      {/* Team Name - Clean with glow */}
                      <div className="relative">
                        <p
                          className="text-2xl md:text-3xl font-black uppercase tracking-wider"
                          style={{
                            color: '#ffffff',
                            fontFamily: "'Orbitron', sans-serif",
                            textShadow: `0 0 20px ${CITY_COLORS.purple}60`,
                          }}
                        >
                          {currentTeam.short_name || currentTeam.name}
                        </p>
                        {/* Glowing underline */}
                        <div
                          className="absolute -bottom-1 left-0 right-0 h-0.5"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${CITY_COLORS.purple}, ${CITY_COLORS.magenta})`,
                            boxShadow: `0 0 10px ${CITY_COLORS.purple}`,
                          }}
                        />
                      </div>

                      {/* Cyber divider */}
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rotate-45" style={{ background: CITY_COLORS.purple, boxShadow: `0 0 8px ${CITY_COLORS.purple}` }} />
                        <div className="w-8 h-px" style={{ background: `${CITY_COLORS.purple}60` }} />
                      </div>

                      {/* Team Stats - Inline flowing */}
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: `${CITY_COLORS.gold}70` }}>Budget</p>
                          <p
                            className="text-xl font-black"
                            style={{
                              color: CITY_COLORS.gold,
                              textShadow: `0 0 12px ${CITY_COLORS.gold}`,
                            }}
                          >
                            {formatAmountCompact(currentTeam.remaining_budget || 0, usePoints)}
                          </p>
                        </div>
                        <div
                          className="w-3 h-3 rotate-45"
                          style={{
                            border: `1px solid ${CITY_COLORS.magenta}60`,
                            boxShadow: `0 0 6px ${CITY_COLORS.magenta}40`,
                          }}
                        />
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: `${CITY_COLORS.magenta}70` }}>Squad</p>
                          <p
                            className="text-xl font-black"
                            style={{
                              color: CITY_COLORS.magenta,
                              textShadow: `0 0 12px ${CITY_COLORS.magenta}`,
                            }}
                          >
                            {currentTeam.player_count || 0}
                          </p>
                        </div>
                        <div
                          className="w-3 h-3 rotate-45"
                          style={{
                            border: `1px solid ${CITY_COLORS.cyan}60`,
                            boxShadow: `0 0 6px ${CITY_COLORS.cyan}40`,
                          }}
                        />
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: `${CITY_COLORS.cyan}70` }}>Spent</p>
                          <p
                            className="text-xl font-black"
                            style={{
                              color: CITY_COLORS.cyan,
                              textShadow: `0 0 12px ${CITY_COLORS.cyan}`,
                            }}
                          >
                            {formatAmountCompact(currentTeam.spent_points || 0, usePoints)}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-lg" style={{ color: `${CITY_COLORS.purple}40` }}>Awaiting bid...</p>
                  )}
                </div>
              </div>

              {/* Bottom glow line */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: `linear-gradient(90deg,
                    ${CITY_COLORS.cyan}80,
                    ${CITY_COLORS.gold}60,
                    ${CITY_COLORS.purple}80
                  )`,
                  boxShadow: `0 0 15px ${CITY_COLORS.purple}60`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

        @keyframes city-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes city-light-float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% {
            transform: translateY(-200px) translateX(${Math.random() > 0.5 ? '' : '-'}30px);
            opacity: 0;
          }
        }
        @keyframes traffic-flow {
          0% {
            transform: translateX(0);
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% {
            transform: translateX(calc(100vw + 100px));
            opacity: 0;
          }
        }
        @keyframes bid-glow {
          0%, 100% { opacity: 0.4; transform: scale(1.3); }
          50% { opacity: 0.8; transform: scale(1.6); }
        }
        @keyframes city-stamp {
          0% { transform: scale(3) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(-5deg); opacity: 1; }
          70% { transform: scale(0.95) rotate(-3deg); }
          100% { transform: scale(1) rotate(-5deg); opacity: 1; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes scan-slow {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-city-glow { animation: city-glow 3s ease-in-out infinite; }
        .animate-city-light-float { animation: city-light-float linear infinite; }
        .animate-traffic-flow { animation: traffic-flow linear infinite; }
        .animate-bid-glow { animation: bid-glow 2s ease-in-out infinite; }
        .animate-city-stamp { animation: city-stamp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse { animation: spin-reverse 15s linear infinite; }
        .animate-scan-slow { animation: scan-slow 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
