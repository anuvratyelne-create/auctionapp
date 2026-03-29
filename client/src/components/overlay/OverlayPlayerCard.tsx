import { User, Hash } from 'lucide-react';
import { Player } from '../../types';

interface OverlayPlayerCardProps {
  player: Player;
  mode?: 'minimal' | 'standard' | 'premium';
  accentColor?: string;
}

export default function OverlayPlayerCard({
  player,
  mode = 'standard',
  accentColor = '#22c55e'
}: OverlayPlayerCardProps) {
  // Minimal mode - just name and photo
  if (mode === 'minimal') {
    return (
      <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.name}
            className="w-12 h-12 object-cover rounded-lg"
          />
        ) : (
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
            <User size={24} className="text-slate-500" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-white">{player.name}</h3>
          {player.jersey_number && (
            <span className="text-sm text-slate-400">#{player.jersey_number}</span>
          )}
        </div>
      </div>
    );
  }

  // Premium mode - full card with all effects
  if (mode === 'premium') {
    return (
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))`,
          border: `2px solid ${accentColor}40`,
          boxShadow: `0 0 40px ${accentColor}20, inset 0 1px 0 rgba(255,255,255,0.1)`
        }}
      >
        {/* Accent glow */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: accentColor }}
        />

        {/* Top accent bar */}
        <div
          className="h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        />

        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Player Photo */}
            <div className="relative">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-28 h-28 object-cover rounded-xl"
                  style={{
                    border: `3px solid ${accentColor}60`,
                    boxShadow: `0 0 20px ${accentColor}30`
                  }}
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
                    border: `3px solid ${accentColor}60`
                  }}
                >
                  <User size={48} className="text-slate-400" />
                </div>
              )}

              {/* Jersey number badge */}
              {player.jersey_number && (
                <div
                  className="absolute -bottom-2 -right-2 px-3 py-1 rounded-lg font-bold text-white text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                    boxShadow: `0 0 15px ${accentColor}50`
                  }}
                >
                  #{player.jersey_number}
                </div>
              )}
            </div>

            {/* Player Info */}
            <div className="flex-1">
              <h2
                className="text-3xl font-black text-white tracking-tight"
                style={{ textShadow: `0 0 30px ${accentColor}40` }}
              >
                {player.name}
              </h2>

              {/* Category */}
              {player.categories && (
                <div
                  className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    background: `${accentColor}20`,
                    color: accentColor,
                    border: `1px solid ${accentColor}40`
                  }}
                >
                  {player.categories.name}
                </div>
              )}

              {/* Base Price */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-slate-400 text-sm">Base Price:</span>
                <span className="text-white font-bold">
                  {player.base_price.toLocaleString('en-IN')} pts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard mode (default)
  return (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10">
      <div className="p-5">
        <div className="flex items-center gap-4">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              className="w-20 h-20 object-cover rounded-xl border-2 border-white/20"
            />
          ) : (
            <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center">
              <User size={36} className="text-slate-500" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">{player.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {player.jersey_number && (
                <span className="flex items-center gap-1 text-slate-400 text-sm">
                  <Hash size={14} />
                  {player.jersey_number}
                </span>
              )}
              {player.categories && (
                <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                  {player.categories.name}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-2">
              Base: {player.base_price.toLocaleString('en-IN')} pts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
