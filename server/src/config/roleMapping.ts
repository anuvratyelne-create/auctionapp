// Role category mapping for player filtering (server-side)
// Maps high-level role categories to specific role values stored in player stats

export interface RoleCategory {
  id: string;
  name: string;
  roles: string[]; // Specific role values that belong to this category
}

export const ROLE_FILTER_CATEGORIES: RoleCategory[] = [
  {
    id: 'batsman',
    name: 'Batsman',
    roles: ['bat-rh', 'bat-lh', 'batsman', 'batter'],
  },
  {
    id: 'bowler',
    name: 'Bowler',
    roles: ['bowl-rf', 'bowl-lf', 'bowl-rfm', 'bowl-lfm', 'bowl-rmf', 'bowl-lmf', 'bowl-rm', 'bowl-lm', 'bowl-ob', 'bowl-sla', 'bowl-lb', 'bowl-lc', 'bowler', 'pacer', 'fast-bowler'],
  },
  {
    id: 'spinner',
    name: 'Spinner',
    roles: ['bowl-ob', 'bowl-sla', 'bowl-lb', 'bowl-lc', 'spinner', 'spin-bowler'],
  },
  {
    id: 'all-rounder',
    name: 'All-Rounder',
    roles: [
      'ar-bat-rf', 'ar-bat-lf', 'ar-bat-rm', 'ar-bat-ob', 'ar-bat-lb', 'ar-bat-sla',
      'ar-bowl-rf', 'ar-bowl-lf', 'ar-bowl-rm', 'ar-bowl-ob', 'ar-bowl-lb', 'ar-bowl-sla',
      'ar-bat', 'ar-bowl', 'ar-rh', 'ar-lh', 'all-rounder', 'allrounder'
    ],
  },
  {
    id: 'wicketkeeper',
    name: 'Wicketkeeper',
    roles: ['wk-rh', 'wk-lh', 'wicketkeeper', 'wicket-keeper', 'keeper', 'wk'],
  },
];

// Map of category ID to role values for quick lookup
export const ROLE_FILTER_MAPPING: Record<string, string[]> = ROLE_FILTER_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.id] = category.roles;
    return acc;
  },
  {} as Record<string, string[]>
);

// Helper function to get roles for a category
export function getRolesByFilterCategory(categoryId: string): string[] {
  return ROLE_FILTER_MAPPING[categoryId] || [];
}
