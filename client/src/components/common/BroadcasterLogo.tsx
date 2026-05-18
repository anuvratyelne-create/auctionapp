import { memo } from 'react';
import { motion } from 'framer-motion';

interface BroadcasterLogoProps {
  logoUrl?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme?: 'premium' | 'fire' | 'city' | 'classic';
  showName?: boolean;
  className?: string;
  animate?: boolean;
}

const sizeClasses = {
  sm: 'h-8 max-w-[80px]',
  md: 'h-12 max-w-[120px]',
  lg: 'h-16 max-w-[160px]',
  xl: 'h-20 max-w-[200px]',
};

const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

const themeGlowStyles = {
  premium: 'drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]',
  fire: 'drop-shadow-[0_0_20px_rgba(249,115,22,0.5)]',
  city: 'drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]',
  classic: 'drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]',
};

const themeBgStyles = {
  premium: 'bg-black/40 border-amber-500/30',
  fire: 'bg-black/40 border-orange-500/30',
  city: 'bg-black/40 border-cyan-500/30',
  classic: 'bg-black/40 border-white/20',
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
  className = '',
  animate = true,
}: BroadcasterLogoProps) {
  if (!logoUrl && !name) return null;

  const content = (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border
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
