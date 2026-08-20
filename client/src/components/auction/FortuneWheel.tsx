import { useState, useRef, useEffect } from 'react';
import { X, Play, RotateCcw, Sparkles } from 'lucide-react';
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
  const [lights, setLights] = useState<boolean[]>([]);
  const wheelRef = useRef<SVGSVGElement>(null);
  const tickCountRef = useRef(0);

  // Limit to max 12 players for readability
  const wheelPlayers = (players || []).slice(0, 12);
  const segmentAngle = wheelPlayers.length > 0 ? 360 / wheelPlayers.length : 360;

  // Initialize lights
  useEffect(() => {
    setLights(new Array(24).fill(false));
  }, []);

  // Animate lights during spin
  useEffect(() => {
    if (!isSpinning) {
      setLights(new Array(24).fill(false));
      return;
    }

    let index = 0;
    const lightInterval = setInterval(() => {
      setLights(() => {
        const newLights = new Array(24).fill(false);
        newLights[index % 24] = true;
        newLights[(index + 12) % 24] = true;
        return newLights;
      });
      index++;
    }, 100);

    return () => clearInterval(lightInterval);
  }, [isSpinning]);

  // Early return if no players available (after hooks)
  if (!players || players.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
        <div className="text-center">
          <p className="text-white text-2xl mb-6">No players available for the wheel</p>
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-lg"
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

    const segmentCenter = randomIndex * segmentAngle + segmentAngle / 2 - 90;
    const targetEffectiveRotation = ((270 - segmentCenter) % 360 + 360) % 360;
    const currentEffectiveRotation = ((rotation % 360) + 360) % 360;

    let deltaToTarget = targetEffectiveRotation - currentEffectiveRotation;
    if (deltaToTarget <= 0) deltaToTarget += 360;

    const fullSpins = 360 * (5 + Math.floor(Math.random() * 3));
    const newRotation = rotation + fullSpins + deltaToTarget;

    setRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setSelectedPlayer(wheelPlayers[randomIndex]);
      setHighlightedIndex(randomIndex);
      soundManager.play('buzzer');

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
    const size = 420;
    const center = size / 2;
    const radius = center - 20;
    const innerRadius = 50;

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
        {/* Definitions */}
        <defs>
          <filter id="wheelGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="segmentShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
          </filter>
          {/* Gradient for 3D effect */}
          {wheelPlayers.map((_, index) => (
            <linearGradient
              key={`grad-${index}`}
              id={`segmentGrad-${index}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} stopOpacity="1" />
              <stop offset="100%" stopColor={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} stopOpacity="0.7" />
            </linearGradient>
          ))}
        </defs>

        {/* Outer decorative ring */}
        <circle
          cx={center}
          cy={center}
          r={radius + 8}
          fill="none"
          stroke="url(#outerRingGrad)"
          strokeWidth="4"
          opacity="0.5"
        />

        {wheelPlayers.map((player, index) => {
          const startAngle = index * segmentAngle - 90;
          const endAngle = startAngle + segmentAngle;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          // Outer arc points
          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);

          // Inner arc points
          const ix1 = center + innerRadius * Math.cos(startRad);
          const iy1 = center + innerRadius * Math.sin(startRad);
          const ix2 = center + innerRadius * Math.cos(endRad);
          const iy2 = center + innerRadius * Math.sin(endRad);

          const largeArcFlag = segmentAngle > 180 ? 1 : 0;

          // Path with inner cutout (donut shape)
          const pathData = `
            M ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
            L ${ix2} ${iy2}
            A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}
            Z
          `;

          // Text position
          const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
          const textRadius = (radius + innerRadius) / 2;
          const textX = center + textRadius * Math.cos(midAngle);
          const textY = center + textRadius * Math.sin(midAngle);
          const textRotation = (startAngle + endAngle) / 2 + 90;

          return (
            <g key={player.id}>
              {/* Segment */}
              <path
                d={pathData}
                fill={`url(#segmentGrad-${index})`}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2"
                filter="url(#segmentShadow)"
              />
              {/* Segment divider line */}
              <line
                x1={center + innerRadius * Math.cos(startRad)}
                y1={center + innerRadius * Math.sin(startRad)}
                x2={center + radius * Math.cos(startRad)}
                y2={center + radius * Math.sin(startRad)}
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="2"
              />
              {/* Player number */}
              <g transform={`translate(${textX}, ${textY}) rotate(${textRotation})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="22"
                  fontWeight="bold"
                  style={{
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  {index + 1}
                </text>
              </g>
              {/* Small decorative dot at outer edge */}
              <circle
                cx={center + (radius - 15) * Math.cos(midAngle)}
                cy={center + (radius - 15) * Math.sin(midAngle)}
                r="4"
                fill="rgba(255,255,255,0.6)"
              />
            </g>
          );
        })}

        {/* Inner circle with gradient */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill={accentColor}
          stroke="white"
          strokeWidth="4"
          filter="url(#wheelGlow)"
        />
        <circle
          cx={center}
          cy={center}
          r={innerRadius - 8}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
        />
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
          letterSpacing="2"
        >
          FORTUNE
        </text>
        <text
          x={center}
          y={center + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
          letterSpacing="1"
        >
          WHEEL
        </text>
      </svg>
    );
  };

  // Render decorative lights around the wheel
  const renderLights = () => {
    const lightRadius = 250;
    return (
      <div className="absolute inset-0 pointer-events-none">
        {lights.map((isOn, index) => {
          const angle = (index * 15 - 90) * (Math.PI / 180);
          const x = 50 + (lightRadius / 5) * Math.cos(angle);
          const y = 50 + (lightRadius / 5) * Math.sin(angle);
          return (
            <div
              key={index}
              className="absolute w-3 h-3 rounded-full transition-all duration-100"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: isOn ? '#fbbf24' : '#374151',
                boxShadow: isOn ? '0 0 15px #fbbf24, 0 0 30px #f59e0b' : 'none',
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Background with radial gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${accentColor}15 0%, #000000 50%, #000000 100%)`,
        }}
      />

      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all z-20 backdrop-blur-sm"
      >
        <X size={24} className="text-white" />
      </button>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
            <Sparkles className="inline-block mr-3 text-yellow-400" size={40} />
            FORTUNE WHEEL
            <Sparkles className="inline-block ml-3 text-yellow-400" size={40} />
          </h1>
          <p className="text-white/60 text-lg">Spin to select the next player!</p>
        </div>

        {/* Wheel Container */}
        <div className="relative">
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)`,
              transform: 'scale(1.3)',
              filter: 'blur(20px)',
            }}
          />

          {/* Decorative lights */}
          {renderLights()}

          {/* Pointer/Arrow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
            <div
              className="relative"
              style={{ filter: `drop-shadow(0 0 20px ${accentColor})` }}
            >
              <div
                className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[35px] border-l-transparent border-r-transparent"
                style={{ borderTopColor: accentColor }}
              />
              <div
                className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[22px] border-l-transparent border-r-transparent border-t-white/30"
              />
            </div>
          </div>

          {/* The Wheel */}
          <div className="relative p-8">
            {renderWheel()}
          </div>
        </div>

        {/* Player Legend - Horizontal below wheel */}
        <div className="mt-8 w-full max-w-3xl px-4">
          <div className="flex flex-wrap justify-center gap-2">
            {wheelPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  highlightedIndex === index
                    ? 'bg-white/30 ring-2 ring-white scale-110'
                    : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
                >
                  {index + 1}
                </span>
                <span className="text-sm text-white font-medium truncate max-w-[100px]">
                  {player.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Result Display */}
        {showResult && selectedPlayer && (
          <div
            className="mt-6 text-center px-12 py-6 rounded-2xl animate-bounce"
            style={{
              background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`,
              border: `3px solid ${accentColor}`,
              boxShadow: `0 0 40px ${accentColor}50`
            }}
          >
            <p className="text-white/70 text-sm mb-1 uppercase tracking-wider">Selected Player</p>
            <p className="text-4xl font-black text-white">{selectedPlayer.name}</p>
            {selectedPlayer.player_uid && (
              <p className="text-xl text-cyan-400 font-bold mt-1">{selectedPlayer.player_uid}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          {!selectedPlayer ? (
            <button
              onClick={spinWheel}
              disabled={isSpinning || wheelPlayers.length === 0}
              className="group flex items-center gap-3 px-10 py-4 rounded-full font-bold text-white text-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow: `0 0 30px ${accentColor}60, inset 0 1px 0 rgba(255,255,255,0.2)`
              }}
            >
              <Play size={24} className={isSpinning ? 'animate-spin' : 'group-hover:scale-110 transition-transform'} />
              {isSpinning ? 'Spinning...' : 'SPIN NOW!'}
            </button>
          ) : (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-white bg-white/10 hover:bg-white/20 transition-all text-lg backdrop-blur-sm"
              >
                <RotateCcw size={20} />
                Spin Again
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-10 py-4 rounded-full font-bold text-white text-lg transition-all hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                  boxShadow: `0 0 30px ${accentColor}60`
                }}
              >
                <Sparkles size={20} />
                Start Bidding
              </button>
            </>
          )}
        </div>

        {/* Player Count */}
        <p className="text-white/40 text-sm mt-6">
          {wheelPlayers.length} players on wheel
          {players.length > 12 && ` (showing first 12 of ${players.length})`}
        </p>
      </div>
    </div>
  );
}
