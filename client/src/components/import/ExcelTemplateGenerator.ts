import ExcelJS from 'exceljs';
import { Category } from '../../types';
import { ALL_ROLES } from '../../config/playerRoles';

// Batting style options
const BATTING_STYLES = ['Right-Handed', 'Left-Handed'];

// Bowling style options
const BOWLING_STYLES = [
  'Right-Arm Fast',
  'Right-Arm Fast Medium',
  'Right-Arm Medium Fast',
  'Right-Arm Medium',
  'Left-Arm Fast',
  'Left-Arm Fast Medium',
  'Left-Arm Medium',
  'Off Spin',
  'Leg Spin',
  'Left-Arm Orthodox',
  'Left-Arm Chinaman',
];

/**
 * Generates an Excel template with dropdown validations for bulk player import
 */
export async function generateExcelTemplate(categories: Category[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Auction App';
  workbook.created = new Date();

  // Create main data sheet
  const dataSheet = workbook.addWorksheet('Players', {
    properties: { tabColor: { argb: '4CAF50' } },
  });

  // Define columns
  dataSheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Jersey Number', key: 'jersey_number', width: 15 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Base Price', key: 'base_price', width: 15 },
    { header: 'Role', key: 'role', width: 35 },
    { header: 'Photo URL', key: 'photo_url', width: 45 },
    { header: 'City', key: 'city', width: 18 },
    { header: 'Age', key: 'age', width: 10 },
    { header: 'Batting Style', key: 'batting_style', width: 18 },
    { header: 'Bowling Style', key: 'bowling_style', width: 22 },
  ];

  // Style header row
  const headerRow = dataSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '2563EB' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  // Add column type indicators in row 2 (hidden helper row for users)
  const typeRow = dataSheet.getRow(2);
  typeRow.values = [
    'Required',
    'Optional',
    'Dropdown',
    'Optional (Number)',
    'Dropdown',
    'Optional (URL)',
    'Optional',
    'Optional (Number)',
    'Dropdown',
    'Dropdown',
  ];
  typeRow.font = { italic: true, color: { argb: '888888' }, size: 10 };
  typeRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F3F4F6' },
  };

  // Create category names list for dropdown
  const categoryNames = categories.map(c => c.name);

  // Create role labels list for dropdown (using label for display)
  const roleLabels = ALL_ROLES.map(r => `${r.label} (${r.shortLabel})`).slice(0, 20);

  // Create a hidden Lookup sheet for dropdown values (better compatibility)
  const lookupSheet = workbook.addWorksheet('_Lookup', {
    state: 'veryHidden', // Hide from users
  });

  // Populate lookup sheet with values
  // Column A: Categories
  categoryNames.forEach((cat, idx) => {
    lookupSheet.getCell(`A${idx + 1}`).value = cat;
  });

  // Column B: Roles
  roleLabels.forEach((role, idx) => {
    lookupSheet.getCell(`B${idx + 1}`).value = role;
  });

  // Column C: Batting Styles
  BATTING_STYLES.forEach((style, idx) => {
    lookupSheet.getCell(`C${idx + 1}`).value = style;
  });

  // Column D: Bowling Styles
  BOWLING_STYLES.forEach((style, idx) => {
    lookupSheet.getCell(`D${idx + 1}`).value = style;
  });

  // Add data validation using direct list (most compatible method)
  const maxDataRows = 500;

  // Apply validations to each row
  for (let row = 3; row <= maxDataRows; row++) {
    // Category dropdown (Column C)
    if (categoryNames.length > 0) {
      dataSheet.getCell(`C${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${categoryNames.join(',')}"`],
      };
    }

    // Role dropdown (Column E)
    dataSheet.getCell(`E${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${roleLabels.join(',')}"`],
    };

    // Batting Style dropdown (Column I)
    dataSheet.getCell(`I${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${BATTING_STYLES.join(',')}"`],
    };

    // Bowling Style dropdown (Column J)
    dataSheet.getCell(`J${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${BOWLING_STYLES.join(',')}"`],
    };
  }

  // Pre-create rows with formatting so Numbers/Excel recognizes them
  // This ensures dropdowns work on all 200 rows
  for (let row = 3; row <= maxDataRows && row <= 200; row++) {
    const dataRow = dataSheet.getRow(row);
    dataRow.height = 20; // Set explicit height
    // Add alternating row background for better UX
    if (row % 2 === 0) {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FAFAFA' }, // Very light gray
      };
    }
  }

  // Freeze header and type indicator rows
  dataSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  // Create Instructions sheet
  const instructionsSheet = workbook.addWorksheet('Instructions', {
    properties: { tabColor: { argb: 'FFC107' } },
  });

  // Set column width for instructions
  instructionsSheet.getColumn(1).width = 80;

  const instructions = [
    { text: 'Player Import Template - Instructions', style: 'title' },
    { text: '', style: 'normal' },
    { text: 'REQUIRED COLUMNS:', style: 'header' },
    { text: '  - Name: Player full name (required)', style: 'normal' },
    { text: '', style: 'normal' },
    { text: 'OPTIONAL COLUMNS:', style: 'header' },
    { text: '  - Jersey Number: Used for matching existing players (for updates)', style: 'normal' },
    { text: '  - Category: Select from dropdown. Uses first category if not specified.', style: 'normal' },
    { text: '  - Base Price: Number. Uses category default if not specified.', style: 'normal' },
    { text: '  - Role: Select from dropdown (e.g., Right-Handed Batsman)', style: 'normal' },
    { text: '  - Photo URL: Direct image URL or Google Drive share link', style: 'normal' },
    { text: '  - City: Player hometown', style: 'normal' },
    { text: '  - Age: Player age (number)', style: 'normal' },
    { text: '  - Batting Style: Right-Handed or Left-Handed', style: 'normal' },
    { text: '  - Bowling Style: Fast, Medium, Spin, etc.', style: 'normal' },
    { text: '', style: 'normal' },
    { text: 'IMPORT BEHAVIOR:', style: 'header' },
    { text: '  - New players are CREATED if no match is found', style: 'normal' },
    { text: '  - Existing players are UPDATED if matched by:', style: 'normal' },
    { text: '      1. Name (case-insensitive exact match)', style: 'normal' },
    { text: '      2. Jersey Number (exact match)', style: 'normal' },
    { text: '', style: 'normal' },
    { text: 'TIPS:', style: 'header' },
    { text: '  - Delete the sample rows (highlighted yellow) before importing', style: 'normal' },
    { text: '  - Use dropdowns where available for correct values', style: 'normal' },
    { text: '  - Google Drive links are auto-converted to viewable URLs', style: 'normal' },
    { text: '  - You can import unlimited players at once', style: 'normal' },
    { text: '  - Preview your import before confirming', style: 'normal' },
    { text: '', style: 'normal' },
    { text: 'AVAILABLE CATEGORIES:', style: 'header' },
    ...categories.map(c => ({ text: `  - ${c.name} (Base: ${c.base_price.toLocaleString()} pts)`, style: 'normal' })),
  ];

  instructions.forEach((item, idx) => {
    const row = instructionsSheet.getRow(idx + 1);
    const cell = row.getCell(1);
    cell.value = item.text;

    if (item.style === 'title') {
      cell.font = { bold: true, size: 16, color: { argb: '2563EB' } };
      row.height = 30;
    } else if (item.style === 'header') {
      cell.font = { bold: true, size: 12, color: { argb: '059669' } };
    } else {
      cell.font = { size: 11 };
    }
  });

  // Generate buffer and create blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Downloads the template file
 */
export async function downloadExcelTemplate(categories: Category[]): Promise<void> {
  const blob = await generateExcelTemplate(categories);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'players_import_template.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
