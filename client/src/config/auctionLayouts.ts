// Layout Templates - Controls HOW things are arranged (independent of theme/colors)

export type LayoutType = 'classic';

export interface LayoutTemplate {
  id: LayoutType;
  name: string;
  description: string;
  preview: string; // SVG or icon representation
}

export const layoutTemplates: LayoutTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Player on left, team info on right, buttons at bottom',
    preview: 'classic',
  },
];

export const getLayout = (id: LayoutType): LayoutTemplate => {
  return layoutTemplates.find(l => l.id === id) || layoutTemplates[0];
};
