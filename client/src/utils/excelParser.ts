import * as XLSX from 'xlsx';
import { processPhotoUrl } from './googleDriveUrl';
import { Category } from '../types';
import { ALL_ROLES, LEGACY_ROLE_MAP } from '../config/playerRoles';

export interface ParsedExcelPlayer {
  rowNumber: number;
  name: string;
  jersey_number?: string;
  category_name?: string;
  category_id?: string;
  base_price?: number;
  photo_url?: string;
  role?: string;
  city?: string;
  age?: number;
  batting_style?: string;
  bowling_style?: string;
  isValid: boolean;
  errors: string[];
  // For upsert matching
  matchedPlayerId?: string;
  isUpdate: boolean;
}

// Column name aliases - maps various possible column names to standard field names
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['name', 'player name', 'player', 'fullname', 'full name', 'playername'],
  jersey_number: ['jersey', 'jersey number', 'jersey_number', 'number', 'shirt number', 'no', 'no.', 'jersey no', 'jersey no.'],
  category: ['category', 'category name', 'category_name', 'tier', 'level', 'grade'],
  base_price: ['price', 'base price', 'base_price', 'baseprice', 'amount', 'base', 'starting price'],
  photo_url: ['photo', 'photo url', 'photo_url', 'image', 'image url', 'picture', 'pic', 'avatar', 'img'],
  role: ['role', 'position', 'type', 'player role', 'player type', 'specialization'],
  city: ['city', 'hometown', 'home town', 'location', 'place', 'origin'],
  age: ['age', 'years', 'player age'],
  batting_style: ['batting', 'batting style', 'batting_style', 'bat', 'bat style', 'bats'],
  bowling_style: ['bowling', 'bowling style', 'bowling_style', 'bowl', 'bowl style', 'bowls'],
};

// Batting style aliases
const BATTING_STYLE_ALIASES: Record<string, string> = {
  'right': 'Right-Handed',
  'right-handed': 'Right-Handed',
  'right handed': 'Right-Handed',
  'rh': 'Right-Handed',
  'rhb': 'Right-Handed',
  'left': 'Left-Handed',
  'left-handed': 'Left-Handed',
  'left handed': 'Left-Handed',
  'lh': 'Left-Handed',
  'lhb': 'Left-Handed',
};

// Bowling style aliases
const BOWLING_STYLE_ALIASES: Record<string, string> = {
  'right-arm fast': 'Right-Arm Fast',
  'right arm fast': 'Right-Arm Fast',
  'rf': 'Right-Arm Fast',
  'fast': 'Right-Arm Fast',
  'right-arm medium': 'Right-Arm Medium',
  'right arm medium': 'Right-Arm Medium',
  'rm': 'Right-Arm Medium',
  'medium': 'Right-Arm Medium',
  'right-arm fast-medium': 'Right-Arm Fast Medium',
  'right arm fast medium': 'Right-Arm Fast Medium',
  'rfm': 'Right-Arm Fast Medium',
  'left-arm fast': 'Left-Arm Fast',
  'left arm fast': 'Left-Arm Fast',
  'lf': 'Left-Arm Fast',
  'left-arm medium': 'Left-Arm Medium',
  'left arm medium': 'Left-Arm Medium',
  'lm': 'Left-Arm Medium',
  'off spin': 'Off Spin',
  'off-spin': 'Off Spin',
  'offspin': 'Off Spin',
  'ob': 'Off Spin',
  'leg spin': 'Leg Spin',
  'leg-spin': 'Leg Spin',
  'legspin': 'Leg Spin',
  'lb': 'Leg Spin',
  'left-arm orthodox': 'Left-Arm Orthodox',
  'left arm orthodox': 'Left-Arm Orthodox',
  'sla': 'Left-Arm Orthodox',
  'slow left arm': 'Left-Arm Orthodox',
  'chinaman': 'Left-Arm Chinaman',
  'lc': 'Left-Arm Chinaman',
};

/**
 * Finds a column index by checking against multiple aliases
 */
function findColumnIndex(headers: string[], fieldName: string): number {
  const aliases = COLUMN_ALIASES[fieldName] || [fieldName];
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (aliases.includes(normalized)) {
      return headers.indexOf(header);
    }
  }
  return -1;
}

/**
 * Normalizes a role value to match the system's role codes
 */
function normalizeRole(roleValue: string | undefined): string | undefined {
  if (!roleValue) return undefined;

  const normalized = roleValue.toLowerCase().trim();

  // Check legacy role mapping first
  if (LEGACY_ROLE_MAP[normalized]) {
    return LEGACY_ROLE_MAP[normalized];
  }

  // Check if it's already a valid role value
  const exactMatch = ALL_ROLES.find(r => r.value.toLowerCase() === normalized);
  if (exactMatch) return exactMatch.value;

  // Check against role labels and short labels
  const labelMatch = ALL_ROLES.find(
    r => r.label.toLowerCase() === normalized || r.shortLabel.toLowerCase() === normalized
  );
  if (labelMatch) return labelMatch.value;

  // Check for template format: "Label (ShortLabel)" e.g., "Right-Handed Batsman (RHB)"
  const templateFormatMatch = roleValue.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (templateFormatMatch) {
    const label = templateFormatMatch[1].trim().toLowerCase();
    const shortLabel = templateFormatMatch[2].trim().toLowerCase();

    // Try to match by label first
    const matchByLabel = ALL_ROLES.find(r => r.label.toLowerCase() === label);
    if (matchByLabel) return matchByLabel.value;

    // Try to match by short label
    const matchByShort = ALL_ROLES.find(r => r.shortLabel.toLowerCase() === shortLabel);
    if (matchByShort) return matchByShort.value;
  }

  // Return original if no match (might be a custom role)
  return roleValue;
}

/**
 * Normalizes batting style
 */
function normalizeBattingStyle(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  return BATTING_STYLE_ALIASES[normalized] || value;
}

/**
 * Normalizes bowling style
 */
function normalizeBowlingStyle(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  return BOWLING_STYLE_ALIASES[normalized] || value;
}

/**
 * Parse an Excel file and extract player data
 */
export function parseExcelFile(
  buffer: ArrayBuffer,
  categories: Category[],
  existingPlayers?: Array<{ id: string; name: string; jersey_number?: string }>
): ParsedExcelPlayer[] {
  // Convert ArrayBuffer to Uint8Array for xlsx library
  const uint8Array = new Uint8Array(buffer);
  const workbook = XLSX.read(uint8Array, { type: 'array' });

  // Get the first sheet (skip instruction sheets)
  let sheetName = workbook.SheetNames.find(
    name => !name.toLowerCase().includes('instruction') && !name.toLowerCase().includes('help')
  );
  if (!sheetName) {
    sheetName = workbook.SheetNames[0];
  }

  const sheet = workbook.Sheets[sheetName];

  // Force reading the full range of the sheet (fixes Numbers/Mac gaps issue)
  // Get the sheet range and decode it to find the actual extent of data
  let range = sheet['!ref'];
  if (range) {
    // Decode the range to get start and end cells
    const decoded = XLSX.utils.decode_range(range);
    // Extend the range to ensure we read all rows (Numbers sometimes has gaps)
    // Read up to 1000 extra rows to catch any data after gaps
    decoded.e.r = Math.max(decoded.e.r, decoded.e.r + 100);
    range = XLSX.utils.encode_range(decoded);
  }

  const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    header: 1,
    defval: '',
    range: range // Use extended range
  });

  // Filter out completely empty rows at the end
  let lastNonEmptyRow = data.length - 1;
  while (lastNonEmptyRow > 0) {
    const row = data[lastNonEmptyRow] as any[];
    if (row && row.some(cell => cell !== '' && cell !== null && cell !== undefined)) {
      break;
    }
    lastNonEmptyRow--;
  }
  const trimmedData = data.slice(0, lastNonEmptyRow + 1);

  if (trimmedData.length < 2) {
    throw new Error('Excel file must have at least a header row and one data row');
  }

  // Use trimmedData instead of data for parsing
  const dataToProcess = trimmedData;

  // Get headers from first row
  const headers = (dataToProcess[0] as string[]).map(h => String(h || '').trim());

  // Find column indices
  const nameIdx = findColumnIndex(headers, 'name');
  const jerseyIdx = findColumnIndex(headers, 'jersey_number');
  const categoryIdx = findColumnIndex(headers, 'category');
  const priceIdx = findColumnIndex(headers, 'base_price');
  const photoIdx = findColumnIndex(headers, 'photo_url');
  const roleIdx = findColumnIndex(headers, 'role');
  const cityIdx = findColumnIndex(headers, 'city');
  const ageIdx = findColumnIndex(headers, 'age');
  const battingIdx = findColumnIndex(headers, 'batting_style');
  const bowlingIdx = findColumnIndex(headers, 'bowling_style');

  if (nameIdx === -1) {
    throw new Error('Excel file must have a "Name" column');
  }

  // Create lookup maps for existing players
  const existingByName = new Map<string, { id: string; name: string; jersey_number?: string }>();
  const existingByJersey = new Map<string, { id: string; name: string; jersey_number?: string }>();

  if (existingPlayers) {
    for (const player of existingPlayers) {
      existingByName.set(player.name.toLowerCase().trim(), player);
      if (player.jersey_number) {
        existingByJersey.set(player.jersey_number.trim(), player);
      }
    }
  }

  const players: ParsedExcelPlayer[] = [];

  // Parse data rows (skip header)
  for (let i = 1; i < dataToProcess.length; i++) {
    const row = dataToProcess[i] as any[];
    if (!row || row.length === 0) continue;

    // Skip type indicator rows (from template - contains "Required", "Optional", "Dropdown")
    const firstCell = String(row[0] || '').trim().toLowerCase();
    if (firstCell === 'required' || firstCell === 'optional' || firstCell === 'dropdown') {
      continue;
    }

    // Get values
    const name = String(row[nameIdx] || '').trim();
    const jerseyNumber = jerseyIdx >= 0 ? String(row[jerseyIdx] || '').trim() : undefined;
    const categoryName = categoryIdx >= 0 ? String(row[categoryIdx] || '').trim() : undefined;
    const basePriceRaw = priceIdx >= 0 ? row[priceIdx] : undefined;
    const photoUrl = photoIdx >= 0 ? String(row[photoIdx] || '').trim() : undefined;
    const roleRaw = roleIdx >= 0 ? String(row[roleIdx] || '').trim() : undefined;
    const city = cityIdx >= 0 ? String(row[cityIdx] || '').trim() : undefined;
    const ageRaw = ageIdx >= 0 ? row[ageIdx] : undefined;
    const battingRaw = battingIdx >= 0 ? String(row[battingIdx] || '').trim() : undefined;
    const bowlingRaw = bowlingIdx >= 0 ? String(row[bowlingIdx] || '').trim() : undefined;

    // Skip completely empty rows
    if (!name && !jerseyNumber) continue;

    const errors: string[] = [];
    let categoryId: string | undefined;
    let basePrice: number | undefined;
    let age: number | undefined;

    // Validate name
    if (!name) {
      errors.push('Name is required');
    }

    // Match category
    let resolvedCategoryName = categoryName;
    if (categoryName) {
      const matchedCategory = categories.find(
        c => c.name.toLowerCase().trim() === categoryName.toLowerCase().trim()
      );
      if (matchedCategory) {
        categoryId = matchedCategory.id;
        resolvedCategoryName = matchedCategory.name;
      } else {
        errors.push(`Category "${categoryName}" not found`);
      }
    } else if (categories.length > 0) {
      // Default to first category if none specified
      categoryId = categories[0].id;
      resolvedCategoryName = categories[0].name;
    } else {
      errors.push('No category available');
    }

    // Parse base price
    if (basePriceRaw !== undefined && basePriceRaw !== '') {
      const priceStr = String(basePriceRaw).replace(/[^0-9.-]/g, '');
      basePrice = parseInt(priceStr, 10);
      if (isNaN(basePrice) || basePrice < 0) {
        errors.push('Invalid base price');
        basePrice = undefined;
      }
    }

    // Parse age
    if (ageRaw !== undefined && ageRaw !== '') {
      age = parseInt(String(ageRaw), 10);
      if (isNaN(age) || age < 0 || age > 120) {
        errors.push('Invalid age');
        age = undefined;
      }
    }

    // Normalize role
    const role = normalizeRole(roleRaw);

    // Normalize styles
    const battingStyle = normalizeBattingStyle(battingRaw);
    const bowlingStyle = normalizeBowlingStyle(bowlingRaw);

    // Process photo URL (convert Google Drive URLs)
    const processedPhotoUrl = processPhotoUrl(photoUrl);

    // Check for existing player match (for upsert)
    let matchedPlayer: { id: string; name: string; jersey_number?: string } | undefined;
    let isUpdate = false;

    if (existingPlayers) {
      // First try to match by name (case-insensitive)
      if (name) {
        matchedPlayer = existingByName.get(name.toLowerCase().trim());
      }

      // If no match by name, try jersey number
      if (!matchedPlayer && jerseyNumber) {
        matchedPlayer = existingByJersey.get(jerseyNumber);
      }

      isUpdate = !!matchedPlayer;
    }

    players.push({
      rowNumber: i + 1, // 1-indexed for user display
      name,
      jersey_number: jerseyNumber || undefined,
      category_name: resolvedCategoryName,
      category_id: categoryId,
      base_price: basePrice,
      photo_url: processedPhotoUrl,
      role,
      city: city || undefined,
      age,
      batting_style: battingStyle,
      bowling_style: bowlingStyle,
      isValid: errors.length === 0 && !!name && !!categoryId,
      errors,
      matchedPlayerId: matchedPlayer?.id,
      isUpdate,
    });
  }

  return players;
}

/**
 * Get validation summary for parsed players
 */
export function getParseValidationSummary(players: ParsedExcelPlayer[]): {
  total: number;
  valid: number;
  invalid: number;
  newPlayers: number;
  updates: number;
} {
  const valid = players.filter(p => p.isValid);
  return {
    total: players.length,
    valid: valid.length,
    invalid: players.length - valid.length,
    newPlayers: valid.filter(p => !p.isUpdate).length,
    updates: valid.filter(p => p.isUpdate).length,
  };
}
