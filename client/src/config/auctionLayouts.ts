// Layout Templates - Controls HOW things are arranged (independent of theme/colors)

export type LayoutType = 'classic' | 'premium-broadcast' | 'minimal-card' | 'ipl-style';

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
    description: 'TV broadcast style with stats panel, metallic blue/gold theme',
    preview: 'premium-broadcast',
    hasStats: true,
  },
  {
    id: 'ipl-style',
    name: 'IPL Style',
    description: 'Indian Premier League inspired design',
    preview: 'ipl-style',
    hasStats: true,
  },
  {
    id: 'minimal-card',
    name: 'Minimal Card',
    description: 'Clean, simple card-based layout',
    preview: 'minimal-card',
    hasStats: false,
  },
];

export const getLayout = (id: LayoutType): LayoutTemplate => {
  return layoutTemplates.find(l => l.id === id) || layoutTemplates[0];
};
