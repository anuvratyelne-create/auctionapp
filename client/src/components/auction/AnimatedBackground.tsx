import { useMemo } from 'react';

export type AnimatedBgType =
  | 'tech-circuit'
  | 'stadium-lights'
  | 'neon-pulse'
  | 'gradient-wave'
  | 'particles'
  | 'stadium-spotlight'
  | 'championship-gold'
  | 'world-cup-night'
  | 'electric-arena'
  | 'none';

interface AnimatedBackgroundProps {
  type: AnimatedBgType;
  accentColor?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export default function AnimatedBackground({
  type,
  accentColor = '#f59e0b',
  intensity = 'medium'
}: AnimatedBackgroundProps) {
  const opacityMap = {
    low: 0.3,
    medium: 0.5,
    high: 0.8,
  };

  const baseOpacity = opacityMap[intensity];

  if (type === 'none') return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {type === 'tech-circuit' && <TechCircuitBg accentColor={accentColor} opacity={baseOpacity} />}
      {type === 'stadium-lights' && <StadiumLightsBg accentColor={accentColor} opacity={baseOpacity} />}
      {type === 'neon-pulse' && <NeonPulseBg accentColor={accentColor} opacity={baseOpacity} />}
      {type === 'gradient-wave' && <GradientWaveBg accentColor={accentColor} opacity={baseOpacity} />}
      {type === 'particles' && <ParticlesBg accentColor={accentColor} opacity={baseOpacity} />}
      {type === 'stadium-spotlight' && <StadiumSpotlightBg accentColor={accentColor} opacity={baseOpacity} />}
      {type === 'championship-gold' && <ChampionshipGoldBg accentColor={accentColor} opacity={baseOpacity} />}
      {type === 'world-cup-night' && <WorldCupNightBg accentColor={accentColor} opacity={baseOpacity} />}
      {type === 'electric-arena' && <ElectricArenaBg accentColor={accentColor} opacity={baseOpacity} />}
    </div>
  );
}

// Tech Circuit Animation
function TechCircuitBg({ accentColor, opacity }: { accentColor: string; opacity: number }) {
  return (
    <>
      {/* Animated grid lines */}
      <div
        className="absolute inset-0 animate-moving-dots"
        style={{
          color: accentColor,
          opacity: opacity * 0.3,
        }}
      />

      {/* Horizontal scan line */}
      <div
        className="absolute left-0 right-0 h-px animate-scan-line"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          opacity: opacity * 0.6,
        }}
      />

      {/* Corner glows */}
      <div
        className="absolute top-0 left-0 w-64 h-64 rounded-full animate-glow-pulse"
        style={{
          background: `radial-gradient(circle, ${accentColor}40, transparent 70%)`,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-64 h-64 rounded-full animate-glow-pulse"
        style={{
          background: `radial-gradient(circle, ${accentColor}40, transparent 70%)`,
          animationDelay: '2s',
        }}
      />

      {/* Circuit lines SVG */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: opacity * 0.4 }}>
        <defs>
          <linearGradient id="circuit-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor={accentColor} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {/* Top circuit lines */}
        <path
          d="M0,50 L100,50 L150,100 L300,100"
          stroke="url(#circuit-gradient)"
          strokeWidth="1"
          fill="none"
          className="animate-circuit-flow"
        />
        <path
          d="M0,80 L80,80 L120,40 L250,40"
          stroke="url(#circuit-gradient)"
          strokeWidth="1"
          fill="none"
          className="animate-circuit-flow"
          style={{ animationDelay: '1s' }}
        />
        {/* Bottom circuit lines */}
        <path
          d="M100%,calc(100% - 50px) L calc(100% - 100px),calc(100% - 50px) L calc(100% - 150px),calc(100% - 100px)"
          stroke="url(#circuit-gradient)"
          strokeWidth="1"
          fill="none"
          className="animate-circuit-flow"
          style={{ animationDelay: '0.5s' }}
        />
      </svg>
    </>
  );
}

// Stadium Lights Animation
function StadiumLightsBg({ accentColor, opacity }: { accentColor: string; opacity: number }) {
  return (
    <>
      {/* Stadium flare lights */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-stadium-flare"
          style={{
            top: '0',
            left: `${20 + i * 20}%`,
            width: '200px',
            height: '60%',
            background: `linear-gradient(180deg, ${accentColor}30, transparent)`,
            transform: `rotate(${-15 + i * 10}deg)`,
            transformOrigin: 'top center',
            animationDelay: `${i * 0.5}s`,
            opacity: opacity,
          }}
        />
      ))}

      {/* Ground reflection */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3"
        style={{
          background: `linear-gradient(to top, ${accentColor}10, transparent)`,
        }}
      />

      {/* Light orbs */}
      <div
        className="absolute top-10 left-1/4 w-4 h-4 rounded-full animate-live-pulse"
        style={{ background: accentColor, opacity: opacity }}
      />
      <div
        className="absolute top-10 right-1/4 w-4 h-4 rounded-full animate-live-pulse"
        style={{ background: accentColor, opacity: opacity, animationDelay: '0.5s' }}
      />
    </>
  );
}

// Neon Pulse Animation
function NeonPulseBg({ accentColor, opacity }: { accentColor: string; opacity: number }) {
  return (
    <>
      {/* Pulsing border frame */}
      <div
        className="absolute inset-8 border-2 rounded-3xl animate-border-glow animate-neon-flicker"
        style={{
          borderColor: accentColor,
          color: accentColor,
          opacity: opacity * 0.5,
        }}
      />

      {/* Corner accents */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-16 h-16 animate-corner-pulse`}
          style={{
            borderTop: i < 2 ? `3px solid ${accentColor}` : 'none',
            borderBottom: i >= 2 ? `3px solid ${accentColor}` : 'none',
            borderLeft: i % 2 === 0 ? `3px solid ${accentColor}` : 'none',
            borderRight: i % 2 === 1 ? `3px solid ${accentColor}` : 'none',
            borderRadius: '8px',
            animationDelay: `${i * 0.3}s`,
            opacity: opacity,
          }}
        />
      ))}

      {/* Center glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full animate-glow-pulse"
        style={{
          background: `radial-gradient(circle, ${accentColor}20, transparent 70%)`,
        }}
      />

      {/* Audio wave bars */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="w-1 bg-current rounded-full animate-audio-wave"
            style={{
              color: accentColor,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.3 + Math.random() * 0.4}s`,
              opacity: opacity * 0.6,
            }}
          />
        ))}
      </div>
    </>
  );
}

// Gradient Wave Animation
function GradientWaveBg({ accentColor, opacity }: { accentColor: string; opacity: number }) {
  // Convert hex to RGB for gradient manipulation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 245, g: 158, b: 11 };
  };

  const rgb = hexToRgb(accentColor);
  const complementaryRgb = {
    r: 255 - rgb.r,
    g: 255 - rgb.g,
    b: 255 - rgb.b,
  };

  return (
    <>
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 animate-gradient-sweep"
        style={{
          background: `linear-gradient(
            45deg,
            rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.3}),
            rgba(${complementaryRgb.r}, ${complementaryRgb.g}, ${complementaryRgb.b}, ${opacity * 0.2}),
            rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.3})
          )`,
          backgroundSize: '200% 200%',
        }}
      />

      {/* Horizontal light beams */}
      <div
        className="absolute top-1/4 left-0 right-0 h-32 animate-light-beam-h"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}20, transparent)`,
        }}
      />
      <div
        className="absolute top-2/3 left-0 right-0 h-24 animate-light-beam-h"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}15, transparent)`,
          animationDelay: '3s',
        }}
      />

      {/* Rotating spotlight */}
      <div className="absolute inset-0 animate-spotlight" style={{ opacity: opacity * 0.3 }}>
        <div
          className="absolute top-1/2 left-1/2 w-full h-1"
          style={{
            background: `linear-gradient(90deg, transparent 40%, ${accentColor}40, transparent 60%)`,
            transformOrigin: 'center center',
          }}
        />
      </div>
    </>
  );
}

// Particles Animation
function ParticlesBg({ accentColor, opacity }: { accentColor: string; opacity: number }) {
  const particles = useMemo(() => {
    return [...Array(30)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <>
      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-particle-1"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: accentColor,
            opacity: opacity * 0.5,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Large glowing orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full animate-particle-2"
        style={{
          background: `radial-gradient(circle, ${accentColor}30, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full animate-particle-3"
        style={{
          background: `radial-gradient(circle, ${accentColor}25, transparent 70%)`,
          filter: 'blur(50px)',
        }}
      />

      {/* Energy rings */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border animate-energy-ring"
        style={{
          borderColor: `${accentColor}20`,
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border animate-energy-ring"
        style={{
          borderColor: `${accentColor}30`,
          animationDelay: '2s',
          animationDirection: 'reverse',
        }}
      />
    </>
  );
}

// ============================================
// NEW STADIUM PROJECTION THEMES
// ============================================

// Stadium Spotlight - Dramatic sweeping spotlights
function StadiumSpotlightBg({ accentColor, opacity }: { accentColor: string; opacity: number }) {
  return (
    <>
      {/* Dark stadium base */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black" />

      {/* Main sweeping spotlights */}
      {[...Array(3)].map((_, i) => (
        <div
          key={`spotlight-${i}`}
          className="absolute top-0 animate-spotlight-sweep"
          style={{
            left: `${20 + i * 30}%`,
            width: '150px',
            height: '120%',
            background: `linear-gradient(180deg, ${accentColor}60 0%, ${accentColor}20 30%, transparent 100%)`,
            transformOrigin: 'top center',
            filter: 'blur(20px)',
            animationDelay: `${i * 1.5}s`,
            animationDuration: '8s',
            opacity: opacity * 0.8,
          }}
        />
      ))}

      {/* Stadium crowd silhouette */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: `linear-gradient(to top, #000 0%, transparent 100%)`,
        }}
      />

      {/* Atmospheric fog/haze */}
      <div
        className="absolute inset-0 animate-fog-drift"
        style={{
          background: `radial-gradient(ellipse at center, ${accentColor}15, transparent 60%)`,
        }}
      />

      {/* Corner light flares */}
      <div
        className="absolute top-0 left-0 w-96 h-96 animate-corner-flare"
        style={{
          background: `radial-gradient(circle at top left, ${accentColor}40, transparent 50%)`,
        }}
      />
      <div
        className="absolute top-0 right-0 w-96 h-96 animate-corner-flare"
        style={{
          background: `radial-gradient(circle at top right, ${accentColor}40, transparent 50%)`,
          animationDelay: '2s',
        }}
      />

      {/* Lens flare effect */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full animate-lens-flare"
        style={{
          background: accentColor,
          boxShadow: `0 0 60px 30px ${accentColor}60, 0 0 100px 60px ${accentColor}30`,
        }}
      />

      <style>{`
        @keyframes spotlight-sweep {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes fog-drift {
          0%, 100% { transform: translateX(-5%) scale(1.1); opacity: 0.3; }
          50% { transform: translateX(5%) scale(1); opacity: 0.5; }
        }
        @keyframes corner-flare {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes lens-flare {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.8; }
          50% { transform: translateX(-50%) scale(1.5); opacity: 1; }
        }
        .animate-spotlight-sweep { animation: spotlight-sweep 8s ease-in-out infinite; }
        .animate-fog-drift { animation: fog-drift 15s ease-in-out infinite; }
        .animate-corner-flare { animation: corner-flare 4s ease-in-out infinite; }
        .animate-lens-flare { animation: lens-flare 3s ease-in-out infinite; }
      `}</style>
    </>
  );
}

// Championship Gold - Trophy/winner celebration theme
function ChampionshipGoldBg({ accentColor, opacity }: { accentColor: string; opacity: number }) {
  return (
    <>
      {/* Rich dark background with gold tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-950/50 via-slate-950 to-amber-950/30" />

      {/* Animated gold shimmer */}
      <div
        className="absolute inset-0 animate-gold-shimmer"
        style={{
          background: `linear-gradient(45deg, transparent 30%, ${accentColor}10 50%, transparent 70%)`,
          backgroundSize: '200% 200%',
        }}
      />

      {/* Trophy light rays from center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[...Array(12)].map((_, i) => (
          <div
            key={`ray-${i}`}
            className="absolute w-1 h-[500px] origin-bottom animate-trophy-ray"
            style={{
              background: `linear-gradient(to top, ${accentColor}40, transparent)`,
              transform: `rotate(${i * 30}deg)`,
              animationDelay: `${i * 0.2}s`,
              opacity: opacity * 0.6,
            }}
          />
        ))}
      </div>

      {/* Floating gold particles/confetti */}
      {[...Array(20)].map((_, i) => (
        <div
          key={`gold-particle-${i}`}
          className="absolute w-2 h-2 animate-gold-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `linear-gradient(135deg, ${accentColor}, #fef08a)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 5}s`,
            opacity: opacity * 0.8,
          }}
        />
      ))}

      {/* Championship ring effect */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-4 animate-ring-expand"
        style={{
          borderColor: `${accentColor}30`,
          boxShadow: `0 0 100px ${accentColor}20, inset 0 0 100px ${accentColor}10`,
        }}
      />

      {/* Inner glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
        style={{
          background: `radial-gradient(circle, ${accentColor}30, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />

      <style>{`
        @keyframes gold-shimmer {
          0% { background-position: -200% -200%; }
          100% { background-position: 200% 200%; }
        }
        @keyframes trophy-ray {
          0%, 100% { opacity: 0.3; transform: rotate(var(--rotation)) scaleY(0.8); }
          50% { opacity: 0.8; transform: rotate(var(--rotation)) scaleY(1.2); }
        }
        @keyframes gold-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(180deg); }
        }
        @keyframes ring-expand {
          0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.6; }
        }
        .animate-gold-shimmer { animation: gold-shimmer 5s linear infinite; }
        .animate-trophy-ray { animation: trophy-ray 3s ease-in-out infinite; }
        .animate-gold-float { animation: gold-float 5s ease-in-out infinite; }
        .animate-ring-expand { animation: ring-expand 4s ease-in-out infinite; }
      `}</style>
    </>
  );
}

// World Cup Night - Cricket world cup atmosphere with fireworks
function WorldCupNightBg({ accentColor, opacity }: { accentColor: string; opacity: number }) {
  return (
    <>
      {/* Night sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-950 to-black" />

      {/* Stars */}
      {[...Array(50)].map((_, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 60}%`,
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            background: 'white',
            animationDelay: `${Math.random() * 3}s`,
            opacity: opacity * 0.7,
          }}
        />
      ))}

      {/* Firework bursts */}
      {[...Array(3)].map((_, i) => (
        <div
          key={`firework-${i}`}
          className="absolute animate-firework-burst"
          style={{
            left: `${20 + i * 30}%`,
            top: '30%',
            animationDelay: `${i * 2}s`,
          }}
        >
          {[...Array(8)].map((_, j) => (
            <div
              key={`spark-${j}`}
              className="absolute w-1 h-8 origin-bottom animate-spark-fly"
              style={{
                background: `linear-gradient(to top, ${accentColor}, transparent)`,
                transform: `rotate(${j * 45}deg)`,
                animationDelay: `${i * 2}s`,
                opacity: opacity,
              }}
            />
          ))}
        </div>
      ))}

      {/* Stadium light glow on horizon */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48"
        style={{
          background: `linear-gradient(to top, ${accentColor}30, transparent)`,
        }}
      />

      {/* Atmospheric flares */}
      <div
        className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, ${accentColor}20, transparent 70%)`,
          filter: 'blur(30px)',
        }}
      />

      {/* Celebration streaks */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`streak-${i}`}
          className="absolute h-px animate-celebration-streak"
          style={{
            top: `${20 + i * 15}%`,
            left: '-10%',
            width: '30%',
            background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)`,
            animationDelay: `${i * 0.5}s`,
            opacity: opacity,
          }}
        />
      ))}

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes firework-burst {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes spark-fly {
          0% { transform: rotate(var(--rotation)) scaleY(0); }
          50% { transform: rotate(var(--rotation)) scaleY(1); }
          100% { transform: rotate(var(--rotation)) scaleY(0); opacity: 0; }
        }
        @keyframes celebration-streak {
          0% { transform: translateX(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(500%); opacity: 0; }
        }
        .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
        .animate-firework-burst { animation: firework-burst 3s ease-out infinite; }
        .animate-spark-fly { animation: spark-fly 3s ease-out infinite; }
        .animate-celebration-streak { animation: celebration-streak 3s linear infinite; }
      `}</style>
    </>
  );
}

// Electric Arena - High energy lightning/electric theme
function ElectricArenaBg({ accentColor, opacity }: { accentColor: string; opacity: number }) {
  return (
    <>
      {/* Dark electric base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950" />

      {/* Electric grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${accentColor}10 1px, transparent 1px),
            linear-gradient(90deg, ${accentColor}10 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: opacity * 0.5,
        }}
      />

      {/* Lightning bolts */}
      {[...Array(3)].map((_, i) => (
        <svg
          key={`lightning-${i}`}
          className="absolute animate-lightning-flash"
          style={{
            left: `${20 + i * 30}%`,
            top: '0',
            width: '100px',
            height: '60%',
            animationDelay: `${i * 1.5 + Math.random()}s`,
            opacity: opacity,
          }}
          viewBox="0 0 100 200"
        >
          <path
            d="M50,0 L45,60 L60,60 L40,120 L55,120 L30,200 L50,110 L35,110 L55,50 L40,50 Z"
            fill={accentColor}
            filter="url(#glow)"
          />
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>
      ))}

      {/* Electric pulse rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[...Array(3)].map((_, i) => (
          <div
            key={`ring-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-electric-pulse"
            style={{
              width: `${300 + i * 150}px`,
              height: `${300 + i * 150}px`,
              borderColor: accentColor,
              animationDelay: `${i * 0.5}s`,
              opacity: opacity * 0.4,
            }}
          />
        ))}
      </div>

      {/* Electric sparks */}
      {[...Array(15)].map((_, i) => (
        <div
          key={`spark-${i}`}
          className="absolute w-1 h-1 rounded-full animate-electric-spark"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: accentColor,
            boxShadow: `0 0 10px ${accentColor}`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: opacity,
          }}
        />
      ))}

      {/* Energy core */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full animate-energy-core"
        style={{
          background: `radial-gradient(circle, ${accentColor}60, ${accentColor}20, transparent)`,
          boxShadow: `0 0 80px ${accentColor}40`,
        }}
      />

      <style>{`
        @keyframes lightning-flash {
          0%, 90%, 100% { opacity: 0; }
          92%, 94%, 96% { opacity: 1; }
          93%, 95% { opacity: 0.5; }
        }
        @keyframes electric-pulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes electric-spark {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes energy-core {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }
        .animate-lightning-flash { animation: lightning-flash 4s ease-in-out infinite; }
        .animate-electric-pulse { animation: electric-pulse 2s ease-out infinite; }
        .animate-electric-spark { animation: electric-spark 1s ease-in-out infinite; }
        .animate-energy-core { animation: energy-core 2s ease-in-out infinite; }
      `}</style>
    </>
  );
}
