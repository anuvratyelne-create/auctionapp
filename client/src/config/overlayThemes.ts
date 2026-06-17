// Overlay Theme Configurations
// Defines visual settings for each overlay theme variant

import { OverlayTheme } from '../types';

export interface OverlayThemeConfig {
  id: OverlayTheme;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textMuted: string;
  };
  particles: {
    enabled: boolean;
    type: 'embers' | 'neon' | 'gold' | 'none';
    count: number;
    colors: string[];
  };
  effects: {
    glow: boolean;
    glowColor: string;
    shimmer: boolean;
    gradientBorder: boolean;
  };
  font?: string; // Optional custom font
  soldStamp: {
    background: string;
    textColor: string;
    glowColor: string;
  };
  unsoldStamp: {
    background: string;
    textColor: string;
    glowColor: string;
  };
}

export const overlayThemes: Record<Exclude<OverlayTheme, 'auto'>, OverlayThemeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Clean, professional broadcast style',
    colors: {
      primary: '#22c55e',
      secondary: '#0ea5e9',
      accent: '#22c55e',
      background: 'rgba(15, 23, 42, 0.95)',
      text: '#ffffff',
      textMuted: '#94a3b8',
    },
    particles: {
      enabled: false,
      type: 'none',
      count: 0,
      colors: [],
    },
    effects: {
      glow: false,
      glowColor: '#22c55e',
      shimmer: false,
      gradientBorder: false,
    },
    soldStamp: {
      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
      textColor: '#ffffff',
      glowColor: 'rgba(34, 197, 94, 0.6)',
    },
    unsoldStamp: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      textColor: '#ffffff',
      glowColor: 'rgba(239, 68, 68, 0.6)',
    },
  },

  fire: {
    id: 'fire',
    name: 'Fire',
    description: 'Dramatic fire theme with embers and flames',
    colors: {
      primary: '#f97316',
      secondary: '#ef4444',
      accent: '#fbbf24',
      background: 'rgba(20, 10, 5, 0.95)',
      text: '#ffffff',
      textMuted: '#fdba74',
    },
    particles: {
      enabled: true,
      type: 'embers',
      count: 40,
      colors: ['#f97316', '#ef4444', '#fbbf24', '#dc2626'],
    },
    effects: {
      glow: true,
      glowColor: '#f97316',
      shimmer: true,
      gradientBorder: true,
    },
    soldStamp: {
      background: 'linear-gradient(135deg, #f97316, #ef4444)',
      textColor: '#ffffff',
      glowColor: 'rgba(249, 115, 22, 0.7)',
    },
    unsoldStamp: {
      background: 'linear-gradient(135deg, #7f1d1d, #450a0a)',
      textColor: '#fca5a5',
      glowColor: 'rgba(127, 29, 29, 0.6)',
    },
  },

  city: {
    id: 'city',
    name: 'City',
    description: 'Cyberpunk neon city with glowing effects',
    colors: {
      primary: '#06b6d4',
      secondary: '#a855f7',
      accent: '#ec4899',
      background: 'rgba(10, 10, 20, 0.95)',
      text: '#ffffff',
      textMuted: '#67e8f9',
    },
    particles: {
      enabled: true,
      type: 'neon',
      count: 25,
      colors: ['#06b6d4', '#a855f7', '#ec4899', '#22d3ee'],
    },
    effects: {
      glow: true,
      glowColor: '#06b6d4',
      shimmer: true,
      gradientBorder: true,
    },
    font: 'Orbitron',
    soldStamp: {
      background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      textColor: '#ffffff',
      glowColor: 'rgba(6, 182, 212, 0.7)',
    },
    unsoldStamp: {
      background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
      textColor: '#ffffff',
      glowColor: 'rgba(168, 85, 247, 0.6)',
    },
  },

  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Luxury gold theme with elegant particles',
    colors: {
      primary: '#d4af37',
      secondary: '#b8860b',
      accent: '#ffd700',
      background: 'rgba(15, 12, 10, 0.95)',
      text: '#ffffff',
      textMuted: '#d4af37',
    },
    particles: {
      enabled: true,
      type: 'gold',
      count: 30,
      colors: ['#d4af37', '#ffd700', '#b8860b', '#f5deb3'],
    },
    effects: {
      glow: true,
      glowColor: '#d4af37',
      shimmer: true,
      gradientBorder: true,
    },
    soldStamp: {
      background: 'linear-gradient(135deg, #d4af37, #b8860b)',
      textColor: '#000000',
      glowColor: 'rgba(212, 175, 55, 0.7)',
    },
    unsoldStamp: {
      background: 'linear-gradient(135deg, #374151, #1f2937)',
      textColor: '#d1d5db',
      glowColor: 'rgba(55, 65, 81, 0.6)',
    },
  },
};

// Get theme config by ID
export function getOverlayTheme(themeId: OverlayTheme): OverlayThemeConfig {
  if (themeId === 'auto') {
    return overlayThemes.classic; // Default fallback
  }
  return overlayThemes[themeId] || overlayThemes.classic;
}

// Map admin layout to overlay theme
export function layoutToOverlayTheme(layout: string): Exclude<OverlayTheme, 'auto'> {
  switch (layout) {
    case 'fire':
      return 'fire';
    case 'city':
      return 'city';
    case 'premium-broadcast':
      return 'premium';
    case 'classic':
    default:
      return 'classic';
  }
}

// Default overlay settings
export const defaultOverlaySettings = {
  theme: 'auto' as OverlayTheme,
  mode: 'standard' as const,
  accentColor: '#22c55e',
  showParticles: true,
  showTimer: true,
  showTeamLogo: true,
};
