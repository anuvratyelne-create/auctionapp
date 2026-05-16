// Premium Broadcast Layout Background Options
// Supports gradient, image, and video backgrounds for luxury/gold theme

export interface PremiumBackground {
  id: string;
  name: string;
  type: 'gradient' | 'image' | 'video';
  value: string; // CSS gradient or URL
  thumbnail?: string;
  brightness?: number; // 0-1, default 0.7
  description?: string;
}

export const premiumBackgrounds: PremiumBackground[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE BACKGROUNDS - Stunning luxury visuals
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'trophy-room',
    name: 'Trophy Room',
    type: 'image',
    value: '/images/premium-trophy-room.png',
    brightness: 0.5,
    description: 'Golden trophies on mahogany display',
  },
  {
    id: 'grand-ballroom',
    name: 'Grand Ballroom',
    type: 'image',
    value: '/images/premium-grand-ballroom.png',
    brightness: 0.45,
    description: 'Crystal chandeliers & marble floors',
  },
  {
    id: 'vip-lounge',
    name: 'VIP Lounge',
    type: 'image',
    value: '/images/premium-vip-lounge.png',
    brightness: 0.5,
    description: 'Exclusive leather & gold ambiance',
  },
  {
    id: 'award-stage',
    name: 'Award Stage',
    type: 'image',
    value: '/images/premium-award-stage.png',
    brightness: 0.45,
    description: 'Red carpet & golden curtains',
  },
  {
    id: 'dark-marble',
    name: 'Dark Marble',
    type: 'image',
    value: '/images/premium-dark-marble.png',
    brightness: 0.6,
    description: 'Black marble with gold veins',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GRADIENT BACKGROUNDS - For quick loading / fallback
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'dark-velvet',
    name: 'Dark Velvet',
    type: 'gradient',
    value: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 50%, #050508 100%)',
    brightness: 1,
    description: 'Rich dark background with subtle gradient',
  },
  {
    id: 'gold-ambient',
    name: 'Gold Ambient',
    type: 'gradient',
    value: 'radial-gradient(ellipse at top, rgba(212,175,55,0.15) 0%, #0a0a0f 40%, #050508 100%)',
    brightness: 1,
    description: 'Subtle gold glow from above',
  },
  {
    id: 'champagne-mist',
    name: 'Champagne Mist',
    type: 'gradient',
    value: 'radial-gradient(ellipse at 30% 20%, rgba(247,231,206,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(212,175,55,0.08) 0%, transparent 50%), linear-gradient(to bottom, #12121a 0%, #0a0a0f 100%)',
    brightness: 1,
    description: 'Elegant champagne tones',
  },
  {
    id: 'luxury-purple',
    name: 'Luxury Purple',
    type: 'gradient',
    value: 'radial-gradient(ellipse at 50% 0%, rgba(74,26,74,0.4) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(212,175,55,0.1) 0%, transparent 40%), linear-gradient(to bottom, #12121a 0%, #0a0a0f 100%)',
    brightness: 1,
    description: 'Deep purple with gold accents',
  },
  {
    id: 'auction-hall',
    name: 'Auction Hall',
    type: 'gradient',
    value: 'radial-gradient(ellipse at 50% -20%, rgba(184,134,11,0.2) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(205,127,50,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(205,127,50,0.1) 0%, transparent 40%), linear-gradient(to bottom, #16121a 0%, #0a080c 100%)',
    brightness: 1,
    description: 'Classic auction house atmosphere',
  },
  {
    id: 'bronze-spotlight',
    name: 'Bronze Spotlight',
    type: 'gradient',
    value: 'radial-gradient(ellipse at 50% 30%, rgba(205,127,50,0.2) 0%, transparent 50%), linear-gradient(to bottom, #0f0d12 0%, #0a0a0f 100%)',
    brightness: 1,
    description: 'Dramatic bronze spotlight effect',
  },
];

export const defaultPremiumBackground = 'trophy-room';

export function getPremiumBackground(id: string): PremiumBackground | undefined {
  return premiumBackgrounds.find(bg => bg.id === id);
}

// Get only image backgrounds
export function getImageBackgrounds(): PremiumBackground[] {
  return premiumBackgrounds.filter(bg => bg.type === 'image');
}

// Get only gradient backgrounds
export function getGradientBackgrounds(): PremiumBackground[] {
  return premiumBackgrounds.filter(bg => bg.type === 'gradient');
}
