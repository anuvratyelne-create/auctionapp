import { memo } from 'react';
import LazyImage from './LazyImage';

interface PlayerPhotoProps {
  src: string | undefined | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

interface TeamLogoProps {
  src: string | undefined | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const playerSizes = {
  sm: 'w-12 h-12',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48',
};

const teamSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

/**
 * Optimized player photo component with lazy loading,
 * proper sizing, and fallback avatar.
 */
export const PlayerPhoto = memo(function PlayerPhoto({
  src,
  name = 'Player',
  size = 'md',
  className = '',
}: PlayerPhotoProps) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1f2937&color=fff&size=200`;

  return (
    <LazyImage
      src={src}
      alt={name}
      fallback={fallback}
      className={`${playerSizes[size]} rounded-full object-cover ${className}`}
    />
  );
});

/**
 * Optimized team logo component with lazy loading,
 * proper sizing, and fallback avatar.
 */
export const TeamLogo = memo(function TeamLogo({
  src,
  name = 'Team',
  size = 'md',
  className = '',
}: TeamLogoProps) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.slice(0, 2))}&background=374151&color=fff&size=64`;

  return (
    <LazyImage
      src={src}
      alt={name}
      fallback={fallback}
      className={`${teamSizes[size]} rounded-lg object-contain ${className}`}
    />
  );
});

/**
 * Optimized sponsor logo component with lazy loading.
 */
export const SponsorLogo = memo(function SponsorLogo({
  src,
  name = 'Sponsor',
  className = '',
}: {
  src: string | undefined | null;
  name?: string;
  className?: string;
}) {
  return (
    <LazyImage
      src={src}
      alt={name}
      className={`max-h-12 w-auto object-contain ${className}`}
    />
  );
});
