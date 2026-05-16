// Budget Presets Configuration
// Defines different auction budget levels with scaled category prices and bid increments

export interface BudgetPreset {
  id: string;
  name: string;
  description: string;
  teamBudget: number;
  categories: {
    platinum: number;
    gold: number;
    silver: number;
    bronze: number;
  };
  bidIncrements: {
    tier1: { threshold: number; increment: number }; // Below this threshold
    tier2: { threshold: number; increment: number };
    tier3: { threshold: number; increment: number };
    tier4: { threshold: number; increment: number }; // Above tier3 threshold
  };
  baseBid: number; // Default starting bid
}

export const budgetPresets: BudgetPreset[] = [
  {
    id: 'ipl-style',
    name: 'IPL Style',
    description: '₹100 Crore budget - Professional leagues',
    teamBudget: 1000000000, // 100 Crore
    categories: {
      platinum: 50000000,  // 5 Crore
      gold: 30000000,      // 3 Crore
      silver: 20000000,    // 2 Crore
      bronze: 10000000,    // 1 Crore
    },
    bidIncrements: {
      tier1: { threshold: 20000000, increment: 1000000 },   // <2Cr: +10L
      tier2: { threshold: 30000000, increment: 2000000 },   // 2-3Cr: +20L
      tier3: { threshold: 50000000, increment: 3000000 },   // 3-5Cr: +30L
      tier4: { threshold: Infinity, increment: 5000000 },   // >5Cr: +50L
    },
    baseBid: 10000000, // 1 Crore
  },
  {
    id: 'pro-league',
    name: 'Pro League',
    description: '₹10 Crore budget - Semi-professional',
    teamBudget: 100000000, // 10 Crore
    categories: {
      platinum: 5000000,   // 50 Lakh
      gold: 3000000,       // 30 Lakh
      silver: 2000000,     // 20 Lakh
      bronze: 1000000,     // 10 Lakh
    },
    bidIncrements: {
      tier1: { threshold: 2000000, increment: 100000 },    // <20L: +1L
      tier2: { threshold: 3000000, increment: 200000 },    // 20-30L: +2L
      tier3: { threshold: 5000000, increment: 300000 },    // 30-50L: +3L
      tier4: { threshold: Infinity, increment: 500000 },   // >50L: +5L
    },
    baseBid: 1000000, // 10 Lakh
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: '₹1 Crore budget - Corporate tournaments',
    teamBudget: 10000000, // 1 Crore (100 Lakh)
    categories: {
      platinum: 500000,    // 5 Lakh
      gold: 300000,        // 3 Lakh
      silver: 200000,      // 2 Lakh
      bronze: 100000,      // 1 Lakh
    },
    bidIncrements: {
      tier1: { threshold: 200000, increment: 10000 },      // <2L: +10k
      tier2: { threshold: 300000, increment: 20000 },      // 2-3L: +20k
      tier3: { threshold: 500000, increment: 30000 },      // 3-5L: +30k
      tier4: { threshold: Infinity, increment: 50000 },    // >5L: +50k
    },
    baseBid: 100000, // 1 Lakh
  },
  {
    id: 'standard',
    name: 'Standard',
    description: '₹10 Lakh budget - College/Club level',
    teamBudget: 1000000, // 10 Lakh
    categories: {
      platinum: 50000,     // 50k
      gold: 30000,         // 30k
      silver: 20000,       // 20k
      bronze: 10000,       // 10k
    },
    bidIncrements: {
      tier1: { threshold: 20000, increment: 1000 },        // <20k: +1k
      tier2: { threshold: 30000, increment: 2000 },        // 20-30k: +2k
      tier3: { threshold: 50000, increment: 3000 },        // 30-50k: +3k
      tier4: { threshold: Infinity, increment: 5000 },     // >50k: +5k
    },
    baseBid: 10000, // 10k
  },
  {
    id: 'casual',
    name: 'Casual',
    description: '₹1 Lakh budget - Friendly auctions',
    teamBudget: 100000, // 1 Lakh
    categories: {
      platinum: 5000,      // 5k
      gold: 3000,          // 3k
      silver: 2000,        // 2k
      bronze: 1000,        // 1k
    },
    bidIncrements: {
      tier1: { threshold: 2000, increment: 100 },          // <2k: +100
      tier2: { threshold: 3000, increment: 200 },          // 2-3k: +200
      tier3: { threshold: 5000, increment: 300 },          // 3-5k: +300
      tier4: { threshold: Infinity, increment: 500 },      // >5k: +500
    },
    baseBid: 1000, // 1k
  },
  {
    id: 'mini',
    name: 'Mini',
    description: '₹10,000 budget - Demo/Practice',
    teamBudget: 10000, // 10k
    categories: {
      platinum: 500,
      gold: 300,
      silver: 200,
      bronze: 100,
    },
    bidIncrements: {
      tier1: { threshold: 200, increment: 10 },
      tier2: { threshold: 300, increment: 20 },
      tier3: { threshold: 500, increment: 30 },
      tier4: { threshold: Infinity, increment: 50 },
    },
    baseBid: 100,
  },
];

// Default preset
export const defaultPresetId = 'standard';

// Get preset by ID
export function getPreset(id: string): BudgetPreset | undefined {
  return budgetPresets.find(p => p.id === id);
}

// Get preset by budget (finds closest match)
export function getPresetByBudget(budget: number): BudgetPreset | undefined {
  // Find exact match first
  const exact = budgetPresets.find(p => p.teamBudget === budget);
  if (exact) return exact;

  // Find closest
  return budgetPresets.reduce((closest, preset) => {
    const closestDiff = Math.abs(closest.teamBudget - budget);
    const presetDiff = Math.abs(preset.teamBudget - budget);
    return presetDiff < closestDiff ? preset : closest;
  });
}

// Format currency in Indian style (Rupees or Points)
export function formatBudgetLabel(amount: number, usePoints: boolean = false): string {
  if (amount >= 10000000) {
    // Crores
    const crores = amount / 10000000;
    const value = crores % 1 === 0 ? crores : crores.toFixed(1);
    return usePoints ? `${value} Cr pts` : `₹${value} Crore`;
  } else if (amount >= 100000) {
    // Lakhs
    const lakhs = amount / 100000;
    const value = lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1);
    return usePoints ? `${value} L pts` : `₹${value} Lakh`;
  } else if (amount >= 1000) {
    // Thousands
    const thousands = amount / 1000;
    const value = thousands % 1 === 0 ? thousands : thousands.toFixed(1);
    return usePoints ? `${value}k pts` : `₹${value}k`;
  }
  return usePoints ? `${amount} pts` : `₹${amount}`;
}

// Get bid increment for a given bid amount and preset
export function getBidIncrementForPreset(currentBid: number, preset: BudgetPreset): number {
  const { bidIncrements } = preset;

  if (currentBid < bidIncrements.tier1.threshold) {
    return bidIncrements.tier1.increment;
  } else if (currentBid < bidIncrements.tier2.threshold) {
    return bidIncrements.tier2.increment;
  } else if (currentBid < bidIncrements.tier3.threshold) {
    return bidIncrements.tier3.increment;
  }
  return bidIncrements.tier4.increment;
}

// Get bid increment based on team budget - auto-detects preset
export function getBidIncrement(currentBid: number, teamBudget?: number): number {
  // Default to standard preset if no budget provided
  if (!teamBudget) {
    const standardPreset = getPreset('standard');
    return standardPreset ? getBidIncrementForPreset(currentBid, standardPreset) : 5000;
  }

  const preset = getPresetByBudget(teamBudget);
  if (!preset) {
    // Fallback to percentage-based increment (1% of current bid, rounded)
    const percentIncrement = Math.ceil(currentBid * 0.01);
    // Round to nice numbers
    if (percentIncrement >= 1000000) return Math.ceil(percentIncrement / 100000) * 100000;
    if (percentIncrement >= 100000) return Math.ceil(percentIncrement / 10000) * 10000;
    if (percentIncrement >= 10000) return Math.ceil(percentIncrement / 1000) * 1000;
    if (percentIncrement >= 1000) return Math.ceil(percentIncrement / 100) * 100;
    return Math.ceil(percentIncrement / 10) * 10;
  }

  return getBidIncrementForPreset(currentBid, preset);
}

// Format increment for display (e.g., "+₹10L" or "+₹5k")
export function formatIncrement(increment: number): string {
  if (increment >= 10000000) {
    const crores = increment / 10000000;
    return `+₹${crores % 1 === 0 ? crores : crores.toFixed(1)}Cr`;
  } else if (increment >= 100000) {
    const lakhs = increment / 100000;
    return `+₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)}L`;
  } else if (increment >= 1000) {
    const thousands = increment / 1000;
    return `+₹${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}k`;
  }
  return `+₹${increment}`;
}
