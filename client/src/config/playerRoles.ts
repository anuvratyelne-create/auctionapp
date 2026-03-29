// Comprehensive Cricket Player Roles Configuration

export interface RoleOption {
  value: string;
  label: string;
  shortLabel: string;
  icon: string;
  category: 'batsman' | 'bowler' | 'all-rounder' | 'wicketkeeper';
}

export interface RoleCategory {
  id: string;
  name: string;
  icon: string;
  roles: RoleOption[];
}

// Primary role categories
export const PLAYER_CATEGORIES: RoleCategory[] = [
  {
    id: 'batsman',
    name: 'Batsman',
    icon: '🏏',
    roles: [
      { value: 'bat-rh', label: 'Right-Handed Batsman', shortLabel: 'RHB', icon: '🏏', category: 'batsman' },
      { value: 'bat-lh', label: 'Left-Handed Batsman', shortLabel: 'LHB', icon: '🏏', category: 'batsman' },
    ]
  },
  {
    id: 'wicketkeeper',
    name: 'Wicketkeeper',
    icon: '🧤',
    roles: [
      { value: 'wk-rh', label: 'Wicketkeeper (Right-Handed Bat)', shortLabel: 'WK-RHB', icon: '🧤', category: 'wicketkeeper' },
      { value: 'wk-lh', label: 'Wicketkeeper (Left-Handed Bat)', shortLabel: 'WK-LHB', icon: '🧤', category: 'wicketkeeper' },
    ]
  },
  {
    id: 'pace-bowler',
    name: 'Pace Bowler',
    icon: '💨',
    roles: [
      // Fast bowlers
      { value: 'bowl-rf', label: 'Right-Arm Fast', shortLabel: 'RF', icon: '💨', category: 'bowler' },
      { value: 'bowl-lf', label: 'Left-Arm Fast', shortLabel: 'LF', icon: '💨', category: 'bowler' },
      // Fast-Medium bowlers
      { value: 'bowl-rfm', label: 'Right-Arm Fast Medium', shortLabel: 'RFM', icon: '💨', category: 'bowler' },
      { value: 'bowl-lfm', label: 'Left-Arm Fast Medium', shortLabel: 'LFM', icon: '💨', category: 'bowler' },
      // Medium-Fast bowlers
      { value: 'bowl-rmf', label: 'Right-Arm Medium Fast', shortLabel: 'RMF', icon: '💨', category: 'bowler' },
      { value: 'bowl-lmf', label: 'Left-Arm Medium Fast', shortLabel: 'LMF', icon: '💨', category: 'bowler' },
      // Medium bowlers
      { value: 'bowl-rm', label: 'Right-Arm Medium', shortLabel: 'RM', icon: '💨', category: 'bowler' },
      { value: 'bowl-lm', label: 'Left-Arm Medium', shortLabel: 'LM', icon: '💨', category: 'bowler' },
    ]
  },
  {
    id: 'spin-bowler',
    name: 'Spin Bowler',
    icon: '🔄',
    roles: [
      // Off Spin (Finger spin - Right arm)
      { value: 'bowl-ob', label: 'Right-Arm Off Spin', shortLabel: 'OB', icon: '🔄', category: 'bowler' },
      // Left-arm Orthodox (Finger spin - Left arm)
      { value: 'bowl-sla', label: 'Slow Left-Arm Orthodox', shortLabel: 'SLA', icon: '🔄', category: 'bowler' },
      // Leg Spin (Wrist spin - Right arm)
      { value: 'bowl-lb', label: 'Right-Arm Leg Spin', shortLabel: 'LB', icon: '🔄', category: 'bowler' },
      // Chinaman (Wrist spin - Left arm)
      { value: 'bowl-lc', label: 'Left-Arm Chinaman', shortLabel: 'LC', icon: '🔄', category: 'bowler' },
    ]
  },
  {
    id: 'all-rounder',
    name: 'All-Rounder',
    icon: '⭐',
    roles: [
      // Batting All-Rounders
      { value: 'ar-bat-rf', label: 'Batting All-Rounder (Right-Arm Fast)', shortLabel: 'BAR-RF', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bat-lf', label: 'Batting All-Rounder (Left-Arm Fast)', shortLabel: 'BAR-LF', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bat-rm', label: 'Batting All-Rounder (Right-Arm Medium)', shortLabel: 'BAR-RM', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bat-ob', label: 'Batting All-Rounder (Off Spin)', shortLabel: 'BAR-OB', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bat-lb', label: 'Batting All-Rounder (Leg Spin)', shortLabel: 'BAR-LB', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bat-sla', label: 'Batting All-Rounder (Left-Arm Orthodox)', shortLabel: 'BAR-SLA', icon: '⭐', category: 'all-rounder' },
      // Bowling All-Rounders
      { value: 'ar-bowl-rf', label: 'Bowling All-Rounder (Right-Arm Fast)', shortLabel: 'BOAR-RF', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bowl-lf', label: 'Bowling All-Rounder (Left-Arm Fast)', shortLabel: 'BOAR-LF', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bowl-rm', label: 'Bowling All-Rounder (Right-Arm Medium)', shortLabel: 'BOAR-RM', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bowl-ob', label: 'Bowling All-Rounder (Off Spin)', shortLabel: 'BOAR-OB', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bowl-lb', label: 'Bowling All-Rounder (Leg Spin)', shortLabel: 'BOAR-LB', icon: '⭐', category: 'all-rounder' },
      { value: 'ar-bowl-sla', label: 'Bowling All-Rounder (Left-Arm Orthodox)', shortLabel: 'BOAR-SLA', icon: '⭐', category: 'all-rounder' },
    ]
  }
];

// Flat list of all roles for easy lookup
export const ALL_ROLES: RoleOption[] = PLAYER_CATEGORIES.flatMap(cat => cat.roles);

// Get role by value
export function getRoleByValue(value: string | undefined): RoleOption | undefined {
  if (!value) return undefined;
  return ALL_ROLES.find(role => role.value === value);
}

// Get role label by value
export function getRoleLabel(value: string | undefined): string {
  const role = getRoleByValue(value);
  return role?.label || 'Unknown';
}

// Get role short label by value
export function getRoleShortLabel(value: string | undefined): string {
  const role = getRoleByValue(value);
  return role?.shortLabel || '-';
}

// Get role icon by value
export function getRoleIcon(value: string | undefined): string {
  const role = getRoleByValue(value);
  return role?.icon || '🏃';
}

// Get category icon by role value
export function getCategoryIcon(value: string | undefined): string {
  if (!value) return '🏃';
  const role = getRoleByValue(value);
  if (!role) return '🏃';
  const category = PLAYER_CATEGORIES.find(cat => cat.id === role.category || cat.roles.some(r => r.value === value));
  return category?.icon || '🏃';
}

// Batting hand options (for additional details)
export const BATTING_HAND = [
  { value: 'right', label: 'Right-Handed' },
  { value: 'left', label: 'Left-Handed' },
];

// Bowling arm options (for additional details)
export const BOWLING_ARM = [
  { value: 'right', label: 'Right-Arm' },
  { value: 'left', label: 'Left-Arm' },
];

// Legacy role mapping for backward compatibility
export const LEGACY_ROLE_MAP: Record<string, string> = {
  'batsman': 'bat-rh',
  'bowler': 'bowl-rfm',
  'all-rounder': 'ar-bat-rm',
  'wicket-keeper': 'wk-rh',
};

// Convert legacy role to new format
export function convertLegacyRole(legacyRole: string | undefined): string | undefined {
  if (!legacyRole) return undefined;
  return LEGACY_ROLE_MAP[legacyRole] || legacyRole;
}
