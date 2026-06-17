import { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';

interface OverlayTimerProps {
  accentColor?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  duration: number;
}

export default function OverlayTimer({
  accentColor = '#22c55e',
  size = 'md',
  showLabel = false,
  className = '',
}: OverlayTimerProps) {
  const [timer, setTimer] = useState<TimerState>({ timeLeft: 30, isRunning: false, duration: 30 });
  const [localTimeLeft, setLocalTimeLeft] = useState(30);

  // Get timer color based on time
  const getTimerColor = useCallback(() => {
    if (localTimeLeft <= 5) return '#ef4444';
    if (localTimeLeft <= 10) return '#f59e0b';
    return accentColor;
  }, [localTimeLeft, accentColor]);

  // Poll for auction state to get timer updates
  useEffect(() => {
    let isMounted = true;

    const fetchTimerState = async () => {
      try {
        const state = await api.getAuctionState();
        if (isMounted && state?.timer) {
          setTimer(state.timer);
          // Only update localTimeLeft if there's a significant change or timer just started
          if (state.timer.isRunning) {
            setLocalTimeLeft(state.timer.timeLeft);
          }
        }
      } catch (error) {
        // Silent fail - overlay should continue working
      }
    };

    // Initial fetch
    fetchTimerState();

    // Poll every 2 seconds for timer updates
    const pollInterval = setInterval(fetchTimerState, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Local countdown when timer is running
  useEffect(() => {
    if (!timer.isRunning) return;

    const interval = setInterval(() => {
      setLocalTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning]);

  // Sync localTimeLeft when timer state changes
  useEffect(() => {
    if (timer.isRunning) {
      setLocalTimeLeft(timer.timeLeft);
    } else {
      setLocalTimeLeft(timer.timeLeft);
    }
  }, [timer.timeLeft, timer.isRunning]);

  const timerProgress = (localTimeLeft / timer.duration) * 100;
  const timerColor = getTimerColor();

  // Size configurations
  const sizeConfig = {
    sm: { size: 60, strokeWidth: 4, fontSize: 'text-xl', radius: 26 },
    md: { size: 80, strokeWidth: 6, fontSize: 'text-3xl', radius: 35 },
    lg: { size: 100, strokeWidth: 8, fontSize: 'text-4xl', radius: 42 },
  };

  const config = sizeConfig[size];
  const center = config.size / 2;
  const circumference = 2 * Math.PI * config.radius;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-white/70 text-sm uppercase tracking-wider">Time Left</span>
      )}
      <div className="relative" style={{ width: config.size, height: config.size }}>
        {/* Background circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            stroke={timerColor}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - timerProgress / 100)}
            style={{
              transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
              filter: `drop-shadow(0 0 10px ${timerColor}60)`,
            }}
          />
        </svg>

        {/* Time text */}
        <span
          className={`absolute inset-0 flex items-center justify-center ${config.fontSize} font-black`}
          style={{
            color: timerColor,
            textShadow: `0 0 20px ${timerColor}40`,
          }}
        >
          {localTimeLeft}
        </span>
      </div>
    </div>
  );
}

// Inline timer for top bar (shows MM:SS format)
export function OverlayTimerInline({
  accentColor = '#22c55e',
  className = '',
}: {
  accentColor?: string;
  className?: string;
}) {
  const [timer, setTimer] = useState<TimerState>({ timeLeft: 30, isRunning: false, duration: 30 });
  const [localTimeLeft, setLocalTimeLeft] = useState(30);

  // Poll for auction state
  useEffect(() => {
    let isMounted = true;

    const fetchTimerState = async () => {
      try {
        const state = await api.getAuctionState();
        if (isMounted && state?.timer) {
          setTimer(state.timer);
          if (state.timer.isRunning) {
            setLocalTimeLeft(state.timer.timeLeft);
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchTimerState();
    const pollInterval = setInterval(fetchTimerState, 2000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Local countdown
  useEffect(() => {
    if (!timer.isRunning) return;

    const interval = setInterval(() => {
      setLocalTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning]);

  // Sync on timer change
  useEffect(() => {
    setLocalTimeLeft(timer.timeLeft);
  }, [timer.timeLeft, timer.isRunning]);

  const getTimerColor = () => {
    if (localTimeLeft <= 5) return '#ef4444';
    if (localTimeLeft <= 10) return '#f59e0b';
    return accentColor;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-white/80 text-sm">TIME LEFT</span>
      <span
        className="text-2xl font-black tabular-nums"
        style={{
          color: getTimerColor(),
          textShadow: `0 0 20px ${getTimerColor()}60`,
        }}
      >
        {formatTime(localTimeLeft)}
      </span>
    </div>
  );
}
