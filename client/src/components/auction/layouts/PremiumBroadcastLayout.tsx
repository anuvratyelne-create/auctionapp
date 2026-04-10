import { useState, useEffect, useRef } from 'react';
import { Team, Player } from '../../../types';
import { getRoleLabel } from '../../../config/playerRoles';
import { formatIndianNumber } from '../../../utils/formatters';
import { soundManager } from '../../../utils/soundManager';
import { Wallet, Users, TrendingUp, Zap, Trophy } from 'lucide-react';

interface PremiumBroadcastLayoutProps {
  tournament: any;
  currentPlayer: Player | null;
  currentBid: number;
  currentTeam: Team | null;
  teams: Team[];
  status: string;
  timerSeconds?: number;
  timerKey?: number;
}

// Animated bid display component
function AnimatedBid({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (value === displayValue) return;

    const duration = 400;
    const steps = 15;
    const stepDuration = duration / steps;
    const increment = (value - displayValue) / steps;
    let current = displayValue;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, displayValue]);

  return <span className={className}>{formatIndianNumber(displayValue)}</span>;
}

// Big circular timer component for broadcast view - with reset and sounds
function BroadcastTimer({
  duration = 15,
  isActive = true,
  resetKey = 0
}: {
  duration?: number;
  isActive?: boolean;
  resetKey?: number;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const hasPlayedBuzzer = useRef(false);

  // Reset timer when resetKey changes (new bid placed)
  useEffect(() => {
    setTimeLeft(duration);
    hasPlayedBuzzer.current = false;
  }, [resetKey, duration]);

  // Countdown timer
  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);

        // Play tick sound in last 5 seconds
        if (newTime <= 5 && newTime > 0) {
          soundManager.play('tick');
        }

        // Play buzzer when time runs out
        if (newTime === 0 && !hasPlayedBuzzer.current) {
          hasPlayedBuzzer.current = true;
          soundManager.play('buzzer');
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, resetKey]);

  const progress = (timeLeft / duration) * 100;
  const isLow = timeLeft <= 5;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-36 h-36">
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-full blur-xl transition-colors duration-300 ${
        isLow ? 'bg-red-500/40' : 'bg-amber-500/30'
      }`} />

      {/* Background circle */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke={isLow ? '#ef4444' : '#f59e0b'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-linear"
          style={{
            filter: `drop-shadow(0 0 10px ${isLow ? '#ef4444' : '#f59e0b'})`
          }}
        />
      </svg>

      {/* Timer text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-black transition-colors ${isLow ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {timeLeft}
        </span>
        <span className="text-xs text-slate-400 uppercase tracking-widest mt-1">seconds</span>
      </div>
    </div>
  );
}

export default function PremiumBroadcastLayout({
  tournament,
  currentPlayer,
  currentBid,
  currentTeam,
  teams,
  status,
  timerSeconds = 15,
  timerKey = 0,
}: PremiumBroadcastLayoutProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sortedTeams = [...teams].sort((a, b) => b.spent_points - a.spent_points);

  return (
    <div className="relative w-full h-full bg-[#050510] overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ANIMATED BACKGROUND */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_40%)]" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-[180px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* TOP BROADCAST BAR - LARGER */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <div className="relative h-24 bg-gradient-to-r from-slate-900/98 via-slate-800/95 to-slate-900/98 border-b-2 border-amber-500/50 backdrop-blur-md">
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent blur-sm" />

          <div className="flex items-center justify-between h-full px-10">
            {/* Left: Tournament Logo (EXTRA LARGE) + LIVE + Name */}
            <div className="flex items-center gap-8">
              {/* Tournament Logo */}
              {tournament?.logo_url ? (
                <div className="relative">
                  <div className="absolute -inset-3 bg-amber-500/25 rounded-2xl blur-xl" />
                  <img
                    src={tournament.logo_url}
                    alt={tournament.name}
                    className="relative h-16 w-auto object-contain drop-shadow-2xl"
                  />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/40 to-amber-600/20 border-2 border-amber-500/50 flex items-center justify-center">
                  <Trophy size={36} className="text-amber-400" />
                </div>
              )}

              {/* LIVE Badge - Larger */}
              <div className="flex items-center gap-3 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 rounded-xl shadow-lg shadow-red-500/50">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                </span>
                <span className="text-white font-black text-lg tracking-wider">LIVE</span>
              </div>

              {/* Tournament Name */}
              <div>
                <h1 className="text-3xl font-black text-white tracking-wide uppercase">
                  {tournament?.name || 'PLAYER AUCTION'}
                </h1>
                <p className="text-base text-amber-400/90 font-semibold tracking-widest uppercase">
                  Players Auction {new Date().getFullYear()}
                </p>
              </div>
            </div>

            {/* Center: Stats - Larger */}
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/25 flex items-center justify-center border border-blue-500/30">
                  <Users size={28} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 uppercase tracking-wider font-medium">Players Sold</p>
                  <p className="text-3xl font-black text-white">{teams.reduce((acc, t) => acc + (t.player_count || 0), 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/25 flex items-center justify-center border border-emerald-500/30">
                  <Wallet size={28} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400 uppercase tracking-wider font-medium">Total Spent</p>
                  <p className="text-3xl font-black text-white">{formatIndianNumber(teams.reduce((acc, t) => acc + (t.spent_points || 0), 0))}</p>
                </div>
              </div>
            </div>

            {/* Right: Sponsor + Time */}
            <div className="flex items-center gap-8">
              {/* Sponsor */}
              <div className="px-8 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Powered By</p>
                <div className="h-10 flex items-center justify-center">
                  <span className="text-slate-300 text-base font-semibold">Your Sponsor</span>
                </div>
              </div>

              {/* Time */}
              <div className="text-right">
                <p className="text-4xl font-mono font-black text-white tracking-wider">
                  {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-slate-400 uppercase tracking-wider">
                  {time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-24 left-0 right-0 bottom-0 flex px-8 py-6 gap-6">

        {/* LEFT: Team Standings - Larger */}
        <div className="w-72 flex-shrink-0">
          <div className="h-full bg-slate-900/70 rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 border-b border-slate-700/50">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Team Standings</h3>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
              {sortedTeams.map((team, index) => (
                <div
                  key={team.id}
                  className={`relative p-4 rounded-xl transition-all ${
                    currentTeam?.id === team.id
                      ? 'bg-amber-500/20 border-2 border-amber-500/50 ring-2 ring-amber-500/20'
                      : 'bg-slate-800/50 border border-slate-700/40 hover:bg-slate-800/70'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-lg ${
                    index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-black' :
                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex items-center gap-4 pl-5">
                    {/* Team Logo - LARGER */}
                    <div className="w-14 h-14 rounded-xl bg-slate-700/70 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-600/50">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.short_name} className="w-12 h-12 object-contain" />
                      ) : (
                        <span className="text-white font-black text-lg">{team.short_name}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-base truncate">{team.short_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-emerald-400 font-bold">{formatIndianNumber(team.remaining_budget)}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">{team.player_count || 0}P</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: Player Display - Larger */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {currentPlayer ? (
            <div className="w-full max-w-5xl">
              {/* Timer - Above Player Card */}
              {status === 'bidding' && (
                <div className="flex justify-center mb-6">
                  <BroadcastTimer duration={timerSeconds} isActive={status === 'bidding'} resetKey={timerKey} />
                </div>
              )}

              {/* Player Card */}
              <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-950/95 rounded-3xl border border-slate-700/60 overflow-hidden backdrop-blur-sm shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />

                <div className="flex">
                  {/* Player Photo - LARGER */}
                  <div className="relative w-[400px] flex-shrink-0 p-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/15 via-transparent to-amber-500/15" />

                    {/* Jersey Badge - Larger */}
                    <div className="absolute top-8 left-8 z-20">
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500 blur-xl opacity-70" />
                        <div className="relative px-6 py-3 bg-gradient-to-br from-red-500 to-red-700 rounded-xl border border-red-400/50 shadow-2xl">
                          <span className="text-white font-black text-4xl">#{currentPlayer.jersey_number || '00'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Photo - LARGER */}
                    <div className="flex items-center justify-center h-full pt-10">
                      {currentPlayer.photo_url ? (
                        <div className="relative">
                          <div className="absolute -inset-5 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 rounded-full opacity-30 blur-2xl animate-pulse" />
                          <img
                            src={currentPlayer.photo_url}
                            alt={currentPlayer.name}
                            className="relative w-64 h-64 rounded-full object-cover border-4 border-white/25 shadow-2xl"
                          />
                        </div>
                      ) : (
                        <div className="w-64 h-64 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-4 border-slate-600/50">
                          <span className="text-9xl text-slate-500">👤</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Player Info - Larger text */}
                  <div className="flex-1 p-10 border-l border-slate-700/50 flex flex-col justify-center">
                    <h2 className="text-6xl font-black text-white uppercase tracking-tight mb-5" style={{ textShadow: '0 0 50px rgba(255,255,255,0.15)' }}>
                      {currentPlayer.name}
                    </h2>

                    {/* Role + Category - Larger */}
                    <div className="flex flex-wrap items-center gap-4 mb-8">
                      <div className="px-6 py-3 bg-gradient-to-r from-amber-500/25 to-amber-600/15 rounded-full border border-amber-500/50">
                        <span className="text-amber-400 font-bold text-lg uppercase tracking-wider">
                          {getRoleLabel(currentPlayer.stats?.role || currentPlayer.role) || 'Player'}
                        </span>
                      </div>
                      {currentPlayer.categories?.name && (
                        <div className="px-5 py-2.5 bg-blue-500/15 rounded-full border border-blue-500/40">
                          <span className="text-blue-400 font-semibold uppercase tracking-wider">
                            {currentPlayer.categories.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stats - Larger */}
                    <div className="grid grid-cols-2 gap-4">
                      {currentPlayer.stats?.battingStyle && (
                        <div className="p-5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                          <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Batting</p>
                          <p className="text-white font-semibold text-lg">{currentPlayer.stats.battingStyle}</p>
                        </div>
                      )}
                      {currentPlayer.stats?.bowlingStyle && (
                        <div className="p-5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                          <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Bowling</p>
                          <p className="text-white font-semibold text-lg">{currentPlayer.stats.bowlingStyle}</p>
                        </div>
                      )}
                      {currentPlayer.stats?.age && (
                        <div className="p-5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                          <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Age</p>
                          <p className="text-white font-semibold text-lg">{currentPlayer.stats.age} Years</p>
                        </div>
                      )}
                      <div className="p-5 bg-slate-800/60 rounded-xl border border-slate-700/50">
                        <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Base Price</p>
                        <p className="text-emerald-400 font-bold text-xl">{formatIndianNumber(currentPlayer.base_price)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No Player State */
            <div className="text-center">
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-blue-500/25 rounded-full blur-3xl" />
                <div className="relative w-52 h-52 mx-auto rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-700/60 flex items-center justify-center shadow-2xl">
                  <span className="text-9xl text-slate-600">👤</span>
                </div>
              </div>
              <h2 className="text-5xl font-black text-white mb-4">Ready for Auction</h2>
              <p className="text-slate-400 text-xl">Click "New Player" to bring up the next player</p>
            </div>
          )}
        </div>

        {/* RIGHT: Bid Panel - Larger */}
        <div className="w-96 flex-shrink-0 flex flex-col gap-5">
          {/* Current Bid - Larger */}
          <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-950/95 rounded-2xl border-2 border-amber-500/40 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-amber-500/10" />

            <div className="relative p-8 text-center">
              <p className="text-base text-amber-400 font-bold uppercase tracking-widest mb-4">
                {status === 'sold' ? 'SOLD FOR' : status === 'unsold' ? 'UNSOLD' : 'CURRENT BID'}
              </p>

              <div className="relative py-4">
                <AnimatedBid
                  value={currentBid}
                  className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400"
                />
              </div>

              {status === 'bidding' && (
                <div className="flex items-center justify-center gap-3 mt-4 text-slate-400">
                  <TrendingUp size={20} />
                  <span className="text-lg">+{formatIndianNumber(currentBid >= 50000 ? 5000 : currentBid >= 30000 ? 3000 : currentBid >= 20000 ? 2000 : 1000)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bidding Team - Larger */}
          <div className="flex-1 relative bg-gradient-to-br from-slate-900/90 to-slate-950/90 rounded-2xl border border-slate-700/50 overflow-hidden backdrop-blur-sm">
            {currentTeam ? (
              <>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500" />

                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className="flex items-center gap-2 mb-5">
                    <Zap size={20} className="text-amber-400" />
                    <span className="text-base text-amber-400 font-bold uppercase tracking-wider">Highest Bidder</span>
                  </div>

                  {/* Team Logo - EXTRA LARGE */}
                  <div className="relative mb-5">
                    <div className="absolute -inset-5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl opacity-25 blur-2xl animate-pulse" />
                    <div className="relative w-32 h-32 rounded-2xl bg-slate-800/90 border-2 border-slate-600/60 flex items-center justify-center p-3 shadow-2xl">
                      {currentTeam.logo_url ? (
                        <img src={currentTeam.logo_url} alt={currentTeam.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-4xl font-black text-white">{currentTeam.short_name}</span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-white uppercase tracking-wide text-center mb-5">
                    {currentTeam.name}
                  </h3>

                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-800/60 rounded-xl">
                      <span className="text-slate-400">Remaining</span>
                      <span className="text-emerald-400 font-bold text-lg">{formatIndianNumber(currentTeam.remaining_budget)}</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-800/60 rounded-xl">
                      <span className="text-slate-400">Max Bid</span>
                      <span className="text-amber-400 font-bold text-lg">{formatIndianNumber(currentTeam.max_bid)}</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-800/60 rounded-xl">
                      <span className="text-slate-400">Squad</span>
                      <span className="text-cyan-400 font-bold text-lg">{currentTeam.player_count || 0} Players</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-28 h-28 rounded-2xl bg-slate-800/60 border-2 border-dashed border-slate-600/50 flex items-center justify-center mb-5">
                  <span className="text-5xl text-slate-600">🏆</span>
                </div>
                <p className="text-slate-400 font-medium text-lg">Awaiting First Bid</p>
                <p className="text-slate-500 mt-2">Team will appear here</p>
              </div>
            )}
          </div>

          {/* Status Badge - Larger */}
          <div className={`px-8 py-4 rounded-xl font-black text-lg text-center uppercase tracking-wider ${
            status === 'bidding' ? 'bg-blue-500/25 text-blue-400 border-2 border-blue-500/40' :
            status === 'sold' ? 'bg-emerald-500/25 text-emerald-400 border-2 border-emerald-500/40' :
            status === 'unsold' ? 'bg-red-500/25 text-red-400 border-2 border-red-500/40' :
            'bg-slate-700/60 text-slate-400 border-2 border-slate-600/40'
          }`}>
            {status === 'bidding' ? 'BIDDING IN PROGRESS' :
             status === 'sold' ? 'PLAYER SOLD!' :
             status === 'unsold' ? 'PLAYER UNSOLD' :
             'READY'}
          </div>
        </div>
      </div>
    </div>
  );
}
