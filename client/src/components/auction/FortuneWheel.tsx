import { useState, useRef, useEffect } from 'react';
import { X, Play, RotateCcw } from 'lucide-react';
import { Player } from '../../types';
import { soundManager } from '../../utils/soundManager';

interface FortuneWheelProps {
  players: Player[];
  onSelect: (player: Player) => void;
  onClose: () => void;
  accentColor?: string;
}

// Generate vibrant colors for wheel segments
const SEGMENT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#a855f7', // purple
];

export default function FortuneWheel({
  players,
  onSelect,
  onClose,
  accentColor = '#22c55e'
}: FortuneWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const wheelRef = useRef<SVGSVGElement>(null);
  const tickCountRef = useRef(0);

  // Limit to max 12 players for readability
  const wheelPlayers = (players || []).slice(0, 12);
  const segmentAngle = wheelPlayers.length > 0 ? 360 / wheelPlayers.length : 360;

  // Early return if no players available (after hooks)
  if (!players || players.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 max-w-md w-full mx-4 border border-slate-700/50 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
          <p className="text-white text-lg mb-4">No players available for the wheel</p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Play tick sounds during spin
  useEffect(() => {
    if (!isSpinning) return;

    const tickInterval = setInterval(() => {
      tickCountRef.current++;
      if (tickCountRef.current % 3 === 0) {
        soundManager.play('tick');
      }
    }, 80);

    return () => clearInterval(tickInterval);
  }, [isSpinning]);

  const spinWheel = () => {
    if (isSpinning || wheelPlayers.length === 0) return;

    setIsSpinning(true);
    setSelectedPlayer(null);
    setShowResult(false);
    setHighlightedIndex(null);
    tickCountRef.current = 0;

    const randomIndex = Math.floor(Math.random() * wheelPlayers.length);

    // Calculate target effective rotation to put segment center at top (270 degrees in SVG coords)
    // Segment center in original position: randomIndex * segmentAngle + segmentAngle/2 - 90
    // For it to be at 270 degrees (top): segmentCenter + R = 270 (mod 360)
    const segmentCenter = randomIndex * segmentAngle + segmentAngle / 2 - 90;
    const targetEffectiveRotation = ((270 - segmentCenter) % 360 + 360) % 360;

    // Current effective rotation (where wheel is now, mod 360)
    const currentEffectiveRotation = ((rotation % 360) + 360) % 360;

    // Calculate delta needed to go from current to target position
    let deltaToTarget = targetEffectiveRotation - currentEffectiveRotation;
    if (deltaToTarget <= 0) deltaToTarget += 360; // Always spin forward

    // Add full spins for visual effect (5-7 full rotations)
    const fullSpins = 360 * (5 + Math.floor(Math.random() * 3));

    const newRotation = rotation + fullSpins + deltaToTarget;

    setRotation(newRotation);

    // After spin completes
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedPlayer(wheelPlayers[randomIndex]);
      setHighlightedIndex(randomIndex);
      soundManager.play('buzzer');

      // Show result after a brief pause
      setTimeout(() => {
        setShowResult(true);
      }, 500);
    }, 4000);
  };

  const handleConfirm = () => {
    if (selectedPlayer) {
      onSelect(selectedPlayer);
    }
  };

  const handleReset = () => {
    setSelectedPlayer(null);
    setShowResult(false);
    setHighlightedIndex(null);
    setRotation(0);
  };

  // SVG wheel rendering
  const renderWheel = () => {
    const size = 280;
    const center = size / 2;
    const radius = center - 10;

    return (
      <svg
        ref={wheelRef}
        width={size}
        height={size}
        className="drop-shadow-2xl"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning
            ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
            : 'none',
        }}
      >
        {/* Outer glow */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {wheelPlayers.map((player, index) => {
          const startAngle = index * segmentAngle - 90; // Start from top
          const endAngle = startAngle + segmentAngle;
          const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];

          // Calculate arc path
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);

          const largeArcFlag = segmentAngle > 180 ? 1 : 0;

          const pathData = `
            M ${center} ${center}
            L ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
            Z
          `;

          // Calculate text position (middle of segment)
          const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
          const textRadius = radius * 0.65;
          const textX = center + textRadius * Math.cos(midAngle);
          const textY = center + textRadius * Math.sin(midAngle);

          return (
            <g key={player.id}>
              {/* Segment */}
              <path
                d={pathData}
                fill={color}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
              {/* Number label */}
              <text
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="18"
                fontWeight="bold"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              >
                {index + 1}
              </text>
            </g>
          );
        })}

        {/* Center circle */}
        <circle
          cx={center}
          cy={center}
          r="45"
          fill={accentColor}
          stroke="white"
          strokeWidth="3"
          filter="url(#glow)"
        />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
        >
          SPIN
        </text>
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 max-w-4xl w-full mx-4 border border-slate-700/50 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600/50 transition-colors z-10"
        >
          <X size={20} className="text-slate-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white mb-1">Fortune Wheel</h2>
          <p className="text-slate-400 text-sm">Spin to randomly select the next player!</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-center">
          {/* Wheel Container */}
          <div className="relative flex justify-center items-center flex-shrink-0">
            {/* Pointer/Arrow */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10"
              style={{ filter: `drop-shadow(0 0 10px ${accentColor})` }}
            >
              <div
                className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent"
                style={{ borderTopColor: accentColor }}
              />
            </div>

            {/* Wheel */}
            <div
              className="rounded-full p-2"
              style={{
                background: `linear-gradient(135deg, ${accentColor}40, transparent)`,
                boxShadow: `0 0 40px ${accentColor}30`
              }}
            >
              {renderWheel()}
            </div>
          </div>

          {/* Player Legend */}
          <div className="flex-1 w-full lg:w-auto">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Players on Wheel
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-2">
              {wheelPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    highlightedIndex === index
                      ? 'bg-white/20 ring-2 ring-white scale-105'
                      : 'bg-slate-800/50 hover:bg-slate-700/50'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm text-white truncate">
                    {player.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Result Display */}
        {showResult && selectedPlayer && (
          <div
            className="mt-6 text-center p-4 rounded-xl animate-pulse"
            style={{ background: `${accentColor}20`, border: `2px solid ${accentColor}` }}
          >
            <p className="text-slate-400 text-sm mb-1">Selected Player</p>
            <p className="text-2xl font-bold text-white">{selectedPlayer.name}</p>
            {selectedPlayer.jersey_number && (
              <p className="text-slate-400">#{selectedPlayer.jersey_number}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-6">
          {!selectedPlayer ? (
            <button
              onClick={spinWheel}
              disabled={isSpinning || wheelPlayers.length === 0}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow: `0 0 20px ${accentColor}40`
              }}
            >
              <Play size={20} />
              {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
            </button>
          ) : (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-slate-700 hover:bg-slate-600 transition-all"
              >
                <RotateCcw size={18} />
                Spin Again
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                  boxShadow: `0 0 20px ${accentColor}40`
                }}
              >
                Start Bidding
              </button>
            </>
          )}
        </div>

        {/* Player Count Info */}
        <p className="text-center text-slate-500 text-xs mt-4">
          {wheelPlayers.length} players on wheel
          {players.length > 12 && ` (showing first 12 of ${players.length})`}
        </p>
      </div>
    </div>
  );
}
