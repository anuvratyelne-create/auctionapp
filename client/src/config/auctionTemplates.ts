// Auction Background Templates Configuration

import { AnimatedBgType } from '../components/auction/AnimatedBackground';

export interface AuctionTemplate {
  id: string;
  name: string;
  thumbnail: string;
  background: string;
  theme: 'dark' | 'light';
  accentColor: string;
  overlayOpacity: number;
  animatedBg?: AnimatedBgType;
  isAnimated?: boolean;
}

export const auctionTemplates: AuctionTemplate[] = [
  // === STADIUM PROJECTION THEMES (NEW) ===
  {
    id: 'stadium-spotlight',
    name: 'Stadium Spotlight',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#ffffff',
    overlayOpacity: 0,
    animatedBg: 'stadium-spotlight',
    isAnimated: true,
  },
  {
    id: 'championship-gold',
    name: 'Championship Gold',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#fbbf24',
    overlayOpacity: 0,
    animatedBg: 'championship-gold',
    isAnimated: true,
  },
  {
    id: 'world-cup-night',
    name: 'World Cup Night',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#3b82f6',
    overlayOpacity: 0,
    animatedBg: 'world-cup-night',
    isAnimated: true,
  },
  {
    id: 'electric-arena',
    name: 'Electric Arena',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#06b6d4',
    overlayOpacity: 0,
    animatedBg: 'electric-arena',
    isAnimated: true,
  },
  // === ANIMATED LIVE TEMPLATES ===
  {
    id: 'live-tech-circuit',
    name: 'LIVE Tech',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#3b82f6',
    overlayOpacity: 0,
    animatedBg: 'tech-circuit',
    isAnimated: true,
  },
  {
    id: 'live-stadium-lights',
    name: 'LIVE Stadium',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#f59e0b',
    overlayOpacity: 0,
    animatedBg: 'stadium-lights',
    isAnimated: true,
  },
  {
    id: 'live-neon-pulse',
    name: 'LIVE Neon',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#ec4899',
    overlayOpacity: 0,
    animatedBg: 'neon-pulse',
    isAnimated: true,
  },
  {
    id: 'live-gradient-wave',
    name: 'LIVE Gradient',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#8b5cf6',
    overlayOpacity: 0,
    animatedBg: 'gradient-wave',
    isAnimated: true,
  },
  {
    id: 'live-particles',
    name: 'LIVE Particles',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#06b6d4',
    overlayOpacity: 0,
    animatedBg: 'particles',
    isAnimated: true,
  },
  // === IMAGE TEMPLATES ===
  {
    id: 'tech-blue',
    name: 'Tech Blue',
    thumbnail: '/templates/tech-blue.png',
    background: '/templates/tech-blue.png',
    theme: 'dark',
    accentColor: '#3b82f6',
    overlayOpacity: 0.3,
  },
  {
    id: 'red-gaming',
    name: 'Red Gaming',
    thumbnail: '/templates/red-gaming.png',
    background: '/templates/red-gaming.png',
    theme: 'dark',
    accentColor: '#ef4444',
    overlayOpacity: 0.2,
  },
  {
    id: 'blue-tech-portal',
    name: 'Blue Portal',
    thumbnail: '/templates/blue-tech-portal.png',
    background: '/templates/blue-tech-portal.png',
    theme: 'dark',
    accentColor: '#06b6d4',
    overlayOpacity: 0.3,
  },
  {
    id: 'stadium-premium',
    name: 'IPL Premium',
    thumbnail: '/templates/stadium-premium.png',
    background: '/templates/stadium-premium.png',
    theme: 'dark',
    accentColor: '#f59e0b',
    overlayOpacity: 0.4,
  },
  {
    id: 'stadium-aerial-1',
    name: 'Stadium Night',
    thumbnail: '/templates/stadium-aerial-1.png',
    background: '/templates/stadium-aerial-1.png',
    theme: 'dark',
    accentColor: '#22c55e',
    overlayOpacity: 0.5,
  },
  {
    id: 'stadium-aerial-2',
    name: 'Stadium View',
    thumbnail: '/templates/stadium-aerial-2.png',
    background: '/templates/stadium-aerial-2.png',
    theme: 'dark',
    accentColor: '#22c55e',
    overlayOpacity: 0.5,
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk',
    thumbnail: '/templates/cyberpunk-neon.png',
    background: '/templates/cyberpunk-neon.png',
    theme: 'dark',
    accentColor: '#d946ef',
    overlayOpacity: 0.4,
  },
  {
    id: 'default',
    name: 'Classic Dark',
    thumbnail: '',
    background: '',
    theme: 'dark',
    accentColor: '#f59e0b',
    overlayOpacity: 0,
  },
];

export const getTemplate = (id: string): AuctionTemplate => {
  return auctionTemplates.find(t => t.id === id) || auctionTemplates[auctionTemplates.length - 1];
};
