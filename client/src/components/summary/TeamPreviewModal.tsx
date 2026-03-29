import { useState, useEffect, useMemo } from 'react';
import { X, Users, List, Sparkles } from 'lucide-react';
import { Team, Player } from '../../types';
import { formatIndianNumber } from '../../utils/formatters';
import { getRoleByValue, convertLegacyRole } from '../../config/playerRoles';

interface TeamPreviewModalProps {
  team: Team;
  players: Player[];
  onClose: () => void;
  onViewDetails?: () => void;
}

interface RoleGroup {
  id: string;
  name: string;
  icon: string;
  players: Player[];
  color: string;
  glowColor: string;
  bgGradient: string;
  borderColor: string;
}

// Fixed order for role categories
const ROLE_ORDER = ['batsman', 'wicketkeeper', 'all-rounder', 'bowler', 'unknown'];

export default function TeamPreviewModal({ team, players, onClose, onViewDetails }: TeamPreviewModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);

  // Group players by role category with fixed order
  const roleGroups = useMemo((): RoleGroup[] => {
    const groups: Record<string, Player[]> = {
      batsman: [],
      wicketkeeper: [],
      'all-rounder': [],
      bowler: [],
      unknown: [],
    };

    players.forEach(player => {
      const roleValue = player.stats?.role ? convertLegacyRole(player.stats.role) : null;
      const roleInfo = roleValue ? getRoleByValue(roleValue) : null;
      const category = roleInfo?.category || 'unknown';

      if (groups[category]) {
        groups[category].push(player);
      } else {
        groups['unknown'].push(player);
      }
    });

    const roleConfigs: Record<string, Omit<RoleGroup, 'players'>> = {
      batsman: {
        id: 'batsman',
        name: 'BATSMEN',
        icon: '🏏',
        color: 'text-sky-400',
        glowColor: 'shadow-[0_0_30px_rgba(56,189,248,0.4)]',
        bgGradient: 'from-sky-600/20 via-sky-800/20 to-sky-950/30',
        borderColor: 'border-sky-500/30',
      },
      wicketkeeper: {
        id: 'wicketkeeper',
        name: 'WICKETKEEPERS',
        icon: '🧤',
        color: 'text-amber-400',
        glowColor: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]',
        bgGradient: 'from-amber-600/20 via-amber-800/20 to-amber-950/30',
        borderColor: 'border-amber-500/30',
      },
      'all-rounder': {
        id: 'all-rounder',
        name: 'ALL-ROUNDERS',
        icon: '⭐',
        color: 'text-purple-400',
        glowColor: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]',
        bgGradient: 'from-purple-600/20 via-purple-800/20 to-purple-950/30',
        borderColor: 'border-purple-500/30',
      },
      bowler: {
        id: 'bowler',
        name: 'BOWLERS',
        icon: '🎯',
        color: 'text-emerald-400',
        glowColor: 'shadow-[0_0_30px_rgba(52,211,153,0.4)]',
        bgGradient: 'from-emerald-600/20 via-emerald-800/20 to-emerald-950/30',
        borderColor: 'border-emerald-500/30',
      },
      unknown: {
        id: 'unknown',
        name: 'OTHERS',
        icon: '🏃',
        color: 'text-slate-400',
        glowColor: 'shadow-[0_0_30px_rgba(148,163,184,0.3)]',
        bgGradient: 'from-slate-600/20 via-slate-800/20 to-slate-950/30',
        borderColor: 'border-slate-500/30',
      },
    };

    // Build result in fixed order
    return ROLE_ORDER
      .filter(roleId => groups[roleId]?.length > 0)
      .map(roleId => ({
        ...roleConfigs[roleId],
        players: groups[roleId],
      }));
  }, [players]);

  // Animation sequence
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const timers = [
      setTimeout(() => setShowContent(true), 200),
      setTimeout(() => { setAnimationPhase(1); setShowSparkles(true); }, 400),
      setTimeout(() => setAnimationPhase(2), 700),
      setTimeout(() => setAnimationPhase(3), 1000),
      setTimeout(() => setAnimationPhase(4), 1300),
      setTimeout(() => setAnimationPhase(5), 1600),
      setTimeout(() => setAnimationPhase(6), 1900),
      setTimeout(() => setShowSparkles(false), 1500),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleClose = () => {
    setShowContent(false);
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      {/* Video Background */}
      <div className="absolute inset-0 bg-black">
        {/* Stadium Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/stadium-bg.mp4" type="video/mp4" />
          <source src="/videos/stadium-bg.webm" type="video/webm" />
        </video>

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Gradient overlay from top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />

        {/* Optional: Side vignette effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      </div>

      {/* Sparkle burst effect */}
      {showSparkles && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          {[...Array(12)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute text-yellow-400 animate-sparkle-burst"
              size={24}
              style={{
                '--angle': `${i * 30}deg`,
                '--distance': '150px',
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Top buttons */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        {onViewDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
              setTimeout(onViewDetails, 300);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all text-sm font-medium backdrop-blur-sm border border-white/10"
          >
            <List size={18} />
            View Details
          </button>
        )}
        <button
          onClick={handleClose}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm border border-white/10"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main content - FULL SCREEN with padding */}
      <div
        className={`relative z-10 w-full h-full px-16 xl:px-24 2xl:px-32 py-8 overflow-hidden transition-all duration-700 ease-out ${
          showContent ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Team Header - CENTERED */}
        <div
          className={`text-center mb-8 transition-all duration-1000 ease-out ${
            animationPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
          }`}
        >
          {/* Team Logo with glow - CENTERED */}
          <div className="flex justify-center mb-4 relative">
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${animationPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <div className="w-36 h-36 rounded-full bg-gradient-to-r from-primary-500/30 via-purple-500/30 to-primary-500/30 blur-3xl animate-spin-slow" />
            </div>
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt={team.name}
                className={`relative w-24 h-24 object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all duration-1000 ${animationPhase >= 1 ? 'animate-float scale-100' : 'scale-0'}`}
              />
            ) : (
              <div className={`relative w-24 h-24 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 transition-all duration-1000 ${animationPhase >= 1 ? 'scale-100' : 'scale-0'}`}>
                <span className="text-4xl font-black text-white">{team.short_name}</span>
              </div>
            )}
          </div>

          {/* Team Name - CENTERED */}
          <h1 className={`text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight mb-2 transition-all duration-700 ${animationPhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {team.name.toUpperCase()}
          </h1>
          <div className={`h-1 w-48 mx-auto bg-gradient-to-r from-transparent via-primary-500 to-transparent rounded-full transition-all duration-700 ${animationPhase >= 1 ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} />

          {/* Stats Bar - CENTERED */}
          <div
            className={`flex justify-center items-center gap-10 mt-6 transition-all duration-700 ${
              animationPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <StatBox label="Players" value={players.length} color="text-white" delay={0} isVisible={animationPhase >= 2} />
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
            <StatBox label="Spent" value={team.spent_points || 0} color="text-emerald-400" format delay={100} isVisible={animationPhase >= 2} />
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
            <StatBox label="Remaining" value={typeof team.remaining_budget === 'number' ? team.remaining_budget : (team.total_budget || 0) - (team.spent_points || 0)} color="text-amber-400" format delay={200} isVisible={animationPhase >= 2} />
          </div>
        </div>

        {/* Role Groups with staggered reveal - FULL WIDTH with side padding */}
        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          {roleGroups.map((group, groupIndex) => (
            <div
              key={group.id}
              className={`transition-all duration-700 ease-out ${
                animationPhase >= groupIndex + 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'
              }`}
            >
              {/* Role Header with spotlight */}
              <div className={`flex items-center gap-4 mb-5 relative ${animationPhase >= groupIndex + 3 ? group.glowColor : ''} rounded-lg transition-shadow duration-500`}>
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg bg-gradient-to-r ${group.bgGradient} border ${group.borderColor} backdrop-blur-sm`}>
                  <span className="text-4xl animate-bounce-subtle">{group.icon}</span>
                  <h2 className={`text-2xl font-black ${group.color} tracking-widest`}>
                    {group.name}
                  </h2>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-600 via-slate-700 to-transparent" />
                <div className="flex items-center gap-2 text-slate-400">
                  <Users size={16} />
                  <span className="font-bold">{group.players.length}</span>
                </div>
              </div>

              {/* Players Grid with 3D cards - CENTERED */}
              <div className="flex flex-wrap justify-center gap-5">
                {group.players.map((player, playerIndex) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    delay={playerIndex * 80}
                    isVisible={animationPhase >= groupIndex + 3}
                    bgGradient={group.bgGradient}
                    accentColor={group.color}
                    borderColor={group.borderColor}
                    glowColor={group.glowColor}
                  />
                ))}
              </div>
            </div>
          ))}

          {players.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center">
                <Users size={48} className="text-slate-600" />
              </div>
              <p className="text-slate-400 text-2xl font-medium">No players in squad yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Animated stat box component
function StatBox({ label, value, color, format, delay = 0, isVisible }: { label: string; value: number; color: string; format?: boolean; delay?: number; isVisible: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      const duration = 800;
      const steps = 20;
      const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
      const increment = safeValue / steps;
      let current = 0;
      const interval = setInterval(() => {
        current += increment;
        if (current >= safeValue) {
          setDisplayValue(safeValue);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, value, delay]);

  return (
    <div className="text-center group">
      <p className={`text-4xl font-black ${color} transition-transform group-hover:scale-110`}>
        {format ? formatIndianNumber(displayValue) : displayValue}
      </p>
      <p className="text-sm text-slate-400 uppercase tracking-widest font-medium">{label}</p>
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  delay: number;
  isVisible: boolean;
  bgGradient: string;
  accentColor: string;
  borderColor: string;
  glowColor: string;
}

function PlayerCard({ player, delay, isVisible, bgGradient, accentColor, borderColor, glowColor }: PlayerCardProps) {
  const [show, setShow] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, delay]);

  const roleValue = player.stats?.role ? convertLegacyRole(player.stats.role) : null;
  const roleInfo = roleValue ? getRoleByValue(roleValue) : null;

  return (
    <div
      className={`
        relative w-44 sm:w-48 lg:w-52 transition-all duration-500 ease-out perspective-1000
        ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-75'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card with 3D transform */}
      <div
        className={`
          relative bg-gradient-to-b ${bgGradient} backdrop-blur-md rounded-2xl border ${borderColor} overflow-hidden
          transition-all duration-300 transform-gpu
          ${isHovered ? `scale-110 ${glowColor} -translate-y-2` : 'hover:scale-105'}
        `}
        style={{
          transform: isHovered ? 'rotateY(5deg) rotateX(-5deg)' : 'rotateY(0) rotateX(0)',
        }}
      >
        {/* Premium shine effect */}
        <div className={`absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

        {/* Animated border glow */}
        <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} style={{
          background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
          backgroundSize: '200% 200%',
          animation: isHovered ? 'shine 1.5s ease-in-out infinite' : 'none',
        }} />

        {/* Player Image Container */}
        <div className="relative h-48 sm:h-52 lg:h-56 bg-gradient-to-b from-slate-800/30 to-transparent overflow-hidden">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              className={`w-full h-full object-cover object-top transition-all duration-500 ${isHovered ? 'scale-110 brightness-110' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700/50 to-slate-800/50">
              <Users size={64} className="text-slate-500" />
            </div>
          )}

          {/* Jersey Number Badge */}
          {player.jersey_number && (
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-white font-black text-base">#{player.jersey_number}</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
        </div>

        {/* Player Info */}
        <div className="p-4 pt-0 -mt-8 relative z-10">
          {/* Name with truncate */}
          <h3 className="font-bold text-white text-lg leading-tight mb-1.5 truncate">
            {player.name}
          </h3>

          {/* Role badge */}
          {roleInfo && (
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 border border-white/10 mb-2`}>
              <span className={`text-sm ${accentColor} font-semibold`}>
                {roleInfo.shortLabel}
              </span>
            </div>
          )}

          {/* Price with animation */}
          <div className="flex items-center justify-between">
            <p className="text-emerald-400 font-black text-xl">
              {formatIndianNumber(player.sold_price || player.base_price)}
            </p>
            {player.is_retained && (
              <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded font-bold">
                RTM
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
