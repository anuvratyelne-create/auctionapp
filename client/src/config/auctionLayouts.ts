// Layout Templates - Controls HOW things are arranged (independent of theme/colors)

export type LayoutType = 'classic' | 'premium-broadcast' | 'fire' | 'city';

export interface LayoutTemplate {
  id: LayoutType;
  name: string;
  description: string;
  preview: string; // SVG or icon representation
  hasStats?: boolean; // Whether this layout shows batting/bowling stats
}

export const layoutTemplates: LayoutTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Player on left, team info on right, buttons at bottom',
    preview: 'classic',
    hasStats: false,
  },
  {
    id: 'premium-broadcast',
    name: 'Premium Broadcast',
    description: 'Luxury gold theme with elegant frames, floating particles, and premium aesthetics',
    preview: 'premium-broadcast',
    hasStats: true,
  },
  {
    id: 'fire',
    name: 'Fire',
    description: 'Dramatic fire theme with animated flames and embers',
    preview: 'fire',
    hasStats: false,
  },
  {
    id: 'city',
    name: 'City',
    description: 'Night city skyline with neon glow effects',
    preview: 'city',
    hasStats: false,
  },
];

export const getLayout = (id: LayoutType): LayoutTemplate => {
  return layoutTemplates.find(l => l.id === id) || layoutTemplates[0];
};
