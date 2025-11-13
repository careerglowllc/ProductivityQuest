/**
 * Shared utility functions for Notion integration
 */

/**
 * Extracts the 32-character database/page ID from a Notion URL or returns the ID if already in correct format
 * Supports various Notion URL formats:
 * - https://www.notion.so/Database-Name-32chars
 * - https://www.notion.so/workspace/32chars?v=...
 * - Just the 32-character ID with or without hyphens
 * 
 * @param input - Full Notion URL or database ID
 * @returns 32-character database ID without hyphens
 * @throws Error if no valid ID can be extracted
 */
export function extractNotionDatabaseId(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input: must be a non-empty string');
  }

  // Remove whitespace
  const trimmed = input.trim();

  // Check if it's already a 32-character ID (with or without hyphens)
  const idWithoutHyphens = trimmed.replace(/-/g, '');
  if (/^[a-f0-9]{32}$/i.test(idWithoutHyphens)) {
    return idWithoutHyphens;
  }

  // Try to extract from URL using regex
  // Matches 32 consecutive hex characters (the format Notion uses in URLs)
  const match = trimmed.match(/([a-f0-9]{32})(?:[?#]|$)/i);
  if (match && match[1]) {
    return match[1];
  }

  // If no match found, throw descriptive error
  throw new Error(
    'Invalid Notion database ID or URL. Please provide either:\n' +
    '- A full Notion database URL (e.g., https://www.notion.so/Database-Name-32chars)\n' +
    '- A 32-character database ID (with or without hyphens)'
  );
}

/**
 * Validates if a string is a valid Notion API key format
 * @param apiKey - The API key to validate
 * @returns true if valid, false otherwise
 */
export function isValidNotionApiKey(apiKey: string): boolean {
  return typeof apiKey === 'string' && apiKey.startsWith('ntn_') && apiKey.length > 10;
}
