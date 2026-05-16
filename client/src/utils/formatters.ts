/**
 * Format number in Indian numbering system (lakhs, crores)
 * Examples:
 * 1000 -> 1,000
 * 10000 -> 10,000
 * 100000 -> 1,00,000
 * 1000000 -> 10,00,000
 * 10000000 -> 1,00,00,000
 */
export function formatIndianNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';

  const numStr = Math.abs(Math.round(num)).toString();
  const sign = num < 0 ? '-' : '';

  if (numStr.length <= 3) {
    return sign + numStr;
  }

  // Last 3 digits
  let result = numStr.slice(-3);
  let remaining = numStr.slice(0, -3);

  // Add commas every 2 digits for the remaining part
  while (remaining.length > 0) {
    const chunk = remaining.slice(-2);
    remaining = remaining.slice(0, -2);
    result = chunk + ',' + result;
  }

  // Remove leading comma if present
  if (result.startsWith(',')) {
    result = result.slice(1);
  }

  return sign + result;
}

/**
 * Format currency with Indian numbering and optional suffix
 * Examples:
 * 50000 -> ₹50,000
 * 100000 -> ₹1,00,000
 */
export function formatIndianCurrency(num: number | undefined | null, showSymbol = true): string {
  const formatted = formatIndianNumber(num);
  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format points with Indian numbering
 * Examples:
 * 50000 -> 50,000 pts
 * 100000 -> 1,00,000 pts
 */
export function formatPoints(num: number | undefined | null, showSuffix = true): string {
  const formatted = formatIndianNumber(num);
  return showSuffix ? `${formatted} pts` : formatted;
}

/**
 * Format amount with currency symbol or points suffix based on display mode
 * Examples (usePoints = false):
 * 100000 -> ₹1,00,000
 * Examples (usePoints = true):
 * 100000 -> 1,00,000 pts
 */
export function formatAmount(num: number | undefined | null, usePoints: boolean = false): string {
  const formatted = formatIndianNumber(num);
  return usePoints ? `${formatted} pts` : `₹${formatted}`;
}

/**
 * Format large numbers with Indian suffix (L for Lakhs, Cr for Crores)
 * Examples:
 * 50000 -> 50K
 * 100000 -> 1L
 * 1000000 -> 10L
 * 10000000 -> 1 Cr
 * 26000000 -> 2.60 Cr
 */
export function formatCompactIndian(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) {
    // Crores (1 Cr = 10,000,000)
    const crores = absNum / 10000000;
    // Show 2 decimal places for precision, trim trailing zeros
    const formatted = crores.toFixed(2).replace(/\.?0+$/, '');
    return sign + formatted + ' Cr';
  } else if (absNum >= 100000) {
    // Lakhs (1 L = 100,000)
    const lakhs = absNum / 100000;
    const formatted = lakhs.toFixed(2).replace(/\.?0+$/, '');
    return sign + formatted + ' L';
  } else if (absNum >= 1000) {
    // Thousands - show full Indian format for better clarity
    return sign + formatIndianNumber(absNum);
  }

  return sign + absNum.toString();
}

/**
 * Format amount with compact notation and currency/points
 * Uses compact format (Cr, L) for large numbers to save space
 * Examples (usePoints = false):
 * 26000000 -> ₹2.60 Cr
 * 500000 -> ₹5 L
 * 50000 -> ₹50,000
 * Examples (usePoints = true):
 * 26000000 -> 2.60 Cr pts
 * 500000 -> 5 L pts
 */
export function formatAmountCompact(num: number | undefined | null, usePoints: boolean = false): string {
  if (num === undefined || num === null) return usePoints ? '0 pts' : '₹0';

  const absNum = Math.abs(num);

  // Use compact format for lakhs and above
  if (absNum >= 100000) {
    const compact = formatCompactIndian(num);
    return usePoints ? `${compact} pts` : `₹${compact}`;
  }

  // Use regular format for smaller amounts
  return formatAmount(num, usePoints);
}
