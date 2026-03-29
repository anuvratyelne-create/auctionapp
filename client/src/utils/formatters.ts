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
 * Format large numbers with Indian suffix (L for Lakhs, Cr for Crores)
 * Examples:
 * 50000 -> 50K
 * 100000 -> 1L
 * 1000000 -> 10L
 * 10000000 -> 1Cr
 */
export function formatCompactIndian(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) {
    // Crores
    const crores = absNum / 10000000;
    return sign + (crores % 1 === 0 ? crores.toFixed(0) : crores.toFixed(1)) + ' Cr';
  } else if (absNum >= 100000) {
    // Lakhs
    const lakhs = absNum / 100000;
    return sign + (lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)) + ' L';
  } else if (absNum >= 1000) {
    // Thousands - show full Indian format for better clarity
    return sign + formatIndianNumber(absNum);
  }

  return sign + absNum.toString();
}
