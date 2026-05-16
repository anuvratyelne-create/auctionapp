/**
 * Converts various Google Drive URL formats to direct download/view URLs
 *
 * Input patterns supported:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 *
 * Output:
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 */

const GOOGLE_DRIVE_FILE_PATTERN = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
const GOOGLE_DRIVE_OPEN_PATTERN = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
const GOOGLE_DRIVE_UC_PATTERN = /drive\.google\.com\/uc\?(?:export=\w+&)?id=([a-zA-Z0-9_-]+)/;

/**
 * Extracts the file ID from a Google Drive URL
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;

  // Try file/d/ pattern
  let match = url.match(GOOGLE_DRIVE_FILE_PATTERN);
  if (match) return match[1];

  // Try open?id= pattern
  match = url.match(GOOGLE_DRIVE_OPEN_PATTERN);
  if (match) return match[1];

  // Try uc?id= pattern
  match = url.match(GOOGLE_DRIVE_UC_PATTERN);
  if (match) return match[1];

  return null;
}

/**
 * Checks if a URL is a Google Drive URL
 */
export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com');
}

/**
 * Converts a Google Drive URL to a direct viewable URL
 * Returns the original URL if it's not a Google Drive URL or if conversion fails
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return url;

  // If not a Google Drive URL, return as-is
  if (!isGoogleDriveUrl(url)) return url;

  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return url;

  // Use lh3.googleusercontent.com - most reliable for embedding
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Process a photo URL - converts Google Drive URLs to direct URLs
 * Also handles empty strings and trims whitespace
 */
export function processPhotoUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  return convertGoogleDriveUrl(trimmed);
}
