import { useState, useEffect, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { soundManager } from '../../utils/soundManager';

interface AuctionTimerProps {
  duration?: number; // Default duration in seconds
  onTimeUp?: () => void;
  disabled?: boolean;
  tournamentId?: string;
  compact?: boolean;
  minimal?: boolean; // Clean minimal version for main screen
  accentColor?: string; // Theme accent color
  autoStart?: boolean; // Auto-start timer on mount
}

export default function AuctionTimer({
  duration = 30,
  onTimeUp,
  disabled = false,
  tournamentId,
  compact = false,
  minimal = false,
  accentColor = '#22c55e',
  autoStart = false
}: AuctionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [initialDuration, setInitialDuration] = useState(duration);
  const socket = useSocket();

  // Auto-start timer on mount if autoStart is true
  useEffect(() => {
    if (autoStart && !disabled) {
      setIsRunning(true);
      socket.emit('timer:start', { tournamentId, timeLeft: duration, duration });
    }
  }, []); // Only on mount

  // Sync timer state from socket
  useEffect(() => {
    const handleTimerSync = (data: { timeLeft: number; isRunning: boolean; duration: number }) => {
      setTimeLeft(data.timeLeft);
      setIsRunning(data.isRunning);
      setInitialDuration(data.duration);
    };

    socket.on('timer:sync', handleTimerSync);

    return () => {
      socket.off('timer:sync', handleTimerSync);
    };
  }, [socket]);

  // Countdown logic with sound effects
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;

          // Play tick sound for last 5 seconds
          if (newTime > 0 && newTime <= 5) {
            soundManager.play('tick');
          }

          if (newTime <= 0) {
            setIsRunning(false);
            // Play buzzer when timer expires
            soundManager.play('buzzer');
            onTimeUp?.();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, onTimeUp]);

  const handleStart = useCallback(() => {
    if (disabled) return;
    setIsRunning(true);
    socket.emit('timer:start', { tournamentId, timeLeft, duration: initialDuration });
  }, [disabled, socket, tournamentId, timeLeft, initialDuration]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    socket.emit('timer:pause', { tournamentId, timeLeft });
  }, [socket, tournamentId, timeLeft]);

  const handleReset = useCallback(() => {
    setTimeLeft(initialDuration);
    setIsRunning(false);
    socket.emit('timer:reset', { tournamentId, duration: initialDuration });
  }, [socket, tournamentId, initialDuration]);

  // Calculate progress percentage
  const progress = (timeLeft / initialDuration) * 100;

  // Determine color based on time left
  const getColor = () => {
    if (timeLeft <= 5) return 'from-red-500 to-red-600';
    if (timeLeft <= 10) return 'from-amber-500 to-orange-500';
    return 'from-emerald-500 to-green-500';
  };

  const getTextColor = () => {
    if (timeLeft <= 5) return 'text-red-500';
    if (timeLeft <= 10) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  // Get dynamic color based on time (for minimal mode)
  const getTimerColor = () => {
    if (timeLeft <= 5) return '#ef4444'; // red
    if (timeLeft <= 10) return '#f59e0b'; // amber
    return accentColor;
  };

  // Minimal clean version for main auction screen
  if (minimal) {
    const timerColor = getTimerColor();
    return (
      <div className="flex items-center gap-3">
        {/* Circular Timer Display */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: '80px',
            height: '80px',
          }}
        >
          {/* Background circle */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="4"
            />
            {/* Progress circle */}
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke={timerColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
              style={{
                transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
                filter: `drop-shadow(0 0 8px ${timerColor}60)`
              }}
            />
          </svg>

          {/* Time text */}
          <span
            className="text-2xl font-black"
            style={{
              color: timerColor,
              textShadow: `0 0 20px ${timerColor}40`
            }}
          >
            {timeLeft}
          </span>
        </div>

        {/* Play/Pause Button - Small */}
        <button
          onClick={isRunning ? handlePause : handleStart}
          disabled={disabled || (!isRunning && timeLeft === 0)}
          className="p-2 rounded-full transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(135deg, ${timerColor}, ${timerColor}cc)`,
            boxShadow: `0 0 15px ${timerColor}40`
          }}
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? (
            <Pause size={16} className="text-white" />
          ) : (
            <Play size={16} className="text-white" />
          )}
        </button>
      </div>
    );
  }

  // Compact inline version
  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
        {/* Timer Icon */}
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${getColor()}`}>
          <Timer size={14} className="text-white" />
        </div>

        {/* Time Display */}
        <span className={`text-xl font-bold ${getTextColor()} min-w-[3rem]`}>
          {formatTime(timeLeft)}
        </span>

        {/* Progress Bar - mini */}
        <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden min-w-[60px]">
          <div
            className={`h-full bg-gradient-to-r ${getColor()} rounded-full transition-all duration-1000 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={disabled || timeLeft === 0}
              className="p-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Start"
            >
              <Play size={12} className="text-white" />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="p-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 transition-colors"
              title="Pause"
            >
              <Pause size={12} className="text-white" />
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={disabled}
            className="p-1.5 rounded-lg bg-slate-600/80 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Reset"
          >
            <RotateCcw size={12} className="text-white" />
          </button>
        </div>

        {/* Duration Quick Select */}
        <div className="flex items-center gap-1 border-l border-slate-700/50 pl-3">
          {[15, 30, 45].map((d) => (
            <button
              key={d}
              onClick={() => {
                setInitialDuration(d);
                setTimeLeft(d);
                setIsRunning(false);
              }}
              disabled={isRunning}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                initialDuration === d
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full version (original)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${getColor()}`}>
              <Timer size={18} className="text-white" />
            </div>
            <span className="font-semibold text-white">Bid Timer</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={disabled || timeLeft === 0}
                className="p-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Start Timer"
              >
                <Play size={16} className="text-white" />
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="p-2 rounded-lg bg-amber-600/80 hover:bg-amber-500 transition-colors"
                title="Pause Timer"
              >
                <Pause size={16} className="text-white" />
              </button>
            )}
            <button
              onClick={handleReset}
              disabled={disabled}
              className="p-2 rounded-lg bg-slate-600/80 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Reset Timer"
            >
              <RotateCcw size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-4">
          <span className={`text-5xl font-bold bg-gradient-to-r ${getColor()} bg-clip-text text-transparent`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getColor()} rounded-full transition-all duration-1000 ease-linear`}
            style={{ width: `${progress}%` }}
          />
          {timeLeft <= 10 && isRunning && (
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/30 to-transparent rounded-full animate-pulse"
              style={{ width: `${progress}%` }}
            />
          )}
        </div>

        {/* Duration Selector */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-slate-400">Duration:</span>
          {[15, 30, 45, 60].map((d) => (
            <button
              key={d}
              onClick={() => {
                setInitialDuration(d);
                setTimeLeft(d);
                setIsRunning(false);
              }}
              disabled={isRunning}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                initialDuration === d
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
