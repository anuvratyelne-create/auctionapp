import { useState, useEffect } from 'react';

interface AppLogoProps {
  broadcasterLogoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  rotateInterval?: number; // milliseconds, default 5000
  showRotation?: boolean; // if false, show only app logo when no broadcaster
  theme?: 'default' | 'fire' | 'city' | 'premium';
}

const sizeClasses = {
  sm: 'h-10',
  md: 'h-14',
  lg: 'h-20',
  xl: 'h-28',
};

const glowStyles = {
  default: 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.5))',
  fire: 'drop-shadow(0 0 15px rgba(249, 115, 22, 0.6))',
  city: 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.6))',
  premium: 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.6))',
};

export default function AppLogo({
  broadcasterLogoUrl,
  size = 'md',
  className = '',
  rotateInterval = 5000,
  showRotation = true,
  theme = 'default',
}: AppLogoProps) {
  const [showAppLogo, setShowAppLogo] = useState(!broadcasterLogoUrl);

  useEffect(() => {
    // If no broadcaster logo, always show app logo
    if (!broadcasterLogoUrl) {
      setShowAppLogo(true);
      return;
    }

    // If rotation is disabled, show broadcaster logo
    if (!showRotation) {
      setShowAppLogo(false);
      return;
    }

    // Rotate between broadcaster and app logo
    const interval = setInterval(() => {
      setShowAppLogo((prev) => !prev);
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [broadcasterLogoUrl, rotateInterval, showRotation]);

  const currentLogo = showAppLogo ? '/logo.png' : broadcasterLogoUrl;
  const altText = showAppLogo ? 'Game Auction' : 'Broadcaster';

  return (
    <div className={`relative ${className}`}>
      <img
        src={currentLogo || '/logo.png'}
        alt={altText}
        className={`${sizeClasses[size]} w-auto object-contain transition-opacity duration-500`}
        style={{ filter: glowStyles[theme] }}
      />
    </div>
  );
}
