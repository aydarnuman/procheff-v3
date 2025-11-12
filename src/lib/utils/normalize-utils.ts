/**
 * Unicode normalization and text processing utilities
 * for improved document detection and pattern matching
 */

/**
 * Normalize text by removing diacritics, converting to lowercase,
 * and standardizing whitespace
 * @param s - The string to normalize
 * @returns Normalized string
 */
export const normalizeText = (s: string): string => 
  s.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase()
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

/**
 * Check if any pattern from the array matches the text
 * Uses word boundaries to prevent false positives
 * @param patterns - Array of pattern strings to check
 * @param text - Text to search in
 * @returns true if any pattern matches
 */
export const hasPattern = (patterns: string[], text: string): boolean =>
  patterns.some(w => new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i').test(text));

/**
 * Check if any regex pattern from the array matches the text
 * @param patterns - Array of regex patterns to check
 * @param text - Text to search in
 * @returns true if any pattern matches
 */
export const hasRegexPattern = (patterns: RegExp[], text: string): boolean =>
  patterns.some(pattern => pattern.test(text));

/**
 * Escape special regex characters in a string
 * @param str - String to escape
 * @returns Escaped string safe for regex
 */
export const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extract and normalize filename without extension
 * @param filename - Full filename with extension
 * @returns Normalized filename without extension
 */
export const normalizeFilename = (filename: string): string => {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  // Normalize
  return normalizeText(nameWithoutExt);
};

/**
 * Clean and normalize text for content analysis
 * Removes excessive whitespace and special characters
 * @param text - Text to clean
 * @returns Cleaned text
 */
export const cleanTextForAnalysis = (text: string): string => {
  return text
    .replace(/[\r\n]+/g, " ") // Replace line breaks with spaces
    .replace(/[^\w\s\u0080-\uFFFF.,;:!?()-]/g, " ") // Keep letters, numbers, punctuation, and unicode
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
};

/**
 * Extract first N characters of text for header analysis
 * @param text - Full text
 * @param length - Number of characters to extract (default: 1500)
 * @returns First N characters of text
 */
export const extractHeader = (text: string, length: number = 1500): string => {
  return text.slice(0, length);
};

/**
 * Count occurrences of a pattern in text
 * @param pattern - Pattern to search for
 * @param text - Text to search in
 * @returns Number of occurrences
 */
export const countPatternOccurrences = (pattern: string | RegExp, text: string): number => {
  if (typeof pattern === 'string') {
    pattern = new RegExp(escapeRegExp(pattern), 'gi');
  } else {
    // Ensure global flag is set
    pattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  }
  
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
};

/**
 * Find all matches of a pattern with their positions
 * @param pattern - Pattern to search for
 * @param text - Text to search in
 * @returns Array of matches with text and position
 */
export const findPatternMatches = (pattern: RegExp, text: string): Array<{ text: string; index: number }> => {
  const matches: Array<{ text: string; index: number }> = [];
  let match;
  
  // Ensure global flag is set
  const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  
  while ((match = globalPattern.exec(text)) !== null) {
    matches.push({
      text: match[0],
      index: match.index
    });
  }
  
  return matches;
};

/**
 * Check if text contains Turkish characters
 * @param text - Text to check
 * @returns true if text contains Turkish-specific characters
 */
export const containsTurkishChars = (text: string): boolean => {
  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
  return turkishChars.test(text);
};

/**
 * Normalize Turkish-specific characters for better matching
 * @param text - Text to normalize
 * @returns Text with Turkish characters normalized
 */
export const normalizeTurkish = (text: string): string => {
  const charMap: { [key: string]: string } = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };
  
  return text.replace(/[çğıöşüÇĞİÖŞÜ]/g, char => charMap[char] || char);
};
