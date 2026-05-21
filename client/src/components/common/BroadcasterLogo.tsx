import { memo } from 'react';
import { motion } from 'framer-motion';

interface BroadcasterLogoProps {
  logoUrl?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme?: 'premium' | 'fire' | 'city' | 'classic';
  showName?: boolean;
  showBackground?: boolean;
  className?: string;
  animate?: boolean;
}

const sizeClasses = {
  sm: 'h-14 max-w-[140px]',
  md: 'h-20 max-w-[200px]',
  lg: 'h-28 max-w-[280px]',
  xl: 'h-40 max-w-[400px]',
  xxl: 'h-52 max-w-[520px]',
};

const positionClasses = {
  'top-left': 'top-6 left-6',
  'top-right': 'top-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-right': 'bottom-6 right-6',
};

const themeGlowStyles = {
  premium: 'drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]',
  fire: 'drop-shadow-[0_0_20px_rgba(249,115,22,0.5)]',
  city: 'drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]',
  classic: 'drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]',
};

const themeBgStyles = {
  premium: 'bg-black/60 border-amber-500/40',
  fire: 'bg-black/60 border-orange-500/40',
  city: 'bg-black/60 border-cyan-500/40',
  classic: 'bg-black/60 border-white/30',
};

const themeTextStyles = {
  premium: 'text-amber-400',
  fire: 'text-orange-400',
  city: 'text-cyan-400',
  classic: 'text-white/80',
};

/**
 * BroadcasterLogo component displays the broadcaster's branding
 * Used in overlay, break screens, and animations
 */
function BroadcasterLogo({
  logoUrl,
  name,
  size = 'md',
  position = 'top-right',
  theme = 'classic',
  showName = false,
  showBackground = false,
  className = '',
  animate = true,
}: BroadcasterLogoProps) {
  if (!logoUrl && !name) return null;

  // Content with or without background
  const content = showBackground ? (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-md border-2
        ${themeBgStyles[theme]}
        ${className}
      `}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt={name || 'Broadcaster'}
          className={`${sizeClasses[size]} object-contain ${themeGlowStyles[theme]}`}
        />
      )}
      {showName && name && (
        <span className={`text-sm font-semibold ${themeTextStyles[theme]}`}>
          {name}
        </span>
      )}
    </div>
  ) : (
    // No background - just the logo with glow
    <div className={`flex items-center gap-3 ${className}`}>
      {logoUrl && (
        <img
          src={logoUrl}
          alt={name || 'Broadcaster'}
          className={`${sizeClasses[size]} object-contain ${themeGlowStyles[theme]}`}
        />
      )}
      {showName && name && (
        <span className={`text-sm font-semibold ${themeTextStyles[theme]} drop-shadow-lg`}>
          {name}
        </span>
      )}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        className={`absolute z-50 ${positionClasses[position]}`}
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className={`absolute z-50 ${positionClasses[position]}`}>
      {content}
    </div>
  );
}

export default memo(BroadcasterLogo);
